import React, { useState, useEffect } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, GitBranch } from 'lucide-react';
import { layoutApi, inputApi } from '../../api/layoutApi';
import './ZStageDashboard.css';

// ── Constants (mirror LayoutPreparation) ──────────────────────────────────────
const GRID = 40;
const CANVAS_SIZE = 5000;

const boxWidth = (stationCount) => Math.max(5, stationCount) * GRID;

// ── Parse API layout into flat state ─────────────────────────────────────────
function parseLayout(apiLayout) {
  const boxes = apiLayout.station_boxes.map((b) => ({
    id: `db-box-${b.id}`,
    name: b.name,
    stationIds: b.station_ids
      ? (typeof b.station_ids === 'string' ? b.station_ids.split(',') : b.station_ids)
      : [],
    position: { x: b.position_x, y: b.position_y },
  }));

  const bypassIcons = apiLayout.bypass_icons.map((ic) => ({
    id: `db-bypass-${ic.id}`,
    position: { x: ic.position_x, y: ic.position_y },
  }));

  const connections = apiLayout.connections.map((c) => ({
    id: `db-conn-${c.id}`,
    fromId: `db-box-${c.from_box_id}`,
    toId: `db-box-${c.to_box_id}`,
  }));

  return { boxes, bypassIcons, connections };
}

// ── Compute display data for one station from input records ───────────────────
// Returns { ze: 'Z'|'E'|null, attrs: { P: '2/4', M: '1/3', ... } }
// Rules:
//   Z/E  — show 'E' if any record has z_e='E' & total_incidences>0;
//           else 'Z' if any has z_e='Z' & total_incidences>0; else null
//   Attrs — for each of P,M,D,U: show 'X/Y' where Y=total records with that
//           attribution for this station, X=those with total_incidences>0.
//           Skip entirely if Y=0 (don't show 0/0).
function computeStationData(records, stationId) {
  const sr = records.filter((r) => r.stage_no === stationId);

  const hasE = sr.some((r) => r.z_e === 'E' && (r.total_incidences || 0) > 0);
  const hasZ = sr.some((r) => r.z_e === 'Z' && (r.total_incidences || 0) > 0);
  const ze = hasE ? 'E' : hasZ ? 'Z' : null;

  const attrs = {};
  for (const attr of ['P', 'M', 'D', 'U']) {
    const attrRecs = sr.filter((r) => r.attribution === attr);
    const Y = attrRecs.length;
    if (Y === 0) continue;
    const X = attrRecs.filter((r) => (r.total_incidences || 0) > 0).length;
    attrs[attr] = `${X}/${Y}`;
  }

  return { ze, attrs };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function ZStageDashboard() {
  const [layouts, setLayouts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [bypassIcons, setBypassIcons] = useState([]);
  const [connections, setConnections] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transformState, setTransformState] = useState({ scale: 1, positionX: 0, positionY: 0 });

  // Load layout list + input records on mount
  useEffect(() => {
    layoutApi.getLayouts()
      .then((r) => {
        setLayouts(r.data);
        if (r.data.length > 0) setSelectedId(r.data[0].id);
      })
      .catch(() => setError('Failed to load layouts'));

    inputApi.getRecords()
      .then((r) => setRecords(r.data))
      .catch(() => {});
  }, []);

  // Load layout when selection changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    layoutApi.getLayout(selectedId)
      .then((r) => {
        const state = parseLayout(r.data);
        setBoxes(state.boxes);
        setBypassIcons(state.bypassIcons);
        setConnections(state.connections);
      })
      .catch(() => setError('Failed to load layout'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleRefresh = () => {
    inputApi.getRecords().then((r) => setRecords(r.data)).catch(() => {});
    if (selectedId) {
      layoutApi.getLayout(selectedId)
        .then((r) => {
          const state = parseLayout(r.data);
          setBoxes(state.boxes);
          setBypassIcons(state.bypassIcons);
          setConnections(state.connections);
        })
        .catch(() => {});
    }
  };

  return (
    // Xwrapper must wrap everything so Xarrow SVGs render in screen space
    <Xwrapper>
      <div className="z-dashboard">

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="dash-toolbar">
          <div className="dash-toolbar-left">
            <span className="dash-toolbar-label">Layout:</span>
            <select
              className="dash-layout-select"
              value={selectedId || ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              disabled={layouts.length === 0}
            >
              {layouts.length === 0
                ? <option value="">No layouts saved</option>
                : layouts.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))
              }
            </select>
          </div>
          <div className="dash-toolbar-right">
            <div className="dash-legend">
              <span className="dash-legend-chip dash-legend-chip--z">Z</span>
              <span className="dash-legend-text">Zone Z</span>
              <span className="dash-legend-chip dash-legend-chip--e">E</span>
              <span className="dash-legend-text">Zone E (priority)</span>
              <span className="dash-legend-sep" />
              <span className="dash-legend-text dash-legend-hint">X/Y = active / total incidences per attribution</span>
            </div>
            <button className="dash-refresh-btn" onClick={handleRefresh} title="Refresh data">
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Canvas ───────────────────────────────────────────────────────── */}
        <div
          className="dash-canvas"
          style={{
            backgroundSize: `${GRID * transformState.scale}px ${GRID * transformState.scale}px`,
            backgroundPosition: `${transformState.positionX}px ${transformState.positionY}px`,
          }}
        >
          {loading && <div className="dash-overlay-msg">Loading layout…</div>}
          {error   && <div className="dash-overlay-msg dash-overlay-msg--error">{error}</div>}

          {!loading && !error && (
            <TransformWrapper
              limitToBounds={false}
              minScale={0.15}
              maxScale={3}
              wheel={{ step: 0.08 }}
              onTransformed={(_, state) =>
                setTransformState({ scale: state.scale, positionX: state.positionX, positionY: state.positionY })
              }
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
                  >
                    <div className="dash-virtual-canvas" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>

                      {/* Empty state */}
                      {boxes.length === 0 && bypassIcons.length === 0 && (
                        <div className="dash-empty">
                          <p>No layout data to display.</p>
                          <p>Design a layout in the <strong>Layout</strong> section and upload data in the <strong>Input</strong> section.</p>
                        </div>
                      )}

                      {/* Bypass icons */}
                      {bypassIcons.map((icon) => (
                        <div
                          key={icon.id}
                          id={icon.id}
                          className="dash-bypass"
                          style={{ position: 'absolute', left: icon.position.x, top: icon.position.y }}
                        >
                          <div className="dash-bypass-diamond">
                            <GitBranch size={14} />
                          </div>
                        </div>
                      ))}

                      {/* Station boxes */}
                      {boxes.map((box) => {
                        const w = boxWidth(box.stationIds.length);
                        // Pre-compute data for each station in this box
                        const stationData = {};
                        box.stationIds.forEach((sid) => {
                          stationData[sid] = computeStationData(records, sid);
                        });

                        return (
                          <div
                            key={box.id}
                            id={box.id}
                            className="dash-box"
                            style={{
                              position: 'absolute',
                              left: box.position.x,
                              top: box.position.y,
                              width: w,
                            }}
                          >
                            {/* Header */}
                            <div className="dash-box-header">
                              <span className="dash-box-title">{box.name}</span>
                            </div>

                            {/* Data grid */}
                            <div className="dash-box-body">
                              <table className="dash-grid">
                                <thead>
                                  <tr>
                                    {box.stationIds.map((sid) => (
                                      <th key={sid} colSpan={2} className="dash-grid-th">{sid}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Z / E row */}
                                  <tr>
                                    {box.stationIds.map((sid) => {
                                      const ze = stationData[sid].ze;
                                      return (
                                        <td
                                          key={sid}
                                          colSpan={2}
                                          className={`dash-grid-ze${ze ? ` dash-ze--${ze.toLowerCase()}` : ''}`}
                                        >
                                          {ze || ''}
                                        </td>
                                      );
                                    })}
                                  </tr>

                                  {/* Attribution rows: M, P, D, U */}
                                  {['M', 'P', 'D', 'U'].map((label) => (
                                    <tr key={label}>
                                      {box.stationIds.map((sid) => {
                                        const val = stationData[sid].attrs[label];
                                        return (
                                          <React.Fragment key={sid}>
                                            <td className="dash-grid-label">{label}</td>
                                            <td className={`dash-grid-value${val ? ' dash-grid-value--active' : ''}`}>
                                              {val || ''}
                                            </td>
                                          </React.Fragment>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </TransformComponent>

                  {/* Zoom controls */}
                  <div className="dash-zoom-controls">
                    <button className="dash-zoom-btn" onClick={() => zoomIn()} title="Zoom in"><ZoomIn size={14} /></button>
                    <button className="dash-zoom-btn" onClick={() => zoomOut()} title="Zoom out"><ZoomOut size={14} /></button>
                    <button className="dash-zoom-btn" onClick={() => resetTransform()} title="Reset view"><Maximize2 size={14} /></button>
                  </div>
                </>
              )}
            </TransformWrapper>
          )}
        </div>
      </div>

      {/* Connections rendered outside TransformComponent so Xarrow coordinates
          stay in screen space — identical pattern to LayoutPreparation */}
      {connections.map((conn) => (
        <Xarrow
          key={conn.id}
          start={conn.fromId}
          end={conn.toId}
          color="#1a2744"
          strokeWidth={2}
          path="smooth"
          headSize={6}
          zIndex={100}
        />
      ))}
    </Xwrapper>
  );
}

export default ZStageDashboard;
