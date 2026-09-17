# Giao bài tập Vật lý theo lớp — hướng dẫn tích hợp và sử dụng

## Công nghệ và cách lưu

Frontend React 19 + TypeScript, App Router trên Vinext; CSS hiện có. Backend API chạy trên Cloudflare Workers. D1 (SQLite) lưu thông tin, R2 lưu tệp thật. Không cần Firebase hoặc dependency mới.

Mỗi lớp 8, 9, 10 có một bài tập hiện tại: một PDF hoặc một ảnh JPG/JPEG/PNG. PDF có thể nhiều trang. Bài giữ nguyên cho đến khi giáo viên thay hoặc xóa, không tự hết hạn vào cuối tuần. Giới hạn 5 MB/tệp, 100 trang PDF, ảnh 8 MP; tái sử dụng kiểm tra tệp hiện có. PDF được kiểm tra và xuất lại bằng pdf-lib; ảnh được kiểm tra giải mã trước khi lưu.

D1: bảng homework, khóa chính grade; id phiên bản, tên tệp, MIME, thời gian, dung lượng và khóa R2. R2: homework/GRADE_x/<UUID>/assignment.*. Khi thay bài, ghi tệp mới trước, sau đó cập nhật D1 bằng kiểm tra phiên bản. Nếu ghi thất bại, bài hiện tại giữ nguyên. Khi thành công, xóa tệp R2 cũ; nếu dọn R2 thất bại, tệp cũ không còn được API công khai tham chiếu. Khi xóa, bản ghi bị gỡ trước rồi dọn tệp. Không công khai bucket hay khóa lưu trữ.

## Các file mới — copy toàn bộ file vào đúng đường dẫn

| File | Chức năng |
|---|---|
| app/homework.tsx | HomeworkPanel: xem PDF/ảnh, trạng thái rỗng/lỗi, upload/thay/xóa; HomeworkManager: chọn lớp trong khu giáo viên |
| lib/homework.ts | Kiểm tra lớp, truy vấn metadata, tạo URL xem tệp không lộ khóa R2 |
| app/api/homework/[grade]/route.ts | GET bài hiện tại; POST upload/thay; DELETE xóa theo phiên bản |
| app/api/homework/[grade]/file/route.ts | Stream byte từ R2 cho trình xem PDF/ảnh |
| drizzle/0001_eminent_killer_shrike.sql | Migration tạo bảng homework |
| drizzle/meta/0001_snapshot.json | Snapshot Drizzle tương ứng |
| docs/HOMEWORK-GUIDE.md | Hướng dẫn này |

## Các file sửa — vị trí thay đổi

| File | Vị trí |
|---|---|
| app/page.tsx | Import HomeworkPanel; chèn ngay sau RadioGroup chọn lớp, trước Ngày học; key={grade} để xóa kết quả lớp trước khi đổi lớp |
| app/admin/dashboard.tsx | Import HomeworkManager; chèn trước khối stats |
| app/globals.css | Thêm nhóm .homework-* ở cuối, dùng màu/nút/panel hiện có |
| db/schema.ts | Thêm export homework ở cuối; đồng bộ enum submissions có GRADE_10 |
| drizzle/meta/_journal.json | Thêm entry 0001, giữ entry 0000 |
| tests/runtime.ts | Reset bảng homework, hỗ trợ R2.delete và lỗi D1 giả lập trong test |
| tests/suite.ts | Test auth, cô lập lớp, PDF/PNG/JPEG, thay/xóa, xung đột, CSRF, lỗi D1/R2 |
| tests/worker-smoke.mjs | Kiểm thử bài tập trên bản Worker đã build với D1/R2 của Miniflare |

Source ZIP đi kèm có code hoàn chỉnh của tất cả file; giải nén để chạy độc lập hoặc copy các file trong bảng vào source v5. Không sửa migration 0000 đã chạy. Không ghi đè secrets hoặc dữ liệu của hệ thống đang chạy.

## API

- GET /api/homework/GRADE_8 → { homework: null } hoặc metadata + url.
- GET /api/homework/GRADE_8/file?v=<id> → PDF/ảnh inline, đọc trực tiếp từ R2.
- POST /api/homework/GRADE_8 → multipart/form-data gồm file và expectedId (rỗng nếu chưa có bài).
- DELETE /api/homework/GRADE_8?id=<id> → xóa đúng phiên bản hiện tại.
- Thay GRADE_8 bằng GRADE_9 hoặc GRADE_10 cho các lớp khác.
- GET không cần phiên giáo viên; quyền truy cập Site bên ngoài vẫn theo cấu hình Sites hiện tại. POST/DELETE cần cookie giáo viên hiện có và kiểm tra cùng origin. Không đưa mật khẩu lên frontend. API bài nộp học sinh vẫn yêu cầu giáo viên để đọc.
- 400: tệp/lớp sai; 401: cần đăng nhập; 403: origin sai; 409: phiên bản đã thay đổi, hãy Tải lại; 413: request quá lớn; 503: chưa lưu/đọc được, thử lại.

## Chạy kiểm thử trên máy lập trình viên

Dùng Node >=22.13 (khuyến nghị Node 22 bản cập nhật mới) và phiên bản pnpm trong package.json.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
node tests/worker-smoke.mjs
```

Bộ test không sửa database production. `pnpm test` dùng SQLite trong bộ nhớ và bộ giả lập giao diện lưu trữ chỉ cho test. `worker-smoke.mjs` chạy chính Worker đã build với D1/R2 cục bộ của Miniflare; tự áp dụng các migration, đăng nhập bằng mật khẩu thử nghiệm, upload/xem/xóa tệp thật trong môi trường kiểm thử.

## Chạy thử giao diện cục bộ

Sau khi build, tạo file dist/server/.dev.vars chỉ trên máy local, đặt ADMIN_PASSWORD_HASH="<hash vừa tạo>" trong file này. Không commit file chứa secret. Tạo hash bằng `node scripts/hash-password.mjs`; không dùng mật khẩu production cho kiểm thử. D1/R2 cần binding DB và BUCKET; cấu hình được tạo trong dist/server/wrangler.json.

Áp dụng từng migration một lần cho database local mới:

```bash
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nosy_miss_america.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_eminent_killer_shrike.sql
pnpm exec wrangler dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --local-protocol https
```

Nếu database local đã có 0000, chỉ áp dụng 0001. Mở URL mà Wrangler in ra. Cookie giáo viên có Secure nên cần HTTPS. Không bỏ Secure hoặc HttpOnly. Với Sites, migration 0001 được áp dụng khi xuất bản; DB/BUCKET và secret hiện tại được giữ lại.

## Giáo viên upload bài đầu tiên

1. Mở Site → Dành cho giáo viên → đăng nhập bằng mật khẩu hiện tại.
2. Tại Quản lý bài tập tuần này, chọn Lớp 8, Lớp 9 hoặc Lớp 10.
3. Trong Tệp bài tập mới, chọn PDF/JPG/PNG → Lưu bài tập.
4. Chờ thông báo “Đã lưu bài tập. Học sinh có thể xem ngay.” và kiểm tra bản xem trước.
5. Muốn thay bài: chọn file mới rồi Lưu bài tập. Muốn bỏ bài: Xóa bài tập → xác nhận.
6. Lặp lại với lớp khác. Nếu có thông báo bài vừa thay đổi, bấm Tải lại trước khi thực hiện tiếp.

## Học sinh xem bài và kiểm tra sau xuất bản

1. Trang chủ → chọn lớp → Xem bài tập về nhà. Không cần điền họ tên hoặc chọn ngày học để xem.
2. PDF hiển thị trong khung xem của trình duyệt; ảnh hiển thị trực tiếp. Dùng Mở tệp bài tập nếu thiết bị không hỗ trợ PDF nhúng.
3. Đổi lớp rồi bấm xem lại để nhận đúng bài lớp mới; lớp chưa giao hiển thị “Hiện tại chưa có bài tập về nhà cho lớp này.”
4. Kiểm tra thủ công trên điện thoại và máy tính: upload PDF cho lớp 8, ảnh cho lớp 9, để trống lớp 10; xem từng lớp; thay bài lớp 8; xóa lớp 9 rồi xem lại. File đã tải về máy trước khi xóa không thể bị thu hồi.

## Phạm vi kiểm chứng

Kiểm tra TypeScript, bộ test API và smoke test Worker/D1/R2 trước khi phát hành. Việc hiển thị PDF nhúng phụ thuộc trình duyệt; cần kiểm tra trực quan trên thiết bị thực theo các bước trên. Source không chứa bài nộp học sinh, bài tập production hoặc mật khẩu production.
