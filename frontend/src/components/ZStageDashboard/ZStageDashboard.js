import React from 'react';
import { BarChart2 } from 'lucide-react';
import './ZStageDashboard.css';

function ZStageDashboard() {
  return (
    <div className="z-dashboard">
      <div className="z-dashboard-placeholder">
        <div className="z-dashboard-icon"><BarChart2 size={52} strokeWidth={1} /></div>
        <h2>Z-Stage Dashboard</h2>
        <p>Dashboard view will display live Z-stage data here.</p>
      </div>
    </div>
  );
}

export default ZStageDashboard;
