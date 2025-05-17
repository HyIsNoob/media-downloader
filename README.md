# Media Downloader

A cross-platform desktop application for downloading videos and audio from various platforms like YouTube, Facebook, and TikTok.

## Features

- Download videos/audio from YouTube, Facebook, TikTok, and other supported platforms
- Select video/audio quality (multiple resolutions, audio bitrates)
- Download playlists or multiple links at once
- Choose save location
- View download history
- Display download progress, speed, ETA, and file size

## Requirements

- [Node.js](https://nodejs.org/) (v14 or higher)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be installed and available in PATH)
- [ffmpeg](https://ffmpeg.org/) (optional, for audio conversion)

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Make sure yt-dlp is installed and available in your PATH
4. Run the app:
   ```
   npm start
   ```

## Development

To run the app in development mode with DevTools:
```
npm run dev
```

## Build

To build the app for your platform:
```
npm run build
```

## Technologies Used

- Electron
- JavaScript
- HTML/CSS
- Bootstrap
- yt-dlp (backend)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
