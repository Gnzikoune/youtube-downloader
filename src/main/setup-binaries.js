const { app } = require('electron');
const path = require('path');
const fs = require('fs');

function getBinaries() {
  const userDataPath = app.getPath('userData');
  const binDir = path.join(userDataPath, 'bin');

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const isWin = process.platform === 'win32';
  const ytDlpName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
  const ffmpegName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

  const bundledResourcesPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'resources') 
    : path.join(app.getAppPath(), 'resources');

  const bundledYtDlp = path.join(bundledResourcesPath, ytDlpName);
  const userYtDlp = path.join(binDir, ytDlpName);

  // Copier yt-dlp dans userData au premier lancement si ce n'est pas fait
  if (!fs.existsSync(userYtDlp) && fs.existsSync(bundledYtDlp)) {
    fs.copyFileSync(bundledYtDlp, userYtDlp);
    if (!isWin) {
      try { fs.chmodSync(userYtDlp, '755'); } catch (e) {}
    }
  }

  return {
    ytDlpPath: fs.existsSync(userYtDlp) ? userYtDlp : bundledYtDlp,
    ffmpegPath: path.join(bundledResourcesPath, ffmpegName)
  };
}

module.exports = getBinaries;
