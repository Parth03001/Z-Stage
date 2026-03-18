import React from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'layout',    label: 'Layout Preparation', icon: '⬛' },
  { id: 'input',     label: 'Input Data',          icon: '📥' },
  { id: 'dashboard', label: 'Z-Stage Dashboard',   icon: '📊' },
];

function Sidebar({ activeSection, onSectionChange, layoutActions }) {
  const {
    onAddBox,
    onAddBypass,
    connectMode,
    onToggleConnect,
    onSaveLayout,
    onLoadLayout,
    savedLayouts = [],
    isSaving,
  } = layoutActions || {};

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Z-Stage</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            <button
              className={`sidebar-nav-item${activeSection === item.id ? ' sidebar-nav-item--active' : ''}`}
              onClick={() => onSectionChange(item.id)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>

            {/* Sub-actions shown only when Layout Preparation is active */}
            {item.id === 'layout' && activeSection === 'layout' && (
              <div className="sidebar-sub-panel">

                <button className="sidebar-sub-btn sidebar-sub-btn--primary" onClick={onAddBox}>
                  <span className="sidebar-sub-icon">＋</span>
                  Add Box
                </button>

                <button className="sidebar-sub-btn sidebar-sub-btn--bypass" onClick={onAddBypass}>
                  <span className="sidebar-sub-icon sidebar-sub-diamond">◆</span>
                  Add Bypass
                </button>

                <button
                  className={`sidebar-sub-btn sidebar-sub-btn--connect${connectMode ? ' sidebar-sub-btn--connect-active' : ''}`}
                  onClick={onToggleConnect}
                >
                  <span className="sidebar-sub-icon">⇢</span>
                  {connectMode ? 'Cancel Connect' : 'Connect Boxes'}
                </button>

                <div className="sidebar-sub-divider" />

                <button
                  className="sidebar-sub-btn sidebar-sub-btn--save"
                  onClick={onSaveLayout}
                  disabled={isSaving}
                >
                  <span className="sidebar-sub-icon">💾</span>
                  {isSaving ? 'Saving…' : 'Save Layout'}
                </button>

                {savedLayouts.length > 0 && (
                  <div className="sidebar-load-section">
                    <span className="sidebar-load-label">Load saved:</span>
                    <select
                      className="sidebar-load-select"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) onLoadLayout(Number(e.target.value));
                        e.target.value = '';
                      }}
                    >
                      <option value="" disabled>Select layout…</option>
                      {savedLayouts.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
