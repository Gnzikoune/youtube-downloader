const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
require('dotenv').config();
const SingPay = require('singpay-sdk');

console.log('--- YT Downloader Pro - Initialisation ---');
const YtDlpUpdater = require('./updater/updater');

// Configuration SingPay
const singPay = new SingPay({
  clientId: process.env.SINGPAY_CLIENT_ID,
  clientSecret: process.env.SINGPAY_CLIENT_SECRET,
  walletId: process.env.SINGPAY_WALLET,
  isProduction: process.env.SINGPAY_PRODUCTION === 'true'
});

// Correction des erreurs de cache sur Windows en dev
if (process.env.NODE_ENV === 'development') {
  const customPath = path.join(app.getPath('userData'), '../yt-downloader-pro-dev');
  app.setPath('userData', customPath);
}

const Downloader = require('./downloader/downloader');
const QueueManager = require('./downloader/queue');

const store = new (Store.default || Store)();
const queueManager = new QueueManager();
let mainWindow;
let downloader;

// Historique temporaire pour éviter les doublons rapides (debounce)
const recentHistory = new Set();

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development';
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
  } else {
    // Chemin précis vers le build de Vite
    const indexPath = path.join(__dirname, '../../dist/renderer/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Erreur de chargement de l\'index:', err);
    });
  }

  downloader = new Downloader(mainWindow, queueManager);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Mise à jour de l'App (Electron)
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('log-update', '📦 Une nouvelle version de l\'application est disponible. Téléchargement...');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('log-update', '✅ Mise à jour téléchargée. Elle sera installée au prochain redémarrage.');
  });

  // Mise à jour du moteur (yt-dlp)
  const updater = new YtDlpUpdater(mainWindow);
  if (store.get('autoUpdate', true)) {
    updater.checkAndUIUpdate();
  }
});

ipcMain.on('start-download', (event, { url, options }) => {
  const settings = store.get('settings', {
    outputPath: path.join(app.getPath('downloads'), 'YT-Downloads'),
    maxParallel: 2,
    defaultFormat: 'video',
    defaultQuality: 'best'
  });
  
  downloader.download(url, { ...options, outputPath: settings.outputPath });
});

ipcMain.on('stop-download', (event, id) => {
  downloader.stopDownload(id);
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('get-settings', () => {
  return store.get('settings', {
    outputPath: path.join(app.getPath('downloads'), 'YT-Downloads'),
    maxParallel: 2,
    autoUpdate: true,
    defaultFormat: 'video',
    defaultQuality: 'best'
  });
});

ipcMain.on('save-settings', (event, settings) => {
  store.set('settings', settings);
});

ipcMain.on('check-update', () => {
  const updater = new YtDlpUpdater(mainWindow);
  updater.checkAndUIUpdate();
});

ipcMain.handle('get-history', () => {
  return store.get('history', []);
});

ipcMain.on('add-to-history', (event, item) => {
  // CLÉ UNIQUE : Titre + Format pour éviter les doublons exacts
  const historyKey = `${item.title}-${item.format}`;
  
  if (recentHistory.has(historyKey)) return; // Ignorer si déjà ajouté récemment

  const history = store.get('history', []);
  const newItem = {
    ...item,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
  };
  
  history.unshift(newItem);
  store.set('history', history.slice(0, 100));
  
  // Anti-doublon temporaire
  recentHistory.add(historyKey);
  setTimeout(() => recentHistory.delete(historyKey), 10000); // 10 secondes de protection
});

ipcMain.on('clear-history', () => {
  store.set('history', []);
  recentHistory.clear();
});

ipcMain.on('generate-donation-link', async () => {
  try {
    const reference = `DON-${Date.now()}`;
    const linkInfo = await singPay.generatePaymentLink(
      1000, 
      reference,
      'https://github.com/Gnzikoune/youtube-downloader/success',
      'https://github.com/Gnzikoune/youtube-downloader/cancel'
    );
    
    if (linkInfo && linkInfo.link) {
      shell.openExternal(linkInfo.link);
    }
  } catch (error) {
    console.error('Erreur SingPay:', error);
  }
});

ipcMain.handle('get-playlist-info', async (event, url) => {
  const resourcesPath = path.join(process.cwd(), 'resources');
  const ytDlpPath = path.join(resourcesPath, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  
  const { execa } = require('execa');
  try {
    const { stdout } = await execa(ytDlpPath, [
      '--dump-single-json',
      '--flat-playlist',
      '--ignore-errors',
      url
    ]);
    const data = JSON.parse(stdout);
    return {
      title: data.title || 'Vidéo seule',
      videoCount: data.entries ? data.entries.length : 1,
      videos: data.entries ? data.entries.map(e => ({
        title: e.title,
        url: `https://www.youtube.com/watch?v=${e.id}`,
        duration: e.duration,
        thumbnail: e.thumbnails ? e.thumbnails[0].url : null
      })) : [{
        title: data.title,
        url: url,
        duration: data.duration,
        thumbnail: data.thumbnails ? data.thumbnails[0].url : null
      }]
    };
  } catch (error) {
    throw new Error('Impossible de récupérer les informations.');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
