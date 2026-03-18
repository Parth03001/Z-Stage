import React from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'layout', label: 'Layout Preparation', icon: '⬛' },
  { id: 'input',  label: 'Input Data',         icon: '📥' },
  { id: 'dashboard', label: 'Z-Stage Dashboard', icon: '📊' },
];

function Sidebar({ activeSection, onSectionChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Z-Stage</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item${activeSection === item.id ? ' sidebar-nav-item--active' : ''}`}
            onClick={() => onSectionChange(item.id)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
