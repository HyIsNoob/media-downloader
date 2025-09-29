<!-- markdownlint-disable MD024 -->
# Media Downloader v1.2.0 - Quality & Ultra Remux Update

Phiên bản 1.2.0 tập trung vào hai nhóm mục tiêu chính: (1) đảm bảo chất lượng file tải về đạt hoặc vượt ứng dụng cũ; (2) cải thiện độ tin cậy & hiển thị thông tin (progress, metadata, thumbnail). Thêm chế độ Ultra Remux để nhận MP4 chất lượng tối đa.

## Download

[Download Media Downloader v1.2.0 for Windows](https://github.com/HyIsNoob/media-downloader/releases/download/v1.2.0/Media.Downloader.Setup.1.2.0.exe)

## What's New

### Added

- Ultra Remux MP4 setting (ép remux best video + best audio sang MP4).
- Tuỳ chọn chất lượng: Best (Any Codec) & Best (MP4) song song.
- Nút Save Thumbnail độ phân giải cao.
- Completion modal (Open File / Open Folder / Copy Path).
- Prefer Modern Codecs (AV1/VP9) toggle (mặc định bật) – ưu tiên AV1/VP9 + Opus, merge sang MKV khi cần.

### Improved

- Logic chọn định dạng ưu tiên bitrate thực, tránh mất chất lượng do ép container sớm.
- Parser progress hỗ trợ output carriage return nên không còn 0 KB/s / 0:00.
- Fallback metadata ngày & lượt xem (timestamp, iso, release_date, upload_date…).
- Chọn độ phân giải không còn khóa cứng vào MP4 – remux sau nếu cần.
- Date parsing nhận diện epoch numeric, ISO, YYYYMMDD.
- Tooltip giải thích nên dùng Ultra Remux hay Prefer Modern Codecs trong Settings.

### Fixed

- Date hiển thị Unknown dù có timestamp/ISO trong dữ liệu.
- Progress speed/ETA = 0 vì không parse được dòng cập nhật inline.

### Technical

- Multi-pattern progress regex + tách dòng \n / \r.
- Hợp nhất xử lý bestvideo+bestaudio với fallback an toàn.
- Setting `ultraRemuxMp4` lưu electron-store và apply tại main.

## When To Use Ultra Remux

- Bật nếu cần MP4 tương thích rộng và chất lượng tối đa (có thể lớn hơn do remux/copy từ webm/av1).
- Tắt nếu muốn giữ nguyên codec/container gốc (AV1/VP9 + Opus) và không cần MP4.
- Prefer Modern Codecs (ON) + Ultra (OFF) = cân bằng tốt nhất cho chất lượng/size.

## Upgrade Notes

- File có thể lớn hơn so với 1.1.0 vì chọn track bitrate cao hơn.
- Muốn tương tự 1.1.0 nhưng vẫn tốt: tắt Ultra, chọn Best (MP4) hoặc Best (Any Codec).

## Installation

1. Tải installer (link trên).
2. Chạy file .exe và làm theo wizard.
3. (Tuỳ chọn) Bật auto update yt-dlp trong Settings để luôn mới.

## Requirements

- Windows 7/8/10/11 (64-bit)
- 4GB RAM tối thiểu
- 200MB dung lượng trống
- Kết nối Internet

Xem đầy đủ thay đổi tại [CHANGELOG.md](https://github.com/HyIsNoob/media-downloader/blob/main/CHANGELOG.md).

---

## Media Downloader v1.1.0 - Modern UI Update

[Download Media Downloader v1.1.0 for Windows](https://github.com/HyIsNoob/media-downloader/releases/download/v1.1.0/Media.Downloader.Setup.1.1.0.exe)

### Highlights

- Modern UI, Tailwind + DaisyUI
- Notification system nâng cấp, animations (GSAP)
- Dark/Light mode, tooltip (Tippy.js)
- Thêm fallback metadata & nhiều độ phân giải (144p → 8K)

### Requirements (v1.1.0)

- Windows 7/8/10/11 (64-bit)
- 4GB RAM minimum
- 200MB disk
- Internet connection

For more historical details see CHANGELOG.
