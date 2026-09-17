# KHAI SANG ACADEMY — Website nộp và giao bài tập

Mã nguồn đầy đủ cho lớp **8, 9, 10**, tách khỏi môi trường ChatGPT Sites để triển khai bằng tài khoản Cloudflare riêng và lưu trên GitHub.

Có giao diện thương hiệu KSA, nộp ảnh/PDF và gộp PDF, đăng nhập giáo viên, lọc/xem/tải/xóa bài, tải ZIP, giao và xem bài tập PDF/ảnh theo lớp. Giữ các giới hạn upload hiện có; bài giao tối đa 5 MB/tệp, mỗi lớp một tệp hiện tại.

**GitHub chứa mã nguồn. GitHub Pages không chạy backend này.** Website chạy trên Cloudflare Workers + D1 + R2. Bản này không chứa dữ liệu học sinh, mật khẩu thật hoặc bản sao dữ liệu Site cũ. Triển khai sẽ tạo một website mới, dữ liệu ban đầu trống.

## 1. Chuẩn bị

- Cài Node.js 22.13 trở lên và Git.
- Có tài khoản GitHub và Cloudflare; bật R2 trong Cloudflare (có thể yêu cầu thông tin thanh toán). Kiểm tra hạn mức/chi phí trong tài khoản.
- Mở terminal tại thư mục chứa `package.json`:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm exec wrangler login
```

## 2. Tạo database và nơi lưu tệp

```sh
pnpm exec wrangler d1 create khai-sang-db
pnpm exec wrangler r2 bucket create khai-sang-files
```

Mở `wrangler.json`, thay `database_id` gồm các số 0 bằng ID thật từ lệnh tạo D1. Nếu đổi tên database/bucket thì sửa tên tương ứng. Giữ nguyên binding `DB` và `BUCKET`. Không bật public access cho R2.

```sh
pnpm db:remote
```

Lệnh này áp dụng hai migration trong `drizzle/`, tạo bảng bài nộp, phiên đăng nhập, giới hạn lượt gửi và bài tập theo lớp. Wrangler theo dõi migration đã chạy. Không dùng lại database sản xuất của Site cũ với quy trình tạo mới này.

## 3. Đặt mật khẩu giáo viên và triển khai lần đầu

```sh
pnpm admin:hash
```

Nhập mật khẩu muốn dùng, từ 12 đến 72 byte. Lệnh in `ADMIN_PASSWORD_HASH=...`. Chỉ sao chép phần hash sau dấu `=`.

```sh
pnpm exec wrangler secret put ADMIN_PASSWORD_HASH
```

Dán hash khi được hỏi (không dán mật khẩu, không dán tiền tố `ADMIN_PASSWORD_HASH=`). Nếu được hỏi tạo Worker mới, đồng ý tạo Worker tên `khai-sang-academy`.

```sh
pnpm typecheck
pnpm test
pnpm deploy
```

Mở URL HTTPS mà Wrangler trả về. Học sinh dùng `/`; giáo viên vào `/admin/login`. Bản ngoài Sites không có cổng riêng tư ChatGPT; trang học sinh sẽ truy cập được công khai sau triển khai. Quản trị vẫn bắt buộc mật khẩu.

## 4. Đưa mã lên GitHub

Tạo repository trống trong GitHub. Trong thư mục mã nguồn chạy:

```sh
git init
git add .
git commit -m "Add KSA homework website"
git branch -M main
git remote add origin https://github.com/TEN-CUA-BAN/khai-sang-academy.git
git push -u origin main
```

Thay `TEN-CUA-BAN` bằng tài khoản của bạn. Không tải riêng file ZIP vào repository: cần giải nén và đưa các file bên trong lên, để `package.json` nằm ở thư mục gốc. Dùng Git sẽ đưa cả `.github/workflows/deploy.yml` lên đúng vị trí.

Trong GitHub → repository → Settings → Secrets and variables → Actions, thêm:

| Secret | Giá trị |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Account ID trong Cloudflare |
| `CLOUDFLARE_API_TOKEN` | Token dành cho tài khoản triển khai, có quyền Workers Scripts Edit, D1 Edit và Workers R2 Storage Edit |

Không đưa token vào file code. Mật khẩu/hash giáo viên đặt ở Cloudflare như bước 3, không cần đặt trong GitHub.

Workflow `.github/workflows/deploy.yml` chạy khi push vào `main`, hoặc vào Actions → Deploy KSA to Cloudflare → Run workflow. Workflow cài dependencies, kiểm tra TypeScript, chạy test, build, áp dụng migration rồi deploy. Nếu lần push đầu chưa có secrets, bổ sung secrets rồi chạy lại workflow.

## 5. Chạy thử tại máy

Sao chép `.dev.vars.example` thành `.dev.vars`, điền hash bcrypt trong dấu ngoặc kép.

```sh
pnpm db:local
pnpm dev
```

Để kiểm thử cookie quản trị Secure qua HTTPS:

```sh
pnpm build
pnpm preview:https
```

Chấp nhận chứng chỉ localhost khi trình duyệt hỏi. DB/R2 cục bộ tách biệt với dữ liệu trực tuyến. Không bỏ cờ Secure trong code.

## 6. Giao bài đầu tiên

1. Vào `/admin/login`, nhập mật khẩu đã đặt.
2. Tìm **Quản lý bài tập tuần này**, chọn lớp 8/9/10.
3. Chọn PDF/JPG/PNG và bấm **Lưu bài tập**.
4. Trở lại trang học sinh, chọn đúng lớp và bấm **Xem bài tập về nhà**.
5. Thử nộp một bài, xem/tải PDF và tải ZIP trong trang giáo viên.

Tệp mới thay thế bài đang giao của lớp đã chọn. Bài đã xóa sẽ không còn được học sinh xem. PDF có nút mở riêng nếu thiết bị không hiển thị bản nhúng.

## Những file phục vụ triển khai GitHub

- `wrangler.json`: tên Worker, database, bucket và migration.
- `vite.config.ts`: cấu hình Vinext/Cloudflare độc lập.
- `.github/workflows/deploy.yml`: triển khai tự động.
- `.dev.vars.example`: mẫu secret phát triển cục bộ.
- `.gitignore`: loại mật khẩu, dữ liệu cục bộ, dependencies và build.
- `package.json`: các lệnh build, deploy, database và kiểm thử.

Các tài liệu audit/test cũ trong `docs/` là hồ sơ của bản Sites. Khi triển khai độc lập, dùng README này làm hướng dẫn chính. Cần xác nhận tải bài, PDF trên điện thoại và sao lưu D1/R2 trên tài khoản mới trước khi sử dụng chính thức. Đổi hash không tự thu hồi phiên đang đăng nhập; khi cần đăng xuất toàn bộ, xóa các hàng trong bảng `sessions` bằng công cụ quản trị D1.

Tài liệu nhà cung cấp: https://developers.cloudflare.com/workers/vite-plugin/get-started/
