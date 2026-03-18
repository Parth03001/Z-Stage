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
  const [addBypassSignal, setAddBypassSignal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);

  const saveHandlerRef = useRef(null);
  const loadHandlerRef = useRef(null);

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
    onAddBypass: () => setAddBypassSignal((s) => s + 1),
    onSaveLayout: handleSaveLayout,
    onLoadLayout: handleLoadLayout,
    savedLayouts,
    isSaving,
  };

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
