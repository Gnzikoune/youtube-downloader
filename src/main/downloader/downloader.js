const { execa } = require('execa');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

class Downloader {
  constructor(mainWindow, queueManager) {
    this.mainWindow = mainWindow;
    this.queueManager = queueManager;
    this.activeProcesses = new Map();
  }

  cleanTitle(title) {
    if (!title) return '';
    return title
      .replace(/\.f\d+/g, '')
      .replace(/\.temp/g, '')
      .replace(/\.(mp4|m4a|webm|mp3|mkv)$/i, '')
      .trim();
  }

  async download(url, options) {
    const { id, format = 'video', quality = 'best', outputPath, isPlaylist } = options;
    
    const finalOutputPath = outputPath || path.join(process.env.USERPROFILE, 'Downloads', 'YT-Downloads');
    if (!fs.existsSync(finalOutputPath)) fs.mkdirSync(finalOutputPath, { recursive: true });

    const resourcesPath = path.join(process.cwd(), 'resources');
    const ytDlpPath = path.join(resourcesPath, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const ffmpegPath = path.join(resourcesPath, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    const hasFfmpeg = fs.existsSync(ffmpegPath);

    const outputTemplate = isPlaylist 
      ? `${finalOutputPath}/%(playlist_title)s/%(title)s.%(ext)s`
      : `${finalOutputPath}/%(title)s.%(ext)s`;

    const args = [
      '--ignore-errors',
      '--no-warnings',
      '--continue',
      '--no-overwrites',
      '--retries', '10',
      '--no-part',
      '--newline',
      '--progress',
      '--progress-template', 'download:[download] %(progress)s% of %(total_bytes)s at %(speed)s ETA %(eta)s',
      '-o', outputTemplate,
    ];

    if (format === 'audio') {
      args.push('-x', '--audio-format', 'mp3');
      if (hasFfmpeg) args.push('--ffmpeg-location', ffmpegPath);
    } else {
      if (hasFfmpeg) {
        args.push('--ffmpeg-location', ffmpegPath);
        if (quality === '1080p') args.push('-f', 'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[ext=mp4]/best');
        else if (quality === '720p') args.push('-f', 'bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[ext=mp4]/best');
        else args.push('-f', 'bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[ext=mp4]/best');
        args.push('--merge-output-format', 'mp4');
      } else {
        args.push('-f', 'best[ext=mp4]/best');
      }
    }

    if (!isPlaylist) args.push('--no-playlist');
    args.push(url);

    this.queueManager.enqueue(async () => {
      this.mainWindow.webContents.send('progress-update', { id, status: 'initialisation', step: 'Prép...' });

      try {
        const subprocess = execa(ytDlpPath, args);
        this.activeProcesses.set(id, subprocess);

        let currentTitle = '';
        let currentStep = 'Téléchargement';
        const finishedInThisSession = new Set();

        subprocess.stdout.on('data', (data) => {
          const line = data.toString();
          
          if (line.includes('[download] Destination')) {
            const titleMatch = line.match(/\[download\] Destination: .+[/\\](.+)\.[^.]+$/);
            if (titleMatch) {
              currentTitle = this.cleanTitle(titleMatch[1]);
              this.mainWindow.webContents.send('progress-update', { id, title: currentTitle });
            }
          }

          if (line.includes('[Merger]')) currentStep = 'Fusion...';
          if (line.includes('[ExtractAudio]')) currentStep = 'Audio...';

          const progressMatch = line.match(/(\d+\.\d+)%/);
          if (progressMatch) {
            this.mainWindow.webContents.send('progress-update', {
              id,
              progress: parseFloat(progressMatch[1]),
              status: 'téléchargement',
              step: currentStep
            });
          }

          // DÉTECTION DE FIN RÉELLE (Après fusion ou extraction complète)
          // On attend que yt-dlp ait fini de traiter le fichier (souvent indiqué par "Deleting original file" ou le passage à la suite)
          if ((line.includes('Deleting original file') || (line.includes('100%') && !hasFfmpeg)) && currentTitle) {
            if (!finishedInThisSession.has(currentTitle)) {
              finishedInThisSession.add(currentTitle);
              this.mainWindow.webContents.send('video-finished', { title: currentTitle, format, quality });
            }
          }
        });

        await subprocess;
        this.activeProcesses.delete(id);
        this.mainWindow.webContents.send('progress-update', { id, progress: 100, status: 'terminé', step: 'Fini' });
        this.mainWindow.webContents.send('download-complete', { id });

        // Mise à jour du compteur global sur le site web
        try {
          const siteUrl = 'https://youtube-downloader-web-pro.vercel.app'; 
          await axios.post(`${siteUrl}/api/counter`);
        } catch (e) {
          console.error('Erreur lors de la mise à jour des stats globales:', e.message);
        }

      } catch (error) {
        this.activeProcesses.delete(id);
        // Si annulé, on s'assure que rien n'est envoyé à l'historique
        this.mainWindow.webContents.send('progress-update', { id, status: 'annulé', step: 'Annulé' });
      }
    });
  }

  stopDownload(id) {
    const subprocess = this.activeProcesses.get(id);
    if (subprocess) {
      try {
        // SIGKILL force l'arrêt immédiat sans délai de grâce
        subprocess.kill('SIGKILL'); 
      } catch (e) {}
      this.activeProcesses.delete(id);
      return true;
    }
    return false;
  }
}

module.exports = Downloader;
