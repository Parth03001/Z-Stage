import React, { useState, useCallback, useEffect, useRef } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Pencil, LayoutGrid, Trash2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import StationBox from './StationBox/StationBox';
import BypassIcon from './BypassIcon/BypassIcon';
import AddBoxModal from './AddBoxModal/AddBoxModal';
import { layoutApi } from '../../api/layoutApi';
import './LayoutPreparation.css';

let nextId = 1;
const uid = () => `loc-${nextId++}`;

// ── Grid constants ────────────────────────────────────────────────────────────
const GRID = 40;
const MIN_GAP = GRID;
const CANVAS_SIZE = 5000;

const boxSize = (stationCount) => ({
  w: Math.max(200, stationCount * 52),
  h: 142,
});

const snap = (v) => Math.round(v / GRID) * GRID;

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

const findValidPos = (box, rawPos, others) => {
  const origin = { x: Math.max(0, snap(rawPos.x)), y: Math.max(0, snap(rawPos.y)) };

  for (let radius = 0; radius <= 30; radius++) {
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
  return origin;
};

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

  // ── Drag-to-connect state ────────────────────────────────────────────────────
  // dragging: { fromId, x1, y1 } — set once when drag starts; null when not dragging
  // dragPos:  { x2, y2 }         — updated every mousemove during drag
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState({ x2: 0, y2: 0 });
  const canvasRef = useRef(null);

  // Attach window-level mousemove / mouseup only while a connection is being dragged
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDragPos({ x2: e.clientX - rect.left, y2: e.clientY - rect.top });
    };

    const onUp = (e) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const target = elements.find(
        (el) =>
          (el.classList.contains('station-box') ||
            el.classList.contains('bypass-icon-wrapper')) &&
          el.id !== dragging.fromId,
      );
      if (target?.id) {
        setConnections((prev) => {
          const dup = prev.some(
            (c) => c.fromId === dragging.fromId && c.toId === target.id,
          );
          if (dup) return prev;
          return [...prev, { id: uid(), fromId: dragging.fromId, toId: target.id }];
        });
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging?.fromId]);

  // Called by StationBox / BypassIcon when user mousedowns on a connection port
  const handlePortMouseDown = useCallback((fromId, clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setDragging({ fromId, x1: x, y1: y });
    setDragPos({ x2: x, y2: y });
  }, []);

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
        position: { x: 0, y: 0 },
      };
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
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
  }, []);

  // ── Delete connection ────────────────────────────────────────────────────────
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

  // Expose handleSave and handleLoad to parent
  useEffect(() => {
    if (onSaveLayout) onSaveLayout(handleSave);
  }, [handleSave, onSaveLayout]);

  useEffect(() => {
    if (onLoadLayout) onLoadLayout(handleLoad);
  }, [handleLoad, onLoadLayout]);

  return (
    <div className="layout-prep">
      {/* Toolbar */}
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
          <span className="layout-connect-hint">Drag from a port dot to connect</span>
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
        <span className="layout-stat layout-stat--hint">Scroll to zoom · Drag canvas to pan</span>
      </div>

      {/* Canvas */}
      <div className="layout-canvas" ref={canvasRef}>
        <TransformWrapper
          limitToBounds={false}
          minScale={0.15}
          maxScale={3}
          wheel={{ step: 0.08 }}
          panning={{ excluded: ['station-box-header', 'bypass-drag-handle', 'station-port', 'bypass-port'] }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
              >
                <div
                  className="layout-virtual-canvas"
                  style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
                >
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
                        onPortMouseDown={handlePortMouseDown}
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
                        onPortMouseDown={handlePortMouseDown}
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
              </TransformComponent>

              {/* Zoom controls */}
              <div className="canvas-zoom-controls">
                <button className="canvas-zoom-btn" onClick={() => zoomIn()} title="Zoom in">
                  <ZoomIn size={14} />
                </button>
                <button className="canvas-zoom-btn" onClick={() => zoomOut()} title="Zoom out">
                  <ZoomOut size={14} />
                </button>
                <button className="canvas-zoom-btn" onClick={() => resetTransform()} title="Reset view">
                  <Maximize2 size={14} />
                </button>
              </div>
            </>
          )}
        </TransformWrapper>

        {/* Drag-to-connect temporary line (screen-space overlay, outside transform) */}
        {dragging && (
          <svg className="layout-drag-svg">
            <defs>
              <marker id="drag-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3182ce" />
              </marker>
            </defs>
            <line
              x1={dragging.x1}
              y1={dragging.y1}
              x2={dragPos.x2}
              y2={dragPos.y2}
              stroke="#3182ce"
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#drag-arrow)"
            />
          </svg>
        )}
      </div>

      {showAddBoxModal && (
        <AddBoxModal onAdd={handleAddBox} onClose={onCloseAddBoxModal} />
      )}
    </div>
  );
}

export default LayoutPreparation;
