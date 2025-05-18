# Media Downloader

A modern, cross-platform desktop application for downloading videos and audio from various platforms like YouTube, Facebook, and TikTok.

(![image](https://github.com/user-attachments/assets/7bc3dd8a-648b-4471-b1b6-ab70121e6c0f))

## 🆕 What's New in v1.1.0

- Fixed notification display issues
- Improved video information display with better fallbacks
- Settings now apply immediately without requiring restart
- Enhanced clipboard URL detection
- Improved history layout
- Better file size estimation
- Support for more video resolutions

See the [CHANGELOG.md](CHANGELOG.md) for complete details.

## ✨ Features

- Download videos/audio from YouTube, Facebook, TikTok, and other supported platforms
- Modern UI with dark/light mode
- Select video/audio quality (multiple resolutions, audio bitrates)
- Download playlists or multiple links at once
- Choose save location
- View download history with thumbnails
- Display download progress, speed, ETA, and file size
- Beautiful animations and transitions
- Responsive design for all screen sizes

## 🔧 Requirements

- [Node.js](https://nodejs.org/) (v14 or higher)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be installed and available in PATH)
- [ffmpeg](https://ffmpeg.org/) (optional, for audio conversion)

## 📥 Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Make sure yt-dlp is installed and available in your PATH
4. Run the setup script to configure the new UI:
   ```
   node setup-new-ui.js
   ```
5. Run the app:
   ```
   npm start
   ```

## 💻 Development

To run the app in development mode with hot reload:
```
npm run dev
```

## 🏗️ Build

To build the app for your platform:
```
npm run build
```

For specific platforms:
```
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## 🛠️ Technologies Used

- Electron
- JavaScript
- HTML/CSS
- Tailwind CSS
- DaisyUI
- GSAP (GreenSock Animation Platform)
- yt-dlp (backend)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📸 Screenshots

![image](https://github.com/user-attachments/assets/b9f4ae7a-d433-4176-8396-ab76d47762b5)
![image](https://github.com/user-attachments/assets/9a2101ff-ecd8-4009-a391-4c6f6653940e)
![image](https://github.com/user-attachments/assets/ea6995a2-ac68-4d80-8892-338a72c43121)


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
