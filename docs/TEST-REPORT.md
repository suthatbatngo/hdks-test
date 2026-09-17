# Báo cáo kiểm thử

## Automated tests
`pnpm test` chạy 19 test groups bằng Node test runner. Các API handlers thực được chạy với SQLite engine thật trong bộ nhớ, mô phỏng giao diện D1 và R2. Không seed production.

Đã PASS: họ tên/Unicode/enums; PDF đơn/nhiều/nhiều trang; ảnh portrait/landscape/PNG alpha/ảnh dài/ảnh 1.92 MP; JPEG extension và EXIF thực; 8 orientation mappings; mixed order; fake extension/MIME; corrupt file; active PDF; annotation rejection; giới hạn file/count/page/pixels/total; login/cookie/logout/brute-force/authorization/CSRF; upload→store→download; idempotency/duplicate names/delete; failure recovery; ZIP fixture 25/20/30, selected, collision, đọc từng PDF; PDF hợp lệ khoảng 4 MB; SQL injection filters và IDs.

Các lỗi giả lập storage/database cố ý tạo log `Request failed Error`; test vẫn phải khẳng định status=503 và retry phục hồi, không được coi log này là lỗi test không mong đợi.

## Kiểm thử Worker đã build

`node tests/worker-smoke.mjs` PASS trên Miniflare/workerd với D1 và R2 giả lập của Cloudflare: render trang chính; chặn anonymous API; login; nộp JPG + PDF + PNG; lưu và tải; kiểm tra thứ tự 3 trang; ZIP streaming; xóa và chặn tải bài đã xóa. Đây là bản Worker đã build, không chỉ mock route handler. PNG được sửa sang pngjs/browser.js sau khi bản Node dùng zlib không chạy trong Worker. Không đồng nghĩa đã kiểm tra hạ tầng production từ Internet.

## Build và TypeScript
Build Worker thành công; TypeScript --noEmit thành công. Source cuối sau chỉnh sửa cần chạy lại nếu thay đổi code.

## Chưa xác minh / NOT VERIFIED
- Trình duyệt desktop/mobile và 200% text; preview báo không truy cập được. Không có screenshot QA đạt.
- WebMCP: có feature detection, schema validation và dùng cùng state form; chưa gọi trong browser hỗ trợ.
- HTTPS thực: cookie trình duyệt, PDF viewer, upload bằng điện thoại.
- PDF mã hóa thực; file hỏng chỉ kiểm thử các fixture đã định nghĩa, không phải toàn bộ fuzz corpus.
- PDF lớn hợp lệ sát 5 MB, ảnh sát 8 MP, ZIP sát 1 GB / 1.000 bài trong production.
- Cloud quota, đa request, malformed compressed PDF worst-case và antivirus.
- Backup/restore D1+R2 và retention production.

Đừng chuyển kết quả mock thành tuyên bố đã kiểm tra đầy đủ production. Xem SECURITY-AUDIT.md và PRE-LAUNCH.md trước dùng với học sinh.
