const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execa } = require('execa');

class YtDlpUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.repo = 'yt-dlp/yt-dlp';
    this.binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const getBinaries = require('../setup-binaries');
    const { ytDlpPath, binDir } = getBinaries();
    this.resourcesPath = binDir;
    this.binaryPath = ytDlpPath;
  }

  async checkAndUIUpdate() {
    // On ne vérifie que yt-dlp. FFmpeg est géré manuellement par l'utilisateur.
    await this.checkYtDlp();
  }

  async checkYtDlp() {
    this.mainWindow.webContents.send('log-update', 'Vérification de yt-dlp...');
    try {
      const { data } = await axios.get(`https://api.github.com/repos/${this.repo}/releases/latest`);
      const latestVersion = data.tag_name;
      
      let localVersion = 'aucune';
      if (fs.existsSync(this.binaryPath)) {
        const { stdout } = await execa(this.binaryPath, ['--version']);
        localVersion = stdout.trim();
      }

      if (localVersion !== latestVersion) {
        this.mainWindow.webContents.send('log-update', `Mise à jour yt-dlp disponible : ${latestVersion}`);
        await this.downloadYtDlp(data.assets);
      } else {
        this.mainWindow.webContents.send('log-update', `yt-dlp est à jour (${localVersion})`);
      }
    } catch (error) {
      this.mainWindow.webContents.send('log-update', `Note : yt-dlp prêt.`);
    }
  }

  async downloadYtDlp(assets) {
    const asset = assets.find(a => a.name === this.binaryName);
    if (!asset) return;

    this.mainWindow.webContents.send('log-update', 'Téléchargement de la nouvelle version de yt-dlp...');
    
    if (!fs.existsSync(this.resourcesPath)) {
      fs.mkdirSync(this.resourcesPath, { recursive: true });
    }

    const writer = fs.createWriteStream(this.binaryPath);
    const response = await axios({ url: asset.browser_download_url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        this.mainWindow.webContents.send('log-update', 'yt-dlp mis à jour !');
        resolve();
      });
      writer.on('error', reject);
    });
  }
}

module.exports = YtDlpUpdater;
