# Hướng dẫn tạo Installer cho Media Downloader

## Các bước cần thực hiện

### 1. Tải yt-dlp và ffmpeg

Trước khi build, tải các file sau đặt vào thư mục `resources/bin/`:

- **yt-dlp.exe**: Tải từ https://github.com/yt-dlp/yt-dlp/releases
- **ffmpeg.exe**: Tải từ https://ffmpeg.org/download.html (chọn bản Static)

### 2. Cập nhật phiên bản

Trước mỗi lần phát hành phiên bản mới, cập nhật số version trong `package.json`:

```json
{
  "version": "1.0.1",
  ...
}
```

### 3. Build installer

Để tạo installer cho Windows, chạy lệnh:

```
npm run build:win
```

Installer sẽ được tạo trong thư mục `dist`.

### 4. Phát hành cập nhật

Khi có phiên bản mới:

1. Cập nhật version trong `package.json`
2. Commit và push thay đổi lên GitHub
3. Chạy lệnh để build và phát hành:

```
npm run release
```

4. Trong GitHub, tạo một release mới với tag phiên bản tương ứng và đính kèm file installer

## Lưu ý

- Đảm bảo thay đổi `YOUR_GITHUB_USERNAME` trong `package.json` thành tên người dùng GitHub của bạn
- Nếu repository là private, bạn cần cài đặt token cho GitHub trong biến môi trường `GH_TOKEN`
- Phiên bản (tag) trong GitHub Release phải khớp với version trong package.json
