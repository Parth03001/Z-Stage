import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import LayoutPreparation from './components/LayoutPreparation/LayoutPreparation';
import InputData from './components/InputData/InputData';
import ZStageDashboard from './components/ZStageDashboard/ZStageDashboard';
import { layoutApi } from './api/layoutApi';
import './App.css';

function App() {
  const [activeSection, setActiveSection] = useState('layout');

  // ── Layout Preparation state lifted to App so Sidebar can trigger it ────────
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);

  // Refs that LayoutPreparation populates with its handler functions
  const saveHandlerRef = useRef(null);
  const loadHandlerRef = useRef(null);

  // Fetch list of saved layouts on mount
  useEffect(() => {
    layoutApi.getLayouts()
      .then((res) => setSavedLayouts(res.data))
      .catch(() => {});
  }, []);

  const handleSaveLayout = async () => {
    if (!saveHandlerRef.current) return;
    setIsSaving(true);
    const ok = await saveHandlerRef.current();
    setIsSaving(false);
    if (ok) {
      // Refresh the saved layouts list
      layoutApi.getLayouts()
        .then((res) => setSavedLayouts(res.data))
        .catch(() => {});
    }
  };

  const handleLoadLayout = async (id) => {
    if (loadHandlerRef.current) await loadHandlerRef.current(id);
  };

  const layoutActions = {
    onAddBox: () => setShowAddBoxModal(true),
    onAddBypass: () => {
      // Trigger bypass add through a shared state signal
      setAddBypassSignal((s) => s + 1);
    },
    connectMode,
    onToggleConnect: () => setConnectMode((v) => !v),
    onSaveLayout: handleSaveLayout,
    onLoadLayout: handleLoadLayout,
    savedLayouts,
    isSaving,
  };

  // Signal to LayoutPreparation to add a bypass icon
  const [addBypassSignal, setAddBypassSignal] = useState(0);

  return (
    <div className="app">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        layoutActions={layoutActions}
      />
      <main className="app-main">
        {activeSection === 'layout' && (
          <LayoutPreparation
            showAddBoxModal={showAddBoxModal}
            onCloseAddBoxModal={() => setShowAddBoxModal(false)}
            connectMode={connectMode}
            onToggleConnect={() => setConnectMode((v) => !v)}
            addBypassSignal={addBypassSignal}
            onSaveLayout={(fn) => { saveHandlerRef.current = fn; }}
            onLoadLayout={(fn) => { loadHandlerRef.current = fn; }}
          />
        )}
        {activeSection === 'input' && <InputData />}
        {activeSection === 'dashboard' && <ZStageDashboard />}
      </main>
    </div>
  );
}

export default App;
