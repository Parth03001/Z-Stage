import React, { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import './AddBoxModal.css';

const LABELS = ['Z', 'M', 'P', 'D', 'U'];

function buildAutoIds(prefix, count) {
  const p = prefix.trim().toUpperCase();
  return Array.from({ length: count }, (_, i) => `${p}-${String(i + 1).padStart(2, '0')}`);
}

const DEFAULT_FORM = { name: '', prefix: '', stationCount: 5 };

// stationData shape: { [stationId]: { Z: '', M: '', P: '', D: '', U: '' } }
function emptyRow() {
  return Object.fromEntries(LABELS.map((l) => [l, '']));
}

function AddBoxModal({ onAdd, onClose }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mode, setMode] = useState('auto'); // 'auto' | 'custom'
  const [customText, setCustomText] = useState('');
  const [errors, setErrors] = useState({});
  const [stationData, setStationData] = useState({}); // { stationId: { Z, M, P, D, U } }

  const autoIds = useMemo(() => {
    if (!form.prefix.trim() || form.stationCount < 1) return [];
    return buildAutoIds(form.prefix, Number(form.stationCount));
  }, [form.prefix, form.stationCount]);

  const handleModeSwitch = (newMode) => {
    if (newMode === 'custom' && mode === 'auto') {
      setCustomText(autoIds.join('\n'));
    }
    setMode(newMode);
    setErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'stationCount' ? parseInt(value, 10) || '' : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const parsedCustomIds = useMemo(
    () =>
      customText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [customText],
  );

  const previewIds = mode === 'auto' ? autoIds : parsedCustomIds;

  // Sync stationData keys when station IDs change — preserve existing values
  useEffect(() => {
    setStationData((prev) => {
      const next = {};
      previewIds.forEach((sid) => {
        next[sid] = prev[sid] ?? emptyRow();
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewIds.join(',')]);

  const handleCellChange = (sid, label, value) => {
    setStationData((prev) => ({
      ...prev,
      [sid]: { ...prev[sid], [label]: value },
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Station / line name is required';
    if (mode === 'auto') {
      if (!form.prefix.trim()) errs.prefix = 'Prefix is required';
      if (!form.stationCount || form.stationCount < 1) errs.stationCount = 'At least 1 station required';
      if (form.stationCount > 60) errs.stationCount = 'Maximum 60 stations';
    } else {
      if (parsedCustomIds.length === 0) errs.customIds = 'Enter at least one station ID';
      if (parsedCustomIds.length > 60) errs.customIds = 'Maximum 60 stations';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const stationIds = mode === 'auto' ? autoIds : parsedCustomIds;
    onAdd({ name: form.name.trim(), stationIds, stationData });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Station Box</h2>
          <button className="modal-close-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="modal-field">
            <label className="modal-label">Station / Line Name</label>
            <input
              className={`modal-input${errors.name ? ' modal-input--error' : ''}`}
              type="text"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. TRIM 1"
              autoFocus
            />
            {errors.name && <span className="modal-error">{errors.name}</span>}
          </div>

          {/* Mode toggle */}
          <div className="modal-mode-toggle">
            <button
              type="button"
              className={`modal-mode-btn${mode === 'auto' ? ' modal-mode-btn--active' : ''}`}
              onClick={() => handleModeSwitch('auto')}
            >
              Auto IDs
            </button>
            <button
              type="button"
              className={`modal-mode-btn${mode === 'custom' ? ' modal-mode-btn--active' : ''}`}
              onClick={() => handleModeSwitch('custom')}
            >
              Custom IDs
            </button>
          </div>

          {/* Auto mode */}
          {mode === 'auto' && (
            <>
              <div className="modal-field">
                <label className="modal-label">Station ID Prefix</label>
                <input
                  className={`modal-input${errors.prefix ? ' modal-input--error' : ''}`}
                  type="text"
                  name="prefix"
                  value={form.prefix}
                  onChange={handleFormChange}
                  placeholder="e.g. T1  →  T1-01, T1-02 …"
                  maxLength={10}
                />
                {errors.prefix && <span className="modal-error">{errors.prefix}</span>}
              </div>

              <div className="modal-field">
                <label className="modal-label">Number of Stations</label>
                <input
                  className={`modal-input${errors.stationCount ? ' modal-input--error' : ''}`}
                  type="number"
                  name="stationCount"
                  value={form.stationCount}
                  onChange={handleFormChange}
                  min={1}
                  max={60}
                />
                {errors.stationCount && <span className="modal-error">{errors.stationCount}</span>}
              </div>
            </>
          )}

          {/* Custom mode */}
          {mode === 'custom' && (
            <div className="modal-field">
              <label className="modal-label">
                Station IDs
                <span className="modal-label-hint"> — one per line or comma-separated</span>
              </label>
              <textarea
                className={`modal-textarea${errors.customIds ? ' modal-input--error' : ''}`}
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  if (errors.customIds) setErrors((p) => ({ ...p, customIds: undefined }));
                }}
                placeholder={"T1-01\nT1-02\nT1-03\n…  or  T1-01, T1-02, T1-03"}
                rows={6}
                spellCheck={false}
              />
              {errors.customIds && <span className="modal-error">{errors.customIds}</span>}
            </div>
          )}

          {/* Station data table — Z, M, P, D, U per station */}
          {previewIds.length > 0 && (
            <div className="modal-field">
              <label className="modal-label">
                Station Values
                <span className="modal-label-hint"> — Z / M / P / D / U per station (optional)</span>
              </label>
              <div className="modal-station-table-wrap">
                <table className="modal-station-table">
                  <thead>
                    <tr>
                      <th className="modal-st-head modal-st-head--id">Station</th>
                      {LABELS.map((l) => (
                        <th key={l} className="modal-st-head">{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewIds.map((sid) => (
                      <tr key={sid}>
                        <td className="modal-st-id">{sid}</td>
                        {LABELS.map((l) => (
                          <td key={l} className="modal-st-cell">
                            <input
                              className="modal-st-input"
                              type="text"
                              value={stationData[sid]?.[l] ?? ''}
                              onChange={(e) => handleCellChange(sid, l, e.target.value)}
                              maxLength={20}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn--cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn modal-btn--add">Add Box</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBoxModal;
