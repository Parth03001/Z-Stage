import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { useXarrow } from 'react-xarrows';
import { GitBranch, X, Trash2 } from 'lucide-react';
import './BypassIcon.css';

function BypassIcon({ id, position, onPositionChange, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const nodeRef = useRef(null);
  const updateXarrow = useXarrow();

  const handleDragStop = (e, data) => {
    updateXarrow();
    if (onPositionChange) onPositionChange(id, { x: data.x, y: data.y });
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={position || { x: 0, y: 0 }}
      onDrag={updateXarrow}
      onStop={handleDragStop}
      handle=".bypass-drag-handle"
    >
      <div ref={nodeRef} id={id} className="bypass-icon-wrapper">
        <div className="bypass-drag-handle bypass-diamond" onClick={toggleExpand} title="Bypass / Connect">
          <span className="bypass-diamond-inner"><GitBranch size={14} /></span>
        </div>

        {isExpanded && (
          <div className="bypass-accordion">
            <div className="bypass-accordion-header">
              <span>Bypass Connection</span>
              <button className="bypass-close-btn" onClick={toggleExpand}><X size={12} /></button>
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
                <Trash2 size={12} />
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
