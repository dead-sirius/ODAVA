import { useState, useEffect } from 'react';
import { Shield, FolderSearch, Activity, Settings, Cpu, ShieldAlert, Download, Moon, Sun } from 'lucide-react';
import { VulnerabilityReport, Vulnerability } from './components/VulnerabilityReport';
import './assets/main.css';

function App() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [setupStatus, setSetupStatus] = useState<string>('Ready to download or connect model...');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedModel, setSelectedModel] = useState<string>('phi-4-mini-instruct-q4.gguf');

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    let interval: any = null;
    const checkModel = async () => {
      try {
        if (window.electron?.ipcRenderer) {
          const status = await window.electron.ipcRenderer.invoke('check-model-status');
          if (status.ready) {
            setModelReady(true);
            setShowSetup(false);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkModel();
    interval = setInterval(checkModel, 2000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleSelectDirectory = async () => {
    if (!window.electron?.ipcRenderer) {
      alert('This feature is only available in the desktop app.');
      return;
    }
    const path = await window.electron.ipcRenderer.invoke('select-directory');
    if (path) {
      setSelectedPath(path);
      setVulnerabilities([]);
      setScanProgress(0);
    }
  };

  const handleStartScan = async () => {
    if (!selectedPath) return;
    setIsScanning(true);
    setScanProgress(10);
    setVulnerabilities([]);
    
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on('scan-progress', (_, progress, newVuln) => {
        setScanProgress(progress);
        if (newVuln) {
          setVulnerabilities(prev => [...prev, newVuln]);
        }
      });

      const results = await window.electron.ipcRenderer.invoke('start-scan', selectedPath);
      setVulnerabilities(results);
      setScanProgress(100);
      setIsScanning(false);
      window.electron.ipcRenderer.removeAllListeners('scan-progress');
    } else {
      alert('This feature is only available in the desktop app.');
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const handleSetupModel = async () => {
    setSetupStatus(`Setting up ${selectedModel}...`);
    if (window.electron?.ipcRenderer) {
      const result = await window.electron.ipcRenderer.invoke('setup-model', selectedModel);
      if (result.success) {
        setSetupStatus('Model Ready!');
        setModelReady(true);
        setTimeout(() => setShowSetup(false), 1000);
      } else {
        setSetupStatus(`Error: ${result.error}`);
      }
    } else {
      alert('This feature is only available in the desktop app.');
      setShowSetup(false);
    }
  };

  const handleExportPdf = async () => {
    if (window.electron?.ipcRenderer) {
      const result = await window.electron.ipcRenderer.invoke('export-pdf');
      if (result.success) {
        alert('Report saved to ' + result.filePath);
      } else if (!result.canceled) {
        alert('Failed to save report: ' + result.error);
      }
    }
  };

  return (
    <>
      {showSetup && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
            <Cpu size={48} color="var(--accent-color)" />
            <h2>Local AI Model Setup</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              ODAVA requires a local Small Language Model (SLM) to analyze your code without sending it to the cloud.
            </p>
            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', width: '100%', fontSize: '0.95rem', textAlign: 'left', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>Select AI Model:</label>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}
              >
                <option value="phi-4-mini-instruct-q4.gguf">Phi-4 Mini (Recommended - Fast & Accurate)</option>
                <option value="gemma-3-nano.gguf">Gemma 3 Nano (Lightweight)</option>
              </select>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', width: '100%', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {setupStatus}
            </div>
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowSetup(false)}>Skip for now</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSetupModel}>
                Download Model
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        <header>
          <div className="logo-container">
            <div className="logo-icon">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="app-title">ODAVA <span className="text-gradient">Core</span></h1>
              <span className="app-subtitle">On-Device AI Vulnerability Analyzer</span>
            </div>
          </div>
          <div>
            <button className="btn-outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ padding: '10px', borderRadius: '50%', marginRight: '12px' }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn-outline" onClick={() => setShowSetup(true)} style={{ padding: '10px', borderRadius: '50%' }}>
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="controls-panel">
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Scan Target</h3>
              <button className="btn-outline" onClick={handleSelectDirectory}>
                <FolderSearch size={18} /> Select Codebase
              </button>
              
              {selectedPath ? (
                <div className="path-display">
                  {selectedPath}
                </div>
              ) : (
                <div className="path-display" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  No directory selected
                </div>
              )}
              
              <button 
                className="btn-primary" 
                style={{ justifyContent: 'center', marginTop: '1rem' }}
                disabled={!selectedPath || isScanning}
                onClick={handleStartScan}
              >
                <Activity size={18} />
                {isScanning ? 'Analyzing...' : 'Start Scan'}
              </button>
            </div>

            <div className="glass-panel status-card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>System Status</h3>
              <div className="status-indicator">
                <div className={`status-dot ${modelReady ? 'success' : 'danger'}`}></div>
                <span>AI Inference Engine: {modelReady ? 'Online' : 'Offline'}</span>
              </div>
              <div className="status-indicator">
                <div className={`status-dot ${isScanning ? 'active' : ''}`}></div>
                <span>Scanner: {isScanning ? 'Active' : 'Idle'}</span>
              </div>

              {isScanning && (
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${scanProgress}%` }}></div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={22} color="var(--accent-hover)" />
              Scan Results 
              {vulnerabilities.length > 0 && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="badge high">{vulnerabilities.length} Found</span>
                  <button className="btn-outline no-print" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleExportPdf}>
                    <Download size={14} /> Export PDF
                  </button>
                </div>
              )}
            </h2>
            
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {selectedPath && !isScanning && vulnerabilities.length === 0 ? (
                <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
                  Ready to scan {selectedPath.split(/[\\/]/).pop()}
                </div>
              ) : !selectedPath ? (
                <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
                  Select a codebase to begin analysis.
                </div>
              ) : (
                <VulnerabilityReport vulns={vulnerabilities} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
