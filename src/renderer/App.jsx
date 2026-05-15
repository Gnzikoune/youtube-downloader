import React, { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('download');
  const [url, setUrl] = useState('');
  const [downloads, setDownloads] = useState([]);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentFormat, setCurrentFormat] = useState('video');
  const [currentQuality, setCurrentQuality] = useState('best');
  
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(s => {
        setSettings(s);
        setCurrentFormat(s.defaultFormat);
        setCurrentQuality(s.defaultQuality);
      });

      window.electronAPI.getHistory().then(setHistory);

      window.electronAPI.onProgressUpdate((data) => {
        setDownloads((prev) => {
          const index = prev.findIndex((d) => d.id === data.id);
          if (index > -1) {
            const newDownloads = [...prev];
            newDownloads[index] = { ...newDownloads[index], ...data };
            return newDownloads;
          }
          return [...prev, data];
        });
      });

      window.electronAPI.onVideoFinished((data) => {
        const historyItem = {
          title: data.title,
          format: data.format,
          quality: data.quality,
        };
        window.electronAPI.addToHistory(historyItem);
        window.electronAPI.getHistory().then(setHistory);
      });

      window.electronAPI.onLogUpdate((log) => {
        setLogs((prev) => [...prev, log].slice(-50));
      });
    }
  }, []);

  const fetchPreview = async () => {
    if (!url) return;
    setIsLoadingInfo(true);
    setPreviewData(null);
    try {
      const info = await window.electronAPI.getPlaylistInfo(url);
      setPreviewData(info);
    } catch (error) {
      alert("Erreur : Impossible d'analyser ce lien. Vérifiez l'URL.");
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const startDownload = (downloadUrl, title = 'Initialisation...', isPlaylist = false) => {
    const id = Date.now().toString();
    const newDownload = {
      id,
      url: downloadUrl,
      title: title,
      progress: 0,
      status: 'initialisation',
      step: 'Attente...',
      speed: '0 MiB/s',
      eta: '--:--',
      format: currentFormat,
      quality: currentQuality
    };

    setDownloads((prev) => [newDownload, ...prev]);
    window.electronAPI.downloadPlaylist(downloadUrl, { 
      id, 
      format: currentFormat, 
      quality: currentQuality,
      isPlaylist
    });
  };

  const handleDownloadAll = () => {
    if (!previewData) return;
    startDownload(url, previewData.title || 'Playlist...', true);
    setPreviewData(null);
    setUrl('');
  };

  const handleDownloadSingle = (video) => {
    startDownload(video.url, video.title, false);
  };

  const handleStop = (id) => {
    window.electronAPI.stopDownload(id);
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'annulé', step: 'Stoppé' } : d));
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  const handleSelectDir = async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) setSettings(prev => ({ ...prev, outputPath: path }));
  };

  const saveSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    window.electronAPI.saveSettings(updated);
  };

  return (
    <>
      <div className="sidebar">
        <div className="logo">
          <img src="icon.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          YT Downloader Pro
        </div>
        
        <div className={`nav-item ${activeTab === 'download' ? 'active' : ''}`} onClick={() => setActiveTab('download')}>
          📁 Téléchargement
        </div>
        
        <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          🕒 Historique
        </div>
        
        <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          ⚙️ Paramètres
        </div>

        <div className={`nav-item ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')} >
          ❤️ À Propos
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="nav-item" style={{ fontSize: '0.8rem', opacity: 0.6 }} onClick={() => window.electronAPI.checkUpdate()}>
            🔄 Moteur
          </div>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'download' && (
          <div className="fade-in">
            <h2>Nouveau Téléchargement</h2>
            
            <div className="glass-card">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Lien YouTube..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button 
                  className="btn-primary" 
                  onClick={fetchPreview} 
                  disabled={isLoadingInfo || !url}
                >
                  {isLoadingInfo ? (
                    <>
                      <div className="spinner"></div>
                      Analyse en cours...
                    </>
                  ) : 'Vérifier le lien'}
                </button>
              </div>
              
              <div className="options-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Format :</span>
                  <div className="option-toggle">
                    <div className={`toggle-item ${currentFormat === 'video' ? 'active' : ''}`} onClick={() => setCurrentFormat('video')}>🎬 Vidéo</div>
                    <div className={`toggle-item ${currentFormat === 'audio' ? 'active' : ''}`} onClick={() => setCurrentFormat('audio')}>🎵 Audio</div>
                  </div>
                </div>

                {currentFormat === 'video' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Qualité :</span>
                    <select value={currentQuality} onChange={(e) => setCurrentQuality(e.target.value)}>
                      <option value="best">Optimale</option>
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {previewData && (
              <div className="fade-in glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>{previewData.title} ({previewData.videoCount})</h3>
                  <button className="btn-primary" onClick={handleDownloadAll}>Tout Télécharger</button>
                </div>
                
                <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {previewData.videos.map((v, i) => (
                    <div key={i} className="video-preview-card">
                      <div className="thumb-wrapper">
                        <img src={v.thumbnail} className="thumb-img" alt="thumb" />
                        <span className="thumb-duration-badge">{formatDuration(v.duration)}</span>
                      </div>
                      
                      <div className="preview-details">
                        <span className="preview-title">{v.title}</span>
                      </div>

                      <button className="btn-download-small" onClick={() => handleDownloadSingle(v)}>
                        TÉLÉCHARGER
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {downloads.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <h3 className="section-title">Tâches actives</h3>
                {downloads.map((d) => (
                  <div key={d.id} className="item-card">
                    <div className="icon-box">{d.format === 'video' ? '🎬' : '🎵'}</div>
                    <div className="item-details">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="item-title">{d.title}</span>
                        {(d.status === 'téléchargement' || d.status === 'initialisation') && (
                          <button className="btn-stop" onClick={() => handleStop(d.id)}>ARRÊTER</button>
                        )}
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${d.progress}%` }}></div></div>
                      <div className="meta-row">
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{d.step} {d.progress}%</span>
                        <span>{d.speed} • ETA: {d.eta}</span>
                        <span className={`badge-status ${d.status}`}>{d.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="log-box">
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h2>Historique</h2>
              <button className="btn-stop" style={{ border: '1px solid var(--border)' }} onClick={() => { window.electronAPI.clearHistory(); setHistory([]); }}>Vider</button>
            </div>
            {history.map((h, i) => (
              <div key={i} className="item-card">
                <div className="icon-box">{h.format === 'video' ? '🎬' : '🎵'}</div>
                <div className="item-details">
                  <span className="item-title">{h.title}</span>
                  <div className="meta-row"><span>{h.format.toUpperCase()} • {h.quality} • {new Date(h.timestamp).toLocaleDateString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="fade-in">
            <h2>Paramètres</h2>
            <div className="glass-card">
              <label className="label-setting" style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>Dossier de destination</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <input type="text" readOnly value={settings.outputPath} />
                <button className="btn-primary" onClick={handleSelectDir}>Modifier</button>
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label-setting" style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>Téléchargements parallèles</label>
                  <input type="number" min="1" max="5" value={settings.maxParallel} onChange={(e) => saveSettings({ maxParallel: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'about' && (
          <div className="fade-in" style={{ textAlign: 'center', paddingTop: '2rem' }}>
            <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem' }}>
              <img src="icon.png" alt="Logo" style={{ width: '80px', height: '80px', marginBottom: '1.5rem', margin: '0 auto' }} />
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>YT Downloader Pro</h1>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>Version 1.8.4 Stable</p>
              
              <div style={{ textAlign: 'left', marginBottom: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                <p style={{ marginBottom: '1rem' }}><strong>Éditeur :</strong> Gildas NZIKOUNÉ</p>
                <p style={{ color: 'var(--text-dim)', lineHeight: '1.6' }}>
                  Un outil professionnel et open-source pour télécharger vos vidéos et playlists YouTube en haute qualité. 
                  Conçu pour la communauté.
                </p>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '2rem', borderRadius: '1.5rem', border: '1px dashed var(--primary)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Soutenir le projet</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.8 }}>
                  Si vous trouvez cet outil utile, n'hésitez pas à me soutenir via Mobile Money (Gabon).
                </p>
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => window.electronAPI.generateDonationLink()}
                >
                  Faire un don (Airtel / Moov)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
