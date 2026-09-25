# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Chủ dự án duyệt bản đồ chiến dịch vòng 4** trên canvas https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV (trang "Vòng 4 · Bản đồ TW3K + nhẹ cho web") và ngân sách hiệu năng `decisions/0005` (Đề xuất). Hướng design đã chốt: A + cắt cảnh trận của C (`decisions/0004`). Thành trì vòng 3 đã được duyệt.

## Đã xong

- 2026-09-25 (vòng 4):
  - Chủ dự án duyệt thành trì vòng 3, hỏi về độ nặng khi lên web, và cho rằng bản đồ chưa tới TW3K.
  - Đo prototype cũ: 55 triệu tam giác/khung, gần 5.000 lệnh vẽ, 80–100 MB.
  - Dựng lại bản đồ trong `docs/design/prototypes/map.html` + `terrain.js` + `flora.js`: địa lý Trung Hoa (Hoàng Hà chữ 几, Tam Hiệp, Bột Hải, Tứ Xuyên, Tây Tạng, Trường Thành), sông uốn khúc, rừng một lớp tán, đường tìm lối, làng, sương thung lũng, biên giới, chế độ chiến lược, mùa thu.
  - Thêm LOD cho `city.js` (`full`/`lite` + gộp lượt vẽ).
  - Sau khi làm: toàn cảnh 160 lệnh vẽ, 1,3 triệu tam giác, 24 MB; tải về khoảng 200 KB, không có texture ngoài.
  - Ghi ADR 0005 và đưa 5 ảnh lên canvas.
- 2026-09-25: ghi quyết định A + C2. Dựng lại thành trì chi tiết cao trong `docs/design/prototypes/city.js`: mái cong có ngói và normal map, lầu mái chồng, tường gạch vát có lỗ châu mai và ụ nhô, cổng vòm, ủng thành, tứ hợp viện kín theo khu phố, cung điện nền ba cấp, chợ, nhà ngoại thành. Thêm SSAO, bỏ tilt-shift, cầu gỗ qua sông, dời 5 thành khỏi lòng sông (`data/world.json` → `geo`). Render cận thành, lượt chiến dịch, cảnh cắt trận; đưa lên canvas.
- 2026-09-24: dọn repo và dựng SOT cho Claude + Codex; engine luật chơi mới + 7 test + `npm run sim`; server thu gọn với `/api/turn`; design vòng 1 (stylized) và vòng 2 (hiện thực).

## Việc tiếp theo (theo thứ tự)

1. Nhận phản hồi về bản đồ vòng 4; sửa tiếp nếu cần (`node docs/design/prototypes/render.mjs map campaign`).
2. Dựng app thật theo A (`docs/architecture.md`, phần "Dự kiến"):
   - tách `prototypes/map.html`, `terrain.js`, `flora.js`, `city.js` thành `src/world/*`;
   - thêm `tools/bake-map.mjs` để nướng địa hình lúc build;
   - `quality.js` với 3 mức chất lượng;
   - `src/ui/*` theo UI thủy mặc;
   - `src/main.js` diễn lượt từ event của engine;
   - `battle.js` cho cảnh cắt trận;
   - thay `index.html`.
3. Quân trên bản đồ: một tướng cưỡi ngựa cỡ lớn kèm cờ (như TW3K). Cảnh cắt trận: mô hình người, ngựa có hoạt ảnh.
4. Viết lại `tests/e2e/` cho luồng mới.
5. Cân bằng lại; tuỳ chọn agent LLM qua `server/`; chân dung nhân vật.

## Vấn đề đã biết

- **Cân bằng** (`npm run sim -- 500`, 2026-09-24; chưa đổi luật từ đó): Tôn Quyền 28,4% · Chu Nguyên Chương 19,6% · Lưu Bị 18,8% · Lưu Triệt 12,4% · Lý Thế Dân 10,0% · Tần Thủy Hoàng 7,8% · Tào Tháo 3,0%. Chỉ 20,6% ván kết thúc bằng thống nhất; còn lại hết 48 lượt thì "xưng bá". Mục tiêu: thống nhất nhiều hơn, ván 25–40 lượt, Tào Tháo không quá yếu.
- `index.html` vẫn là Phase 1 slice cũ (click Tương Dương → Thành Đô → End Turn); chưa dùng engine mới.
- Prototype tải texture từ `raw.githubusercontent.com` (repo three.js, MIT); cần asset có giấy phép riêng trước khi phát hành.
- Asset Kenney trong `assets/` là của bản đồ cũ, frontend mới chưa dùng.
- Hiệu năng: đã nằm trong ngân sách về lệnh vẽ và tam giác (`decisions/0005`), nhưng chưa đo FPS trên máy có GPU hay điện thoại. Dựng địa hình lúc mở trang mất 5–8 giây trong container, cần nướng sẵn.
- Prototype còn giữ chỗ: lính là khối hộp, huy hiệu là chữ Hán thay cho chân dung, rìa thảo nguyên phía bắc còn trống.
- `real.html` (vòng 2–3) tải texture từ raw.githubusercontent.com. Chromium headless trong container chặn chứng chỉ nguồn này, nên các ảnh cũ thiếu vân cỏ và vân nước. `map.html` không bị ảnh hưởng.
- Luồng thread Codex cũ (`codex://threads/…`) và bản phân tích Boris/Thariq không truy cập được từ môi trường cloud; cấu trúc SOT dựa trên hướng dẫn công khai của họ (xem `decisions/0001`).
