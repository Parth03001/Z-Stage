import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { useXarrow } from 'react-xarrows';
import './StationBox.css';

function buildStationIds(prefix, count) {
  const ids = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`${prefix}-${String(i).padStart(2, '0')}`);
  }
  return ids;
}

function StationBox({
  id,
  name,
  prefix,
  stationCount,
  position,
  onPositionChange,
  onDelete,
  connectMode,
  isSelected,
  onBoxClick,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const nodeRef = useRef(null);
  const updateXarrow = useXarrow();
  const stationIds = buildStationIds(prefix, stationCount);

  const handleDragStop = (e, data) => {
    updateXarrow();
    if (onPositionChange) onPositionChange(id, { x: data.x, y: data.y });
  };

  const handleClick = () => {
    if (connectMode && onBoxClick) onBoxClick(id);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={position || { x: 0, y: 0 }}
      onDrag={updateXarrow}
      onStop={handleDragStop}
      handle=".station-box-header"
      bounds="parent"
      disabled={connectMode}
    >
      <div
        ref={nodeRef}
        id={id}
        className={[
          'station-box',
          collapsed ? 'station-box--collapsed' : '',
          connectMode ? 'station-box--connect-mode' : '',
          isSelected ? 'station-box--selected' : '',
        ].join(' ').trim()}
        onClick={handleClick}
      >
        <div className="station-box-header">
          <span className="station-box-title">{name}</span>
          {!connectMode && (
            <div className="station-box-controls">
              <button
                className="station-box-ctrl-btn"
                title={collapsed ? 'Expand' : 'Collapse'}
                onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
              >
                {collapsed ? '▼' : '▲'}
              </button>
              {onDelete && (
                <button
                  className="station-box-ctrl-btn station-box-ctrl-btn--delete"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="station-box-body">
            <div className="station-grid">
              <div className="station-grid-header-row">
                {stationIds.map((sid) => (
                  <div key={sid} className="station-grid-header-cell">{sid}</div>
                ))}
              </div>
              {[0, 1, 2].map((rowIdx) => (
                <div key={rowIdx} className="station-grid-data-row">
                  {stationIds.map((sid) => (
                    <div key={sid} className="station-grid-data-cell" />
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
