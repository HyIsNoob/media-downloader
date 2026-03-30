<div align="center">

# **!!Repository Archived!!** 

## **!!!!Important Notice!!!!**

**All releases and downloads from this repository remain fully functional and supported.** 

However, we've created a **newer, improved version** with better performance, features, and maintenance:

[![New Repository](https://img.shields.io/badge/New%20Repo%20→-brightgreen.svg?logo=github)](https://github.com/HyIsNoob/OmniDL)

**This repository is now read-only (archived) for historical reference.**

</div>



# Media Downloader

A modern, cross-platform desktop application for downloading videos and audio from various platforms like YouTube, Facebook, and TikTok.

## What's New in v1.2.0 (Quality & Ultra Remux Update)

| Feature | Description |
|---------|-------------|
| Prefer Modern Codecs (AV1/VP9) | NEW toggle (mặc định bật) ưu tiên AV1/VP9 + Opus, merge sang MKV nếu cần để đạt chất lượng/bitrate tối ưu. |
| Ultra Remux MP4 | Ép bestvideo+bestaudio remux sang MP4 để tương thích tối đa (có thể lớn hơn / bỏ lỡ codec mới). |
| Dual Best Modes | “Best (Any Codec)” vs “Best (MP4)” cho phép chọn giữa chất lượng tối đa và tương thích. |
| Smarter Progress Parser | Bắt được nhiều kiểu output yt-dlp (carriage return, inline cập nhật) → không còn 0 KB/s giả. |
| Metadata Fallbacks | Ngày & lượt xem lấy từ nhiều trường (timestamp, ISO, upload_date, release_date...). |
| Save Thumbnail | Nút lưu thumbnail độ phân giải cao ngay trong khung thông tin video. |
| Completion Modal | Giao diện hoàn tất tải với nút Open File / Folder / Copy Path. |
| Tooltips Giải Thích | Icon “?” trong Settings giải thích khi nào bật Ultra vs Prefer Modern. |

### Chọn chế độ nào?

- Muốn chất lượng tối đa / codec mới / file nhỏ hơn mà vẫn nét: Bật Prefer Modern (mặc định), tắt Ultra Remux.
- Muốn đảm bảo mở được ở TV / đầu phát / phần mềm cũ chỉ hỗ trợ MP4: Bật Ultra Remux.
- Không chắc: Giữ mặc định (Prefer Modern ON, Ultra OFF) → cân bằng tốt nhất.

### Quality Modes Logic

| Mode | Hành vi | Container ưu tiên | Khi nào dùng |
|------|---------|-------------------|--------------|
| Best (Any Codec) + Prefer Modern ON | Ưu tiên av01 > vp9 > h264 + Opus | MKV/WebM (merge MKV nếu mismatch) | Chất lượng & hiệu suất nén tối đa |
| Best (Any Codec) + Ultra ON | bestvideo+bestaudio remux MP4 | MP4 | MP4 bắt buộc nhưng vẫn chọn track tốt nhất |
| Best (MP4) | Chỉ xét track MP4 trước rồi fallback | MP4 | Thiết bị cần MP4 + không bật Ultra |
| Resolution (res-XXX) | Giới hạn độ cao; nếu Prefer Modern ON vẫn ưu tiên AV1/VP9 | MKV hoặc MP4 (nếu Ultra) | Khi bạn chỉ muốn 720p/1080p... |

### Quy tắc nội bộ

- Prefer Modern bật → thêm selector ưu tiên `av01 / vp9 / h264` và merge MKV khi cần.
- Ultra Remux bật → luôn thêm `--merge-output-format mp4`.
- Xung đột: Ultra > Prefer Modern (Prefer Modern bị disable tạm thời UI).

### Lưu ý

- AV1 có thể chậm hơn trên máy cũ (CPU decode). Nếu lag khi phát → tắt Prefer Modern hoặc dùng Best (MP4).
- MKV an toàn chứa nhiều codec – hầu hết trình phát hiện đại hỗ trợ.
- Không transcode: chỉ remux (nhanh, không mất chất lượng).

---

![image](https://github.com/user-attachments/assets/7bc3dd8a-648b-4471-b1b6-ab70121e6c0f)

## What's New in v1.1.0

- Fixed notification display issues
- Improved video information display with better fallbacks
- Settings now apply immediately without requiring restart
- Enhanced clipboard URL detection
- Improved history layout
- Better file size estimation
- Support for more video resolutions

See the [CHANGELOG.md](CHANGELOG.md) for complete details.

## Features

- Download videos/audio from YouTube, Facebook, TikTok, and other supported platforms
- Modern UI with dark/light mode
- Select video/audio quality (multiple resolutions, audio bitrates)
- Download playlists or multiple links at once
- Choose save location
- View download history with thumbnails
- Display download progress, speed, ETA, and file size
- Beautiful animations and transitions
- Responsive design for all screen sizes

## Requirements

- [Node.js](https://nodejs.org/) (v14 or higher)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (must be installed and available in PATH)
- [ffmpeg](https://ffmpeg.org/) (optional, for audio conversion)

## Installation

1. Clone this repository
1. Install dependencies:

```bash
npm install
```

1. Make sure yt-dlp is installed and available in your PATH
1. Run the setup script to configure the new UI:

```bash
node setup-new-ui.js
```

1. Run the app:

```bash
npm start
```

## Development

To run the app in development mode with hot reload:

```bash
npm run dev
```

## Build

To build the app for your platform:

```bash
npm run build
```

For specific platforms:

```bash
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## Technologies Used

- Electron
- JavaScript
- HTML/CSS
- Tailwind CSS
- DaisyUI
- GSAP (GreenSock Animation Platform)
- yt-dlp (backend)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Screenshots

![image](https://github.com/user-attachments/assets/b9f4ae7a-d433-4176-8396-ab76d47762b5)
![image](https://github.com/user-attachments/assets/9a2101ff-ecd8-4009-a391-4c6f6653940e)
![image](https://github.com/user-attachments/assets/ea6995a2-ac68-4d80-8892-338a72c43121)


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
