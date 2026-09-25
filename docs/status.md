# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Chủ dự án duyệt vòng 5** trên canvas https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV (trang "Vòng 5 · Địa hình thật + thành Đông Hán"):
  - bản đồ theo địa hình thật và thành trì theo khảo cổ (`decisions/0006`);
  - ngân sách hiệu năng đã sửa (`decisions/0005`).
- **Bốn chỗ kịch bản lệch lịch sử cần chủ dự án quyết** (`docs/design/history.md`, mục cuối):
  - Kiến Nghiệp năm 200 chưa có;
  - Trường An thuộc Tư Lệ;
  - Hạ Khẩu là của Hoàng Tổ;
  - Nghiệp Thành là của Viên Thiệu.
- **Mạng của môi trường cloud** đang chặn dat.city, x.com, twdb.io, totalwar.fandom.com, static.wikia.nocookie.net, wikipedia.org, upload.wikimedia.org. Vì vậy chưa đọc được cách dat.city render và chưa xem được ảnh bản đồ TW3K. Chủ dự án mở các host này trong cài đặt môi trường (Network access), hoặc gửi ảnh chụp.

## Đã xong

- 2026-09-25 (vòng 5):
  - Phản hồi vòng 4: bản đồ chưa chuẩn và nhỏ hơn thực tế; thành chưa đúng lịch sử.
  - Bản đồ mới theo địa hình thật, 1 đơn vị = 3 km:
    - `tools/bake-map.mjs` nướng độ cao (AWS Terrain Tiles) và sông, hồ (Natural Earth) ra `assets/map/`;
    - địa lý sửa về năm 200 (Hoài Hà ra biển, thêm các sông nhỏ cạnh thành);
    - `data/world.json` đổi `geo` → `lonlat`.
  - Tra khảo cổ 14 thành, ghi vào `docs/design/history.md` (có nguồn) và `data/cities.json` (bố cục).
  - Dựng thành Đông Hán bằng `docs/design/prototypes/hancity.js`: tường đất nện, cổng đỉnh bằng, khuyết, mái thẳng, cung trên đài; Lạc Dương và Trường An là phế tích.
  - Cảnh `world.html` với 5 góc máy. Các cải tiến:
    - châu chia theo núi sông (Dijkstra);
    - sông né thành bằng cách uốn sang bên;
    - rìa bản đồ chìm vào mây;
    - dữ liệu độ cao nén còn khoảng 2 MB.
  - Thêm test dữ liệu cho `cities.json`. Ghi ADR 0006 và đưa ảnh lên canvas.

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

1. Nhận phản hồi vòng 5 và quyết định về bốn chỗ lệch lịch sử. Sửa tiếp nếu cần:
   - chạy `node docs/design/prototypes/render.mjs world <góc máy> 1 "c=<id>"`;
   - khi đổi `lonlat`, `cities.json` hay danh sách sông thì chạy `node tools/bake-map.mjs`.
2. Khi mạng được mở: đọc cách dat.city render; so ảnh bản đồ TW3K với vòng 5 (tỉ lệ, màu, rừng, cách vẽ thành xa).
3. Nướng luôn mặt nạ (rừng, ruộng, đường, biên, bóng) vào `tools/bake-map.mjs`, để lúc mở trang không phải tính khoảng 12 giây. Chia lưới mịn thành ô, tải dần.
4. Dựng app thật theo A trên thế giới vòng 5 (`docs/architecture.md`, phần "Dự kiến"):
   - `src/world/*` lấy từ `terrain.js`, `terrain-real.js`, `flora.js`, `hancity.js`;
   - thêm `quality.js`, `src/ui/*`, `src/main.js`, `battle.js`;
   - thay `index.html`.
5. Quân trên bản đồ: một tướng cưỡi ngựa cỡ lớn kèm cờ (như TW3K).
6. Việc sau:
   - bờ biển năm 200 và Vân Mộng Trạch;
   - viết lại `tests/e2e/`;
   - cân bằng lại;
   - agent LLM;
   - chân dung nhân vật.

## Vấn đề đã biết

- **Cân bằng** (`npm run sim -- 500`, 2026-09-24; chưa đổi luật từ đó): Tôn Quyền 28,4% · Chu Nguyên Chương 19,6% · Lưu Bị 18,8% · Lưu Triệt 12,4% · Lý Thế Dân 10,0% · Tần Thủy Hoàng 7,8% · Tào Tháo 3,0%. Chỉ 20,6% ván kết thúc bằng thống nhất; còn lại hết 48 lượt thì "xưng bá". Mục tiêu: thống nhất nhiều hơn, ván 25–40 lượt, Tào Tháo không quá yếu.
- `index.html` vẫn là Phase 1 slice cũ (click Tương Dương → Thành Đô → End Turn); chưa dùng engine mới.
- Prototype tải texture từ `raw.githubusercontent.com` (repo three.js, MIT); cần asset có giấy phép riêng trước khi phát hành.
- Asset Kenney trong `assets/` là của bản đồ cũ, frontend mới chưa dùng.
- Hiệu năng vòng 5 (số đo ở `decisions/0005`):
  - Lệnh vẽ trong ngân sách. Tam giác ở cận cảnh còn sát trần.
  - Tải về khoảng 2,4 MB, vượt ngân sách lần đầu; cần chia ô và tải dần.
  - Dựng mặt nạ lúc mở trang mất khoảng 12 giây trong container.
  - Chưa đo FPS trên máy có GPU hay điện thoại.
- Prototype còn giữ chỗ: lính là khối hộp, huy hiệu là chữ Hán thay cho chân dung, rìa thảo nguyên phía bắc còn trống.
- `real.html` (vòng 2–3) tải texture từ raw.githubusercontent.com. Chromium headless trong container chặn chứng chỉ nguồn này, nên các ảnh cũ thiếu vân cỏ và vân nước. `map.html` không bị ảnh hưởng.
- Luồng thread Codex cũ (`codex://threads/…`) và bản phân tích Boris/Thariq không truy cập được từ môi trường cloud; cấu trúc SOT dựa trên hướng dẫn công khai của họ (xem `decisions/0001`).
