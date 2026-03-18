import React, { useState } from 'react';
import Draggable from 'react-draggable';
import './BypassIcon.css';

function BypassIcon({ id, position, onPositionChange, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragStop = (e, data) => {
    if (onPositionChange) {
      onPositionChange(id, { x: data.x, y: data.y });
    }
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <Draggable
      defaultPosition={position || { x: 0, y: 0 }}
      onStop={handleDragStop}
      handle=".bypass-drag-handle"
    >
      <div className="bypass-icon-wrapper">
        <div className="bypass-drag-handle bypass-diamond" onClick={toggleExpand} title="Bypass / Connect">
          <span className="bypass-diamond-inner">B</span>
        </div>

        {isExpanded && (
          <div className="bypass-accordion">
            <div className="bypass-accordion-header">
              <span>Bypass Connection</span>
              <button className="bypass-close-btn" onClick={toggleExpand}>✕</button>
            </div>
            <div className="bypass-accordion-body">
              <div className="bypass-connection-row">
                <span className="bypass-dot bypass-dot--in"></span>
                <span className="bypass-connection-label">In</span>
              </div>
              <div className="bypass-connection-row">
                <span className="bypass-dot bypass-dot--out"></span>
                <span className="bypass-connection-label">Out</span>
              </div>
              <div className="bypass-connection-row">
                <span className="bypass-dot bypass-dot--bypass"></span>
                <span className="bypass-connection-label">Bypass</span>
              </div>
            </div>
            {onDelete && (
              <button className="bypass-delete-btn" onClick={() => onDelete(id)}>
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </Draggable>
  );
}

export default BypassIcon;
