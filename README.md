# 🎬 YT Playlist Downloader - Pro Edition

Une application desktop moderne, ultra-rapide et robuste pour télécharger des vidéos et des playlists YouTube. Conçue avec **Electron**, **React** et propulsée par **yt-dlp**.

![UI Preview](https://img.shields.io/badge/UI-Slate_Professional-red?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Complete-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows_|_Mac_|_Linux-blue?style=for-the-badge)

## ✨ Fonctionnalités Clés

- **📦 Gestion Intelligente des Playlists** : Analysez une playlist entière, visualisez les miniatures et choisissez de tout télécharger ou de sélectionner des vidéos spécifiques.
- **🚀 Moteur Haute Performance** : Utilise `yt-dlp` pour des vitesses de téléchargement optimales et un support de contournement des restrictions YouTube.
- **🛠️ Fusion FFmpeg Intégrée** : Supporte la fusion automatique des flux vidéo 4K/1080p et audio haute qualité pour des fichiers MP4 parfaits.
- **🕒 Historique Détaillé** : Gardez une trace de chaque vidéo téléchargée avec un nettoyage automatique des titres techniques.
- **📁 Organisation Intelligente** : Les playlists sont automatiquement rangées dans des dossiers nommés, tandis que les vidéos isolées vont directement à la racine de votre dossier de téléchargement.
- **🎨 UI Premium & Responsive** : Un design sombre (Slate), épuré et fluide qui s'adapte à toutes les tailles d'écran sur Windows, macOS et Linux.
- **🛑 Contrôle Total** : Arrêtez instantanément n'importe quel téléchargement en cours d'un simple clic.

## 🛠️ Installation & Développement

### Prérequis
- [Node.js](https://nodejs.org/) (Version 18+)
- **FFmpeg** (Placer `ffmpeg.exe` dans le dossier `resources/` pour le support de la fusion haute qualité).

### Installation
1. Clonez le dépôt ou téléchargez les sources.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez l'application en mode développement :
   ```bash
   npm run dev
   ```

## 🏗️ Compilation (Build)

Pour générer l'exécutable final (`.exe`, `.dmg`, ou `.AppImage`) :
```bash
npm run build
```
Les fichiers générés se trouveront dans le dossier `dist/`.

## ⚙️ Configuration
- **Dossier de destination** : Modifiable dans l'onglet *Paramètres*.
- **Téléchargements parallèles** : Réglable de 1 à 5 tâches simultanées.
- **Mise à jour du moteur** : L'application vérifie et met à jour automatiquement `yt-dlp` pour garantir une compatibilité permanente.

## 🧰 Stack Technique
- **Frontend** : React.js, Vite, Vanilla CSS.
- **Backend** : Electron, Node.js.
- **Processus** : Execa (Gestion des sous-processus yt-dlp).
- **Stockage** : Electron-Store (Persistance des réglages et de l'historique).

---
*Développé avec précision pour une expérience de téléchargement sans compromis.*

## 🚀 Workflow de Release Automatique

Ce projet utilise **semantic-release** pour automatiser la gestion des versions et les publications GitHub. Le robot analyse vos messages de commit pour décider de la nouvelle version.

**Règles de commit à suivre :**

- **Nouvelle fonctionnalité** :
  ```bash
  git commit -m "feat: ajout du support des shorts youtube"
  ```
  *(Le robot créera une version **1.1.0**)*

- **Correction de bug** :
  ```bash
  git commit -m "fix: correction du bug de l'historique"
  ```
  *(Le robot créera une version **1.0.1**)*

- **Maintenance / Documentation** :
  ```bash
  git commit -m "chore: mise à jour du readme"
  ```
  *(Le robot **ne créera pas** de nouvelle version)*

- **Changement majeur (Breaking Change)** :
  Ajoutez `BREAKING CHANGE` dans le corps du message de commit.
  *(Le robot créera une version **2.0.0**)*

---
*Note : Les builds automatiques pour Windows, Mac et Linux se lancent à chaque push sur la branche **main**.*
