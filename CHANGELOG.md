<!-- markdownlint-disable MD024 -->
# Changelog

All notable changes to Media Downloader will be documented in this file.

## [1.2.0] - 2025-09-29

### Added

- Ultra Remux MP4 setting: bật tùy chọn để luôn remux best video + best audio sang MP4 (chất lượng cao nhất, tương thích rộng).
- Best (Any Codec) & Best (MP4) song song – cho phép chọn linh hoạt giữa chất lượng tối đa và tương thích.
- Nút lưu Thumbnail chất lượng cao ngay trong giao diện thông tin video.
- Completion modal hiện đại với các nút Open File / Open Folder / Copy Path.

### Improved

- Lựa chọn định dạng: logic chọn stream ưu tiên bitrate cao nhất thực sự (không ép MP4 nếu không cần) và remux khi bật Ultra.
- Fallback metadata: hiển thị chính xác ngày (date) và lượt xem (views) từ nhiều nguồn (timestamp, release_date, vv.).
- Hiển thị tiến trình tải: parser mới đọc được nhiều kiểu output (\r cập nhật inline, iB/MiB pattern) -> tốc độ & ETA không còn bị 0.
- Chọn độ phân giải res-X không còn giới hạn ext=mp4; vẫn remux nếu cần để giữ chất lượng.
- Cải thiện nhận diện bitrate tổng hợp (tbr) cho so sánh chất lượng giữa các tuỳ chọn.

### Fixed

- Trường hợp date không hiển thị dù dữ liệu tồn tại ở dạng timestamp/ISO.
- Tiến trình hiển thị 0 KB/s và 0:00 do không bắt được dòng cập nhật kiểu mới.

### Technical

- Thêm setting `ultraRemuxMp4` lưu vào store và áp dụng tự động trong logic download.
- Parser tiến trình tách theo cả \n và \r, nhiều biểu thức regex phù hợp phiên bản yt-dlp mới.
- Hợp nhất xử lý chọn bestvideo+bestaudio với fallback an toàn.

### Notes

- File tải về có thể lớn hơn so với phiên bản cũ nếu bật Ultra Remux (đây là chủ đích để đạt chất lượng tối đa).
- Nếu muốn giữ nguyên container gốc (không remux) hãy tắt Ultra và chọn "Best (Any Codec)".

## [1.1.0] - 2025-05-18

### Fixed

- Notification display format issue that caused improper rendering
- Video information displaying "unknown" values when data is available in other fields
- Settings not applying immediately (especially auto-detect URLs feature)
- Download history layout showing two items per row (now shows one item per row)

### Improved

- Enhanced notification system with better formatting and animations
- Better fallback options for video metadata (title, channel, duration, date, views)
- Improved thumbnail selection algorithm to get the best quality image
- More accurate file size estimation for video and audio formats
- Clipboard detection system now updates in real-time when settings change
- Date formatting with support for multiple date field formats
- Support for more video resolutions (144p to 8K) when available

### Removed

- Unnecessary debug API button and related functionality

## [1.0.3] - 2025-05-10

### Added

- Modern UI with responsive design
- Dark/light mode with seamless switching
- Format selection cards for different quality options
- Download history with thumbnails and file details

### Fixed

- Various UI layout issues
- Performance improvements

## [1.0.2] - 2025-05-05

### Added

- Support for TikTok and Facebook downloads
- Basic video information display
- Download progress indicator

### Fixed

- Download path selection issues
- Error handling improvements

## [1.0.1] - 2025-05-01

### Added

- Basic YouTube download functionality
- Video and audio format options
- Simple UI

## [1.0.0] - 2025-04-28

### Added

- Initial release
- Basic downloader functionality
 - Basic downloader functionality

