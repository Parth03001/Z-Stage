import React from 'react';
import { Inbox } from 'lucide-react';
import './InputData.css';

function InputData() {
  return (
    <div className="input-data">
      <div className="input-data-placeholder">
        <div className="input-data-icon"><Inbox size={52} strokeWidth={1} /></div>
        <h2>Input Data</h2>
        <p>This section is under construction.</p>
      </div>
    </div>
  );
}

export default InputData;
