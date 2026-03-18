import React, { useState } from 'react';
import './AddBoxModal.css';

const DEFAULT_FORM = {
  name: '',
  prefix: '',
  stationCount: 5,
};

function AddBoxModal({ onAdd, onClose }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Station name is required';
    if (!form.prefix.trim()) errs.prefix = 'Prefix is required';
    if (!form.stationCount || form.stationCount < 1) errs.stationCount = 'At least 1 station required';
    if (form.stationCount > 30) errs.stationCount = 'Maximum 30 stations';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'stationCount' ? parseInt(value, 10) || '' : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onAdd({
      name: form.name.trim(),
      prefix: form.prefix.trim().toUpperCase(),
      stationCount: Number(form.stationCount),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Station Box</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="modal-label">Station / Line Name</label>
            <input
              className={`modal-input${errors.name ? ' modal-input--error' : ''}`}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. TRIM 1"
              autoFocus
            />
            {errors.name && <span className="modal-error">{errors.name}</span>}
          </div>

          <div className="modal-field">
            <label className="modal-label">Station ID Prefix</label>
            <input
              className={`modal-input${errors.prefix ? ' modal-input--error' : ''}`}
              type="text"
              name="prefix"
              value={form.prefix}
              onChange={handleChange}
              placeholder="e.g. T1 (generates T1-01, T1-02...)"
              maxLength={6}
            />
            {errors.prefix && <span className="modal-error">{errors.prefix}</span>}
            {form.prefix && form.stationCount >= 1 && (
              <span className="modal-hint">
                Will generate: {form.prefix.toUpperCase()}-01 … {form.prefix.toUpperCase()}-{String(form.stationCount).padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="modal-field">
            <label className="modal-label">Number of Stations</label>
            <input
              className={`modal-input${errors.stationCount ? ' modal-input--error' : ''}`}
              type="number"
              name="stationCount"
              value={form.stationCount}
              onChange={handleChange}
              min={1}
              max={30}
            />
            {errors.stationCount && <span className="modal-error">{errors.stationCount}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn modal-btn--add">
              Add Box
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBoxModal;
