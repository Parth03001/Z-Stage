import React, { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import LayoutPreparation from './components/LayoutPreparation/LayoutPreparation';
import InputData from './components/InputData/InputData';
import ZStageDashboard from './components/ZStageDashboard/ZStageDashboard';
import './App.css';

const SECTIONS = {
  layout: <LayoutPreparation />,
  input: <InputData />,
  dashboard: <ZStageDashboard />,
};

function App() {
  const [activeSection, setActiveSection] = useState('layout');

  return (
    <div className="app">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="app-main">
        {SECTIONS[activeSection]}
      </main>
    </div>
  );
}

export default App;
