import React, { useState, useCallback } from 'react';
import StationBox from './StationBox/StationBox';
import BypassIcon from './BypassIcon/BypassIcon';
import AddBoxModal from './AddBoxModal/AddBoxModal';
import './LayoutPreparation.css';

let nextId = 1;

function LayoutPreparation() {
  const [boxes, setBoxes] = useState([]);
  const [bypassIcons, setBypassIcons] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [layoutName, setLayoutName] = useState('New Layout');
  const [editingName, setEditingName] = useState(false);

  const handleAddBox = useCallback((boxData) => {
    const id = `box-${nextId++}`;
    const offset = boxes.length * 20;
    setBoxes((prev) => [
      ...prev,
      {
        ...boxData,
        id,
        position: { x: 60 + offset, y: 60 + offset },
      },
    ]);
  }, [boxes.length]);

  const handleAddBypass = useCallback(() => {
    const id = `bypass-${nextId++}`;
    const offset = bypassIcons.length * 20;
    setBypassIcons((prev) => [
      ...prev,
      { id, position: { x: 40 + offset, y: 40 + offset } },
    ]);
  }, [bypassIcons.length]);

  const handleBoxPositionChange = useCallback((id, pos) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, position: pos } : b))
    );
  }, []);

  const handleBypassPositionChange = useCallback((id, pos) => {
    setBypassIcons((prev) =>
      prev.map((b) => (b.id === id ? { ...b, position: pos } : b))
    );
  }, []);

  const handleDeleteBox = useCallback((id) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleDeleteBypass = useCallback((id) => {
    setBypassIcons((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleClearAll = () => {
    if (window.confirm('Clear all boxes and bypass icons?')) {
      setBoxes([]);
      setBypassIcons([]);
    }
  };

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
              <span className="layout-name-edit-icon">✏️</span>
            </h2>
          )}
        </div>

        <div className="layout-toolbar-right">
          <button className="toolbar-btn toolbar-btn--bypass" onClick={handleAddBypass}>
            <span className="toolbar-btn-diamond">◆</span>
            Add Bypass Icon
          </button>
          <button className="toolbar-btn toolbar-btn--add" onClick={() => setShowAddModal(true)}>
            + Add Box
          </button>
          <button className="toolbar-btn toolbar-btn--clear" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="layout-stats">
        <span className="layout-stat">
          <strong>{boxes.length}</strong> Station Boxes
        </span>
        <span className="layout-stat">
          <strong>{bypassIcons.length}</strong> Bypass Icons
        </span>
        <span className="layout-stat layout-stat--hint">
          Drag boxes to arrange layout
        </span>
      </div>

      {/* Canvas */}
      <div className="layout-canvas">
        {boxes.length === 0 && bypassIcons.length === 0 && (
          <div className="layout-canvas-empty">
            <div className="layout-canvas-empty-icon">⬛</div>
            <p>No station boxes yet.</p>
            <p>Click <strong>+ Add Box</strong> to start building the layout.</p>
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
          />
        ))}
      </div>

      {showAddModal && (
        <AddBoxModal onAdd={handleAddBox} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default LayoutPreparation;
