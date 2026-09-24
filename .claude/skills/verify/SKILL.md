---
name: verify
description: Kiểm tra dự án Tam Quốc Loạn Nhập trước khi commit hoặc báo xong — test engine, cân bằng, QA trình duyệt và tự xem ảnh chụp. Dùng sau mọi thay đổi code, dữ liệu hoặc frontend.
---

# Verify

Chạy từ gốc repo. Dừng lại và sửa ngay khi một bước đỏ; không báo "xong" khi còn bước đỏ.

1. **Engine và dữ liệu**: `npm test`. Bắt buộc với mọi thay đổi.
2. **Cân bằng** (khi đụng `data/world.json` hoặc `src/engine/`): `npm run sim -- 500`. So với số trong `docs/status.md`; thay đổi lớn thì ghi số mới vào status.
3. **Trình duyệt** (khi đụng `index.html`, `src/world`, `src/ui`, `assets/`):
   - `npm start` (chạy nền), rồi `npm run qa` (Linux không màn hình: `xvfb-run -a npm run qa`).
   - Trong container: `PUPPETEER_EXECUTABLE_PATH=<chromium>`; WebGL chạy bằng SwiftShader.
   - Mở `test-results/*.png` và tự nhìn: màu không bạc, cây nhỏ hơn thành, không khối placeholder, nhãn không đè nhau, không có lỗi console.
4. **Design prototype** (khi đụng `docs/design/prototypes/`): `node docs/design/prototypes/render.mjs real campaign` rồi xem ảnh.
5. **Tự đọc lại diff**: có số nào bị chép vào docs không? Đổi luật thì `docs/product/rules.md` và test đã sửa cùng chưa? Có file state của công cụ agent lọt vào không?

Báo kết quả bằng số thật (bao nhiêu test pass, tỉ lệ thắng, ảnh nào đã xem), không nói chung chung.
