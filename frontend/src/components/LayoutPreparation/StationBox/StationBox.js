import React, { useState } from 'react';
import Draggable from 'react-draggable';
import './StationBox.css';

function buildStationIds(prefix, count) {
  const ids = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`${prefix}-${String(i).padStart(2, '0')}`);
  }
  return ids;
}

function StationBox({ id, name, prefix, stationCount, position, onPositionChange, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const stationIds = buildStationIds(prefix, stationCount);

  const handleDragStop = (e, data) => {
    if (onPositionChange) {
      onPositionChange(id, { x: data.x, y: data.y });
    }
  };

  return (
    <Draggable
      defaultPosition={position || { x: 0, y: 0 }}
      onStop={handleDragStop}
      handle=".station-box-header"
      bounds="parent"
    >
      <div className={`station-box${collapsed ? ' station-box--collapsed' : ''}`}>
        <div className="station-box-header">
          <span className="station-box-title">{name}</span>
          <div className="station-box-controls">
            <button
              className="station-box-ctrl-btn"
              title={collapsed ? 'Expand' : 'Collapse'}
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? '▼' : '▲'}
            </button>
            {onDelete && (
              <button
                className="station-box-ctrl-btn station-box-ctrl-btn--delete"
                title="Delete"
                onClick={() => onDelete(id)}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="station-box-body">
            <div className="station-grid">
              {/* Station ID header row */}
              <div className="station-grid-header-row">
                {stationIds.map((sid) => (
                  <div key={sid} className="station-grid-header-cell">
                    {sid}
                  </div>
                ))}
              </div>

              {/* Data rows — 3 empty rows for data */}
              {[0, 1, 2].map((rowIdx) => (
                <div key={rowIdx} className="station-grid-data-row">
                  {stationIds.map((sid) => (
                    <div key={sid} className="station-grid-data-cell"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}

export default StationBox;
