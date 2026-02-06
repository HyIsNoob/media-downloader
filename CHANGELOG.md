<!-- markdownlint-disable MD024 -->
# Changelog

All notable changes to Media Downloader will be documented in this file.

## [1.3.0] - 2026-02-06

### Added

- **Download Queue**: Hàng đợi tải với Pause, Resume, Cancel. Tab Queue quản lý danh sách, nút Pause/Resume toàn bộ, Cancel hoặc Remove từng item.
- **Add to queue**: Trang Home có nút "Add to queue" bên cạnh Download; Playlist có nút Queue từng video và "Add selected to queue".
- **Pause/Cancel khi tải đơn (Home)**: Trong lúc tải từ Home, có nút "Pause (add to queue)" và "Cancel" ngay trên card tiến trình.

### Improved

- **YouTube Playlist**: Tải toàn bộ/đã chọn với chất lượng giống tải đơn (best-mp4, res-720, audio-320...), lưu vào thư mục con theo tên playlist, tên file dạng `01 - Title.mp4`.
- **UI/UX**: Trang Home (ô URL + nút Get Info) layout ổn định; empty states Queue/History rõ ràng; queue status badge màu (Pending, Downloading, Paused, Done, Failed); focus accessibility; nút bấm có feedback.
- **Placeholder/thumbnail**: Dùng placeholder SVG inline, không phụ thuộc file; fallback YouTube hqdefault khi maxresdefault 404; sửa lỗi trùng khai báo PLACEHOLDER_IMAGE.
- **Clipboard**: Không log NotAllowedError khi document không focus.
- **Open Folder**: Nút "Open Folder" sau khi tải xong gọi đúng API, mở đúng thư mục chứa file.
- **Auto update yt-dlp**: Kiểm tra và cập nhật yt-dlp khi mở app (theo setting).

### Fixed

- ReferenceError `originalButtonText` / `originalText` (scope trong try/finally) ở video-info.js và playlist-handler.js.
- Lỗi placeholder.png ERR_FILE_NOT_FOUND (dùng data URI và window.PLACEHOLDER_IMAGE).

---

## [1.2.0] - 2025-09-29

### Added

- Ultra Remux MP4 setting: bật tùy chọn để luôn remux best video + best audio sang MP4 (chất lượng cao nhất, tương thích rộng).
- Best (Any Codec) & Best (MP4) song song – cho phép chọn linh hoạt giữa chất lượng tối đa và tương thích.
- Nút lưu Thumbnail chất lượng cao ngay trong giao diện thông tin video.
- Completion modal hiện đại với các nút Open File / Open Folder / Copy Path.
- Prefer Modern Codecs (AV1/VP9) toggle (mặc định bật) – ưu tiên codec mới + Opus và merge sang MKV khi cần.

### Improved

- Lựa chọn định dạng: logic chọn stream ưu tiên bitrate cao nhất thực sự (không ép MP4 nếu không cần) và remux khi bật Ultra.
- Fallback metadata: hiển thị chính xác ngày (date) và lượt xem (views) từ nhiều nguồn (timestamp, release_date, vv.).
- Hiển thị tiến trình tải: parser mới đọc được nhiều kiểu output (\r cập nhật inline, iB/MiB pattern) -> tốc độ & ETA không còn bị 0.
- Chọn độ phân giải res-X không còn giới hạn ext=mp4; vẫn remux nếu cần để giữ chất lượng.
- Cải thiện nhận diện bitrate tổng hợp (tbr) cho so sánh chất lượng giữa các tuỳ chọn.
- Thêm tooltip giải thích khi nào nên bật Ultra Remux hay Prefer Modern Codecs.

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

