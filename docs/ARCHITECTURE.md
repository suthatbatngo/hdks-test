# Kiến trúc cổng nộp bài Lớp 8–9

## Lựa chọn
React + TypeScript, App Router trên Vinext (API tương thích Next.js) để chạy trong Sites/Cloudflare Workers. D1 lưu metadata và session; R2 riêng tư lưu PDF. Đây là backend thật, không dùng localStorage làm database. pdf-lib gộp PDF, jpeg-js + pngjs đọc/chuẩn hóa ảnh, exifr đọc chiều xoay, fflate xuất ZIP theo luồng. Bcrypt xác thực quản trị trên server.

Sites có bộ nhớ 128 MB mỗi isolate; vì vậy giới hạn ban đầu 20 tệp, 5 MB/tệp, tổng 12 MB, 100 trang, 8 MP/ảnh. Cấu hình chung client/server tại `lib/shared.ts`. Không nâng lên 100 MB chỉ bằng sửa số: cần dịch vụ xử lý riêng, queue và kiểm thử tải.

## Luồng và độ bền
POST multipart → kiểm tra Origin/rate/giới hạn byte → validate họ tên, enum và file signature → lease xử lý PDF → decode, hướng ảnh và gộp → insert metadata processing → put R2 → update ready → receipt. Chỉ trả thành công sau khi cả R2 và D1 hoàn tất.

UUID cho từng bài, storage key không dùng tên. Mỗi lần nộp mới có request UUID mới; retry cùng UUID trả lại receipt để tránh tạo bài trùng sau mất mạng. Khi lỗi R2 hoặc D1, không báo thành công; giữ dòng processing để retry phục hồi. Cần giám sát dòng processing tồn lâu; chưa có background reconciler. Không âm thầm xóa dữ liệu sau lỗi database.

Xóa là soft-delete. Cả list, download và ZIP chỉ đọc status=ready. R2 giữ nguyên để phục hồi; chưa có tự động purge. Quyết định lịch lưu giữ và purge trước khi mở rộng sử dụng.

## PDF
Xử lý từng tệp theo thứ tự học sinh chọn. Ảnh được decode, áp dụng EXIF 1–8, ghép nền trắng cho alpha, encode JPEG chất lượng 95 và căn vừa A4, không kéo méo. PDF được kiểm tra parser, mật khẩu, số trang và cấu trúc có active action/embedded content. PDF có annotation bị từ chối với hướng dẫn xuất PDF phẳng, tránh mất nét viết khi loại annotation. PDF không chữ ký/không annotation được sao chép trang sang PDF mới; không bảo toàn chữ ký số, bookmarks và metadata gốc. Đây không phải dịch vụ chống mã độc chuyên dụng.

## Quản trị
/admin/login dùng ADMIN_PASSWORD_HASH; token session ngẫu nhiên 256-bit, chỉ lưu SHA-256 của token trong D1. Cookie __Host-admin, Secure, HttpOnly, SameSite=Strict, 8 giờ. Mỗi API admin tự kiểm tra session; trang /admin cũng kiểm tra server. Đăng xuất xóa session phía server. Xóa session hiện tại khi login để chống fixation.

ZIP chỉ admin, bắt buộc lớp + ngày học, query tham số hóa, selected IDs vẫn giao với filter. ZIP lưu từng PDF không nén lại; đọc R2 theo luồng, không gom cả ZIP vào RAM. Trùng tên thêm UUID vào tên sau, không bỏ tệp. Giới hạn 1.000 bài / 1 GB và 200 IDs chọn. Stream lỗi sẽ hủy download, không bỏ qua tệp mất.

## Cấu trúc
- app/page.tsx: form, chọn/sắp xếp/preview tệp, upload, receipt.
- app/admin/: login, trang bảo vệ và dashboard.
- app/api/submissions/: upload.
- app/api/admin/: login/logout, list, file GET/DELETE, bulk GET.
- lib/shared.ts: enum, validation, limits, tên và giờ Việt Nam.
- lib/server.ts: auth, request limits, Origin, rate, D1/R2 helpers.
- lib/pipeline.ts: file signature, image/PDF conversion.
- lib/queries.ts và lib/zip.ts: filter và streaming ZIP.
- db/schema.ts, drizzle/: schema và migrations.
- tests/: kiểm thử logic + API với SQLite thật, R2 mock.
- docs/: kiến trúc, audit, kiểm thử và vận hành.

## Giới hạn cần xác minh
Browser end-to-end và WebMCP chưa xác minh do môi trường preview không truy cập được. Mock R2 không chứng minh cloud latency, quota, durability hoặc rollback. Cần smoke test HTTPS thật, session cookie, tải/view, upload ảnh điện thoại và ZIP lớn. Chưa bảo đảm chống PDF decompression bomb/CPU exhaustion; cần cô lập xử lý và malware scanning trước khi tiếp nhận file từ công chúng không tin cậy. Shared-IP rate limit có thể ảnh hưởng học sinh chung mạng; đồng thời một lease xử lý có thể gây phải bấm thử lại.
