# Security review — 15/09/2026

Phạm vi: source, routes, schema, PDF/image pipeline, session, ZIP. Đây là review nội bộ có automated regression tests; không phải pentest độc lập. Trạng thái: **NOT READY FOR CONTROLLED PILOT** cho đến khi hoàn tất các mục chưa xác minh ở dưới. Website xuất bản riêng tư để chủ sở hữu đánh giá.

| Hạng mục / rủi ro | Mức độ nếu khai thác | Kịch bản | Bảo vệ hiện tại / sửa | Việc còn lại |
|---|---|---|---|---|
| Authentication bypass | Critical | Giả isAdmin hoặc cookie | Server lookup token hash; không cờ client | Smoke test HTTPS |
| Authorization bypass | Critical | Gọi API không qua giao diện | Mỗi API admin yêu cầu session | Đã regression test |
| IDOR | High | Đoán ID để tải/xóa | Session trước query; UUID không thay auth | Đã test anonymous GET/DELETE |
| Password exposure | Critical | Đọc JS tìm password | Chỉ hash secret phía server; không bundle client | Kiểm tra output build |
| Environment exposure | Critical | Đẩy .env lên Git | .env ignored; example không secret | Giữ secret khỏi log |
| Session theft/fixation | High | Cố định/replay token | Random 256-bit; hash D1; Secure/HttpOnly/Strict; expiry; logout revoke | HTTPS browser NOT VERIFIED |
| Brute force | High | Thử nhiều password | 5 attempts/IP/15 phút, bcrypt; generic error | Chống distributed brute force cần WAF |
| Upload validation bypass | High | Bỏ client checks | Server validation tất cả input | Đã test |
| Fake extension | High | .jpg chứa PDF | Signature + extension must match | Đã test |
| Fake MIME | High | Khai loại không đúng | MIME nếu có phải khớp signature | Đã test |
| Malformed/encrypted PDF | High | Parser error/crash | Parser strict, reject error/password, không lưu thành công | Encrypted fixture NOT VERIFIED |
| Active PDF payload | High | JS/actions/embedded files | Decode object names; reject dangerous structures; sandbox viewer | Không tương đương antivirus |
| Malicious images | High | Hỏng stream, decode bomb | Header dimensions trước decode, CRC PNG, decoder limit | Fuzz corpus NOT VERIFIED |
| Oversized upload | High | Bỏ Content-Length gửi stream dài | Stream byte cap + mỗi file + tổng; không tin browser | Concurrency stress NOT VERIFIED |
| Too many files/pages | Medium | 1.000 ảnh / quá 100 trang | 20 files, 100 pages enforced server | Đã test |
| Path traversal | High | ../../ qua tên | Tên validate; key UUID server; không path input | Đã test |
| Filename injection | High | CRLF trong Content-Disposition | Reject tên bất thường, RFC 5987 encode | Đã test Unicode |
| SQL injection | Critical | Chèn SQL tên/filter/sort/IDs | Prepared bindings; sort allowlist | Đã có automated query regression |
| XSS | High | Script trong họ tên/file | React escaped text, validate name, no innerHTML | Browser malicious filename NOT VERIFIED |
| CSRF | High | Trang lạ submit/delete/login | Exact Origin trên POST/DELETE, Strict cookie | Đã test |
| Storage exposure | Critical | Liệt kê public bucket | R2 chỉ server binding; không public URL/API list | Hạ tầng thật smoke test |
| Unauthorized download | High | GET file trực tiếp | Session, ready status, no-store | Đã test |
| Unauthorized delete | High | DELETE trực tiếp | Session + Origin + soft-delete | Đã test |
| Unauthorized bulk download | Critical | Tải ZIP toàn trường | Session + required group filter | Đã test |
| ZIP collision/traversal | High | Trùng tên mất bài / ../ | Sanitize name, UUID suffix, streams | Đã test 25 duplicate names |
| Information leakage | Medium | Error hiển thị stack/key | Generic server errors; no storage key in receipt/list | Quan sát logs vận hành |
| Resource exhaustion | High — OPEN for public intake | PDF nén nhỏ giải nén lớn, nhiều request đồng thời | File/page/pixel caps, lease, rate limit giảm rủi ro | Chưa chứng minh memory/CPU worst-case. Cần isolated PDF service / scanner và stress test trước public |
| Data recovery | High — OPEN operational gate | Mất DB, lỗi R2, xóa nhầm | Processing→ready, retries; soft-delete | Backup/restore rehearsal chưa chạy |

## Các lỗi đã sửa và regression
- exifr namespace import không hoạt động ở Node: dùng default import.
- pdf-lib nhận Buffer có byteOffset gây SOI not found: chuyển sang Uint8Array độc lập.
- Bỏ annotation có thể làm mất nét viết: từ chối PDF có annotation, hướng dẫn xuất phẳng.
- Không quét PDF bằng string toàn bộ stream: duyệt PDFDict/PDFArray và decode tên đối tượng.
- Chống double submit bằng ref ngoài trạng thái React; WebMCP không sửa form khi đang gửi.
- Đếm byte thực của password để tránh bcrypt cắt mật khẩu UTF-8 >72 byte.
- Reject retry cùng ID nhưng khác thông tin, kể cả bài processing.

Không có Critical được xác nhận qua các tests hiện tại. **Không khẳng định High=0**: rủi ro resource exhaustion và phục hồi còn mở. Không public link cho học sinh trước khi đóng các gate; nếu cần public intake lớn, chuyển PDF job sang container worker có bộ nhớ/CPU giới hạn, queue, antivirus, storage staging, job state và retry.

- Runtime regression: thay pngjs Node bằng pngjs/browser.js để decode PNG trong Cloudflare Worker; test JPG + PDF + PNG đã PASS trên workerd.
