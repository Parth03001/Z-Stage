import React, { useState, useCallback, useEffect } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { Pencil, LayoutGrid, Trash2 } from 'lucide-react';
import StationBox from './StationBox/StationBox';
import BypassIcon from './BypassIcon/BypassIcon';
import AddBoxModal from './AddBoxModal/AddBoxModal';
import { layoutApi } from '../../api/layoutApi';
import './LayoutPreparation.css';

let nextId = 1;
const uid = () => `loc-${nextId++}`;

// ── Grid constants ────────────────────────────────────────────────────────────
const GRID = 40;          // canvas background cell size (px)
const MIN_GAP = GRID;     // required clear space between any two boxes

// Estimate rendered box dimensions from station count
const boxSize = (stationCount) => ({
  w: Math.max(200, stationCount * 52),
  h: 142,   // header(30) + id-row(26) + 3 data rows(28*3) + border(2)
});

// Snap a raw pixel value to the nearest grid multiple
const snap = (v) => Math.round(v / GRID) * GRID;

// Returns true when box A and B overlap (including required gap)
const overlaps = (a, b) => {
  const sa = boxSize(a.stationCount);
  const sb = boxSize(b.stationCount);
  return !(
    a.position.x + sa.w + MIN_GAP <= b.position.x ||
    b.position.x + sb.w + MIN_GAP <= a.position.x ||
    a.position.y + sa.h + MIN_GAP <= b.position.y ||
    b.position.y + sb.h + MIN_GAP <= a.position.y
  );
};

// Find the nearest valid snapped position for `box` given `others`.
// Starts from `rawPos`, snaps it, then spirals outward grid-cell by grid-cell
// until a non-overlapping position is found.
const findValidPos = (box, rawPos, others) => {
  const origin = { x: Math.max(0, snap(rawPos.x)), y: Math.max(0, snap(rawPos.y)) };

  for (let radius = 0; radius <= 30; radius++) {
    // Build the perimeter of the square at this radius
    const candidates = [];
    if (radius === 0) {
      candidates.push(origin);
    } else {
      for (let i = -radius; i <= radius; i++) {
        candidates.push(
          { x: origin.x + i * GRID, y: origin.y - radius * GRID },
          { x: origin.x + i * GRID, y: origin.y + radius * GRID },
        );
        if (i !== -radius && i !== radius) {
          candidates.push(
            { x: origin.x - radius * GRID, y: origin.y + i * GRID },
            { x: origin.x + radius * GRID, y: origin.y + i * GRID },
          );
        }
      }
    }

    for (const pos of candidates) {
      if (pos.x < 0 || pos.y < 0) continue;
      const candidate = { ...box, position: pos };
      if (!others.some((o) => overlaps(candidate, o))) return pos;
    }
  }
  return origin; // fallback (shouldn't reach here)
};

/**
 * Build local state from a LayoutOut response (loaded from DB).
 * All IDs are prefixed with "db-" so they never clash with local "loc-" IDs.
 */
function stateFromApi(apiLayout) {
  const boxes = apiLayout.station_boxes.map((b) => ({
    id: `db-box-${b.id}`,
    dbId: b.id,
    name: b.name,
    prefix: b.prefix,
    stationCount: b.station_count,
    position: { x: b.position_x, y: b.position_y },
    orderIndex: b.order_index,
  }));

  const bypassIcons = apiLayout.bypass_icons.map((ic) => ({
    id: `db-bypass-${ic.id}`,
    dbId: ic.id,
    position: { x: ic.position_x, y: ic.position_y },
  }));

  const connections = apiLayout.connections.map((c) => ({
    id: `db-conn-${c.id}`,
    fromId: `db-box-${c.from_box_id}`,
    toId: `db-box-${c.to_box_id}`,
  }));

  return { boxes, bypassIcons, connections };
}

function LayoutPreparation({
  showAddBoxModal,
  onCloseAddBoxModal,
  connectMode,
  onToggleConnect,
  addBypassSignal,
  onSaveLayout,
  onLoadLayout,
}) {
  const [boxes, setBoxes] = useState([]);
  const [bypassIcons, setBypassIcons] = useState([]);
  const [connections, setConnections] = useState([]);
  const [layoutName, setLayoutName] = useState('New Layout');
  const [editingName, setEditingName] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null); // local id of first-clicked box

  // ── Connect mode: cancel on Escape ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && connectMode) {
        setSelectedSource(null);
        onToggleConnect && onToggleConnect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connectMode, onToggleConnect]);

  // Reset selected source when leaving connect mode
  useEffect(() => {
    if (!connectMode) setSelectedSource(null);
  }, [connectMode]);

  // Add bypass icon when parent signals it
  useEffect(() => {
    if (addBypassSignal > 0) handleAddBypass();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBypassSignal]);

  // ── Box actions ─────────────────────────────────────────────────────────────
  const handleAddBox = useCallback((boxData) => {
    const id = uid();
    setBoxes((prev) => {
      const newBox = {
        id,
        dbId: null,
        name: boxData.name,
        prefix: boxData.prefix,
        stationCount: boxData.stationCount,
        orderIndex: prev.length,
        position: { x: 0, y: 0 }, // placeholder; findValidPos fills it
      };
      // Start search from grid origin; findValidPos spirals to avoid conflicts
      const position = findValidPos(newBox, { x: GRID, y: GRID }, prev);
      return [...prev, { ...newBox, position }];
    });
  }, []);

  const handleBoxPositionChange = useCallback((id, rawPos) => {
    setBoxes((prev) => {
      const box = prev.find((b) => b.id === id);
      if (!box) return prev;
      const others = prev.filter((b) => b.id !== id);
      const finalPos = findValidPos(box, rawPos, others);
      return prev.map((b) => (b.id === id ? { ...b, position: finalPos } : b));
    });
  }, []);

  const handleDeleteBox = useCallback((id) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
  }, []);

  // ── Bypass icon actions ─────────────────────────────────────────────────────
  const handleAddBypass = useCallback(() => {
    const id = uid();
    setBypassIcons((prev) => [
      ...prev,
      { id, dbId: null, position: { x: 40 + prev.length * 20, y: 40 + prev.length * 20 } },
    ]);
  }, []);

  const handleBypassPositionChange = useCallback((id, rawPos) => {
    const snapped = { x: Math.max(0, snap(rawPos.x)), y: Math.max(0, snap(rawPos.y)) };
    setBypassIcons((prev) => prev.map((b) => (b.id === id ? { ...b, position: snapped } : b)));
  }, []);

  const handleDeleteBypass = useCallback((id) => {
    setBypassIcons((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Connect boxes ───────────────────────────────────────────────────────────
  const handleBoxClick = useCallback((boxId) => {
    if (!connectMode) return;

    if (!selectedSource) {
      setSelectedSource(boxId);
    } else {
      if (selectedSource === boxId) {
        // clicked same box — cancel
        setSelectedSource(null);
        return;
      }
      // Check duplicate
      const alreadyExists = connections.some(
        (c) => c.fromId === selectedSource && c.toId === boxId
      );
      if (!alreadyExists) {
        setConnections((prev) => [
          ...prev,
          { id: uid(), fromId: selectedSource, toId: boxId },
        ]);
      }
      setSelectedSource(null);
      onToggleConnect && onToggleConnect(); // exit connect mode after connecting
    }
  }, [connectMode, selectedSource, connections, onToggleConnect]);

  const handleDeleteConnection = useCallback((connId) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  }, []);

  // ── Save layout ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const payload = {
      name: layoutName,
      boxes: boxes.map((b) => ({
        local_id: b.id,
        name: b.name,
        prefix: b.prefix,
        station_count: b.stationCount,
        position_x: b.position.x,
        position_y: b.position.y,
        order_index: b.orderIndex,
      })),
      bypass_icons: bypassIcons.map((ic) => ({
        local_id: ic.id,
        position_x: ic.position.x,
        position_y: ic.position.y,
      })),
      connections: connections.map((c) => ({
        from_local_id: c.fromId,
        to_local_id: c.toId,
      })),
    };

    try {
      let response;
      if (currentLayoutId) {
        response = await layoutApi.updateSnapshot(currentLayoutId, payload);
      } else {
        response = await layoutApi.createSnapshot(payload);
      }
      const saved = response.data;
      setCurrentLayoutId(saved.id);
      // Rebuild local state from DB response so all IDs are db-prefixed
      const rebuilt = stateFromApi(saved);
      setBoxes(rebuilt.boxes);
      setBypassIcons(rebuilt.bypassIcons);
      setConnections(rebuilt.connections);
      setLayoutName(saved.name);
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      return false;
    }
  }, [layoutName, boxes, bypassIcons, connections, currentLayoutId]);

  // ── Load layout ─────────────────────────────────────────────────────────────
  const handleLoad = useCallback(async (layoutId) => {
    try {
      const response = await layoutApi.getLayout(layoutId);
      const data = response.data;
      const rebuilt = stateFromApi(data);
      setBoxes(rebuilt.boxes);
      setBypassIcons(rebuilt.bypassIcons);
      setConnections(rebuilt.connections);
      setLayoutName(data.name);
      setCurrentLayoutId(data.id);
    } catch (err) {
      console.error('Load failed:', err);
    }
  }, []);

  // ── Clear all ───────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    if (window.confirm('Clear the canvas? (Saved layouts are not deleted.)')) {
      setBoxes([]);
      setBypassIcons([]);
      setConnections([]);
      setCurrentLayoutId(null);
      setLayoutName('New Layout');
    }
  };

  // Expose handleSave and handleLoad to parent via callbacks
  useEffect(() => {
    if (onSaveLayout) onSaveLayout(handleSave);
  }, [handleSave, onSaveLayout]);

  useEffect(() => {
    if (onLoadLayout) onLoadLayout(handleLoad);
  }, [handleLoad, onLoadLayout]);

  return (
    <div className="layout-prep">
      {/* Toolbar — name + clear only */}
      <div className="layout-toolbar">
        <div className="layout-toolbar-left">
          {editingName ? (
            <input
              className="layout-name-input"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              autoFocus
            />
          ) : (
            <h2 className="layout-name" onClick={() => setEditingName(true)} title="Click to edit">
              {layoutName}
              {currentLayoutId && <span className="layout-saved-badge">Saved</span>}
              <span className="layout-name-edit-icon"><Pencil size={13} /></span>
            </h2>
          )}
        </div>

        <div className="layout-toolbar-right">
          {connectMode && (
            <div className="layout-connect-hint">
              {selectedSource
                ? '→ Now click the target box'
                : '→ Click a source box'}
            </div>
          )}
          <button className="toolbar-btn toolbar-btn--clear" onClick={handleClearAll}>
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="layout-stats">
        <span className="layout-stat"><strong>{boxes.length}</strong> Boxes</span>
        <span className="layout-stat"><strong>{bypassIcons.length}</strong> Bypass Icons</span>
        <span className="layout-stat"><strong>{connections.length}</strong> Connections</span>
        {connectMode && (
          <span className="layout-stat layout-stat--connect-mode">
            Connect mode — press Esc to cancel
          </span>
        )}
      </div>

      {/* Canvas */}
      <div className={`layout-canvas${connectMode ? ' layout-canvas--connect-mode' : ''}`}>
        <Xwrapper>
          {boxes.length === 0 && bypassIcons.length === 0 && (
            <div className="layout-canvas-empty">
              <div className="layout-canvas-empty-icon">
                <LayoutGrid size={52} strokeWidth={1} />
              </div>
              <p>No station boxes yet.</p>
              <p>Use <strong>Add Box</strong> in the left panel to start.</p>
            </div>
          )}

          {bypassIcons.map((icon) => (
            <BypassIcon
              key={icon.id}
              id={icon.id}
              position={icon.position}
              onPositionChange={handleBypassPositionChange}
              onDelete={handleDeleteBypass}
            />
          ))}

          {boxes.map((box) => (
            <StationBox
              key={box.id}
              id={box.id}
              name={box.name}
              prefix={box.prefix}
              stationCount={box.stationCount}
              position={box.position}
              onPositionChange={handleBoxPositionChange}
              onDelete={handleDeleteBox}
              connectMode={connectMode}
              isSelected={selectedSource === box.id}
              onBoxClick={handleBoxClick}
            />
          ))}

          {connections.map((conn) => (
            <Xarrow
              key={conn.id}
              start={conn.fromId}
              end={conn.toId}
              color="#1a2744"
              strokeWidth={2}
              path="smooth"
              headSize={6}
              passProps={{
                onClick: () => handleDeleteConnection(conn.id),
                style: { cursor: 'pointer' },
                title: 'Click to remove connection',
              }}
            />
          ))}
        </Xwrapper>
      </div>

      {showAddBoxModal && (
        <AddBoxModal onAdd={handleAddBox} onClose={onCloseAddBoxModal} />
      )}
    </div>
  );
}

export default LayoutPreparation;
