import React, { useState, useEffect, useRef, useCallback } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, GitBranch, X, Loader } from 'lucide-react';
import { layoutApi, inputApi } from '../../api/layoutApi';
import './ZStageDashboard.css';

// ── Constants (mirror LayoutPreparation) ──────────────────────────────────────
const GRID = 40;
const CANVAS_SIZE = 5000;

const boxWidth = (stationCount) => Math.max(5, stationCount) * GRID;

// ── Column definitions (mirror InputData) ─────────────────────────────────────
const MONTHLY_KEYS = [
  '2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
  '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12',
  '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
  '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
  '2026-01','2026-02','2026-03',
];

const FIXED_COLS = [
  { key: 'sr_no',           label: 'Sr.No',          width: 60,  type: 'number' },
  { key: 'concern_id',      label: 'Concern ID',      width: 130, type: 'text'   },
  { key: 'concern',         label: 'Concern',         width: 260, type: 'text'   },
  { key: 'type',            label: 'Type',            width: 70,  type: 'text'   },
  { key: 'root_cause',      label: 'Root Cause',      width: 220, type: 'text'   },
  { key: 'action_plan',     label: 'Action Plan',     width: 220, type: 'text'   },
  { key: 'target_date',     label: 'Target Date',     width: 110, type: 'text'   },
  { key: 'closure_date',    label: 'Closure Date',    width: 110, type: 'text'   },
  { key: 'ryg',             label: 'RYG',             width: 60,  type: 'text'   },
  { key: 'attri',           label: 'Attri.',          width: 90,  type: 'text'   },
  { key: 'comm',            label: 'Comm',            width: 160, type: 'text'   },
  { key: 'line',            label: 'Line',            width: 120, type: 'text'   },
  { key: 'stage_no',        label: 'Stage No',        width: 90,  type: 'text'   },
  { key: 'z_e',             label: 'Z/E',             width: 55,  type: 'text'   },
  { key: 'attribution',     label: 'Attribution',     width: 90,  type: 'text'   },
  { key: 'part',            label: 'Part',            width: 160, type: 'text'   },
  { key: 'phenomena',       label: 'Phenomena',       width: 160, type: 'text'   },
  { key: 'total_incidences', label: 'Total',          width: 70,  type: 'number' },
];

const TRAILING_COLS = [
  { key: 'field_defect_after_cutoff', label: 'Field Defect After Cut-off', width: 130, type: 'number' },
  { key: 'status_3m',                 label: 'Status (3M)',                 width: 90,  type: 'text'   },
];

const LONG_TEXT = new Set(['concern', 'root_cause', 'action_plan', 'comm']);

function fmtMonth(key) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('default', { month: 'short' }) + ' ' + year.slice(2);
}

// ── Inline editable cell ───────────────────────────────────────────────────────
function EditableCell({ recordId, fieldKey, value, type, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value ?? '');
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = useCallback(async () => {
    setEditing(false);
    const trimmed  = draft.trim();
    const original = String(value ?? '');
    if (trimmed === original) return;
    setSaving(true);
    try {
      const payload = {
        [fieldKey]: type === 'number'
          ? (trimmed === '' ? null : Number(trimmed))
          : (trimmed || null),
      };
      const res = await inputApi.updateRecord(recordId, payload);
      onSaved(recordId, res.data);
    } catch {
      setDraft(value ?? '');
    } finally {
      setSaving(false);
    }
  }, [draft, value, fieldKey, type, recordId, onSaved]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
  };

  if (saving) return <td className="sdm-cell-saving"><Loader size={12} className="sdm-spin" /></td>;

  if (editing) {
    return (
      <td className="sdm-cell-editing">
        {LONG_TEXT.has(fieldKey) ? (
          <textarea
            ref={inputRef} value={draft} rows={3}
            className="sdm-cell-textarea"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); } }}
          />
        ) : (
          <input
            ref={inputRef} value={draft}
            type={type === 'number' ? 'number' : 'text'}
            className="sdm-cell-input"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
        )}
      </td>
    );
  }

  const display = value ?? '';
  return (
    <td className="sdm-cell-view" onClick={() => setEditing(true)} title="Click to edit">
      {display === '' || display === null
        ? <span className="sdm-cell-empty">—</span>
        : <span>{String(display)}</span>}
    </td>
  );
}

// ── Inline editable monthly cell ──────────────────────────────────────────────
function MonthlyCell({ recordId, monthKey, monthlyData, onSaved }) {
  const parsed = React.useMemo(() => {
    try { return JSON.parse(monthlyData || '{}'); } catch { return {}; }
  }, [monthlyData]);
  const value = parsed[monthKey] ?? null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value !== null ? String(value) : '');
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value !== null ? String(value) : ''); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = useCallback(async () => {
    setEditing(false);
    const newVal = draft.trim() === '' ? null : Number(draft.trim());
    if (newVal === value) return;
    setSaving(true);
    try {
      const newParsed = { ...parsed };
      if (newVal === null) { delete newParsed[monthKey]; } else { newParsed[monthKey] = newVal; }
      const newTotal = Object.values(newParsed).reduce((s, v) => s + v, 0);
      const res = await inputApi.updateRecord(recordId, {
        monthly_data: JSON.stringify(newParsed),
        total_incidences: newTotal,
      });
      onSaved(recordId, res.data);
    } catch {
      setDraft(value !== null ? String(value) : '');
    } finally {
      setSaving(false);
    }
  }, [draft, value, parsed, monthKey, recordId, onSaved]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') { setDraft(value !== null ? String(value) : ''); setEditing(false); }
  };

  if (saving) return <td className="sdm-cell-saving sdm-monthly"><Loader size={12} className="sdm-spin" /></td>;

  if (editing) {
    return (
      <td className="sdm-cell-editing sdm-monthly">
        <input ref={inputRef} type="number" value={draft}
          className="sdm-cell-input"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={onKeyDown}
        />
      </td>
    );
  }

  return (
    <td
      className={`sdm-cell-view sdm-monthly${value !== null ? ' sdm-monthly--has' : ''}`}
      onClick={() => setEditing(true)} title="Click to edit"
    >
      {value !== null ? value : ''}
    </td>
  );
}

// ── Station Detail Modal ───────────────────────────────────────────────────────
function StationDetailModal({ stationId, records, allMonths, onSaved, onClose }) {
  const filtered = records.filter((r) => r.stage_no === stationId);

  return (
    <div className="sdm-overlay" onClick={onClose}>
      <div className="sdm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sdm-header">
          <div className="sdm-header-left">
            <span className="sdm-title">Station: {stationId}</span>
            <span className="sdm-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <button className="sdm-close" onClick={onClose} title="Close"><X size={16} /></button>
        </div>

        {/* Table */}
        <div className="sdm-body">
          {filtered.length === 0 ? (
            <div className="sdm-empty">No input records found for station <strong>{stationId}</strong>.</div>
          ) : (
            <div className="sdm-table-wrap">
              <table className="sdm-table">
                <thead>
                  <tr>
                    {FIXED_COLS.map((col) => (
                      <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
                    ))}
                    {allMonths.map((key) => (
                      <th key={key} className="sdm-month-th">{fmtMonth(key)}</th>
                    ))}
                    {TRAILING_COLS.map((col) => (
                      <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec) => (
                    <tr key={rec.id}>
                      {FIXED_COLS.map((col) => (
                        <EditableCell
                          key={col.key}
                          recordId={rec.id}
                          fieldKey={col.key}
                          value={rec[col.key]}
                          type={col.type}
                          onSaved={onSaved}
                        />
                      ))}
                      {allMonths.map((key) => (
                        <MonthlyCell
                          key={key}
                          recordId={rec.id}
                          monthKey={key}
                          monthlyData={rec.monthly_data}
                          onSaved={onSaved}
                        />
                      ))}
                      {TRAILING_COLS.map((col) => (
                        <EditableCell
                          key={col.key}
                          recordId={rec.id}
                          fieldKey={col.key}
                          value={rec[col.key]}
                          type={col.type}
                          onSaved={onSaved}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

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

// ── Compute display data for one station ──────────────────────────────────────
// Z/E: 'E' wins over 'Z'; only shown when total_incidences > 0
// Attrs P/M/D/U: 'X/Y' — X active (total_incidences>0), Y total; omit if Y=0
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
  const [layouts, setLayouts]         = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [boxes, setBoxes]             = useState([]);
  const [bypassIcons, setBypassIcons] = useState([]);
  const [connections, setConnections] = useState([]);
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [transformState, setTransformState] = useState({ scale: 1, positionX: 0, positionY: 0 });

  // Station detail popup
  const [popupStation, setPopupStation] = useState(null); // stationId string | null

  // Derive all months present in loaded records (same logic as InputData)
  const allMonths = React.useMemo(() => {
    const set = new Set(MONTHLY_KEYS);
    records.forEach((rec) => {
      if (rec.monthly_data) {
        try { Object.keys(JSON.parse(rec.monthly_data)).forEach((k) => set.add(k)); } catch {}
      }
    });
    return Array.from(set).sort();
  }, [records]);

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

  // When a record is saved in the popup, update records state so dashboard re-renders
  const handleRecordSaved = useCallback((recordId, updatedRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === recordId ? updatedRecord : r)));
  }, []);

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
              <span className="dash-legend-text dash-legend-hint">X/Y = active / total incidences · Click station header to view records</span>
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
                                      <th
                                        key={sid}
                                        colSpan={2}
                                        className="dash-grid-th dash-grid-th--clickable"
                                        title={`Click to view records for ${sid}`}
                                        onClick={() => setPopupStation(sid)}
                                      >
                                        {sid}
                                      </th>
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

      {/* Station detail popup — rendered outside canvas so it's not clipped */}
      {popupStation && (
        <StationDetailModal
          stationId={popupStation}
          records={records}
          allMonths={allMonths}
          onSaved={handleRecordSaved}
          onClose={() => setPopupStation(null)}
        />
      )}
    </Xwrapper>
  );
}

export default ZStageDashboard;
