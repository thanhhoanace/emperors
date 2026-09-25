# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Visual vòng 8, bản đồ toàn Trung Quốc** (Claude): canvas trang "Vòng 8" (https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV) chờ chủ dự án xem: Albers, tỉ lệ C, sương ngoài biên giới, nhãn cửa Hán, vùng biên là đất hoang.
- **Nhập engine** (kịch bản đã OK): `219.json` + đình chiến khách + cải cách + gates + **menu ngoại giao** (`docs/product/diplomacy.md`) + event `attack` đủ `from`/`to` cho hành quân (`docs/product/march.md`).

## Đã xong

- 2026-09-25 đêm (Claude, vòng 8):
  - Khớp engine 219: bake và `world.html` đọc thủ phủ, láng giềng, chủ đất từ `data/world.json`; `cities.json` khoá `guan`, bỏ alias; Giao theo nhà Sĩ; sửa `lonlat` Điền Trì (đang nằm giữa hồ) về di chỉ Hà Bạc Sở.
  - Bake toàn quốc Albers, tỉ lệ C: lõi Hán 42 ô (tải theo camera), lưới thô toàn quốc, mặt nạ đất toàn quốc, sương ngoài biên giới, nhãn cửa Hán. `tests/map.test.mjs` kiểm bake khớp `world.json`.
- 2026-09-25 tối (Claude, vòng 7):
  - Chủ dự án chốt phần hình vòng 6 (Trung Quốc ngày nay + nhãn cửa Hán, tỉ lệ C, Albers): ghi vào ADR 0006 (chuyển Chấp nhận) và `proposal-all-china.md`.
  - `world.html` dựng thu 219: 20 thủ phủ, chủ đất đọc từ `data/scenario/219.json`; thảo nguyên, sa mạc, Tây Tạng, Đài Loan là đất hoang không chủ.
  - `data/cities.json` theo năm 219 (nguồn `docs/research/cities219-*.md`, tóm tắt ở `docs/design/history.md`): sáu thủ phủ mới; Lạc Dương, Trường An hết phế tích nhưng cung Hán vẫn là nền cháy (đúng sử); Tam Đài ở Nghiệp; thuyền Quan Vũ ở Tương Dương.
  - `bake-map.mjs`: hồ Điền Trì lần theo DEM; nối các đoạn sông Hoài (Natural Earth ghi nhầm "Hudi"); sông Thạch Dương; ốc đảo Cô Tang, cát Đằng Cách Lý.
- 2026-09-25 chiều: chủ dự án chốt `scenario.md` ổn. Khóa ngoại giao kiểu chọn điều khoản (không chỉ pact) và hành quân là phần nhìn.
- 2026-09-25 (Claude, sau khi mở mạng):
  - Đọc toàn bộ mã dat.city; tra bản đồ TW3K và vùng biên năm 200 (`docs/research/`). Sửa ADR 0005 chỗ đoán sai về dat.city.
  - Đối chiếu lại 14 thành với Wikipedia, Commons, bài khảo cổ. Đã sửa `data/world.json` → `lonlat` (Hứa Xương lệch 8 km, Trường An, Kiến Nghiệp, Xương Ấp, Nghiệp Thành), `data/cities.json` và `docs/design/history.md`.
- 2026-09-25 sáng: kịch bản thu 219, 20 châu, đế rìa, ADR 0007.
- 2026-09-25 (Claude, vòng 5):
  - Bản đồ theo địa hình thật, 3 km/đơn vị: `tools/bake-map.mjs` → `assets/map/`.
  - Thành Đông Hán theo khảo cổ: `data/cities.json` + `docs/design/prototypes/hancity.js`.
  - Cảnh `world.html` 5 góc máy; châu chia theo núi sông; dữ liệu độ cao nén còn khoảng 2 MB.
  - Mọi cảnh trong trần tam giác của ADR 0005.
- 2026-09-25 (vòng 4): dựng lại bản đồ theo TW3K trong ngân sách web (`map.html`), ADR 0005.
- 2026-09-24: dọn repo, SOT cho Claude + Codex; engine mới + test + `npm run sim`; design vòng 1–3.

## Việc tiếp theo (theo thứ tự)

1. Nhập engine: snapshot 219 + diplomacy deals + guestTruce + reforms + gates. Cùng commit: `rules.md`, test, `npm run sim -- 500`.
2. Chế độ người chơi = 1 đế, 6 phe MOCK.
3. Claude: nướng sẵn mặt nạ lõi lúc bake (bớt khoảng 13 giây dựng lúc mở trang, đổi lấy khoảng 2–3 MB tải theo ô); bản đồ tranh khi thu nhỏ hết cỡ; hoa văn chi tiết cho vùng biên nếu chủ dự án muốn.
4. Claude: tướng đi đường theo event `attack` (`march.md`).
5. Persona thoại cho deal và cửa Trường An / Nghiệp / Hoài.

## Vấn đề đã biết

- Engine vẫn năm 200 / 14 châu. Sim cũ không dùng cho 219.
- `219.json` trên repo đang là bản rút; bảng châu đầy đủ nằm ở `scenario.md`.
- Vùng biên (ngoài lõi Hán) chỉ có lưới 6 km và mặt nạ đất 12 km: nhìn tầm trung thấy phẳng màu (trang "Vòng 8", ảnh Hà Tây – Tây Vực).
- Chưa dựng được: nước lụt sông Hán quanh Phàn Thành (thu 219), doanh trại vây. Cần kiểu đối tượng mới.
- Hình dạng Thiên Thủy, Nam Trịnh, Cô Tang là đoán (chưa có số đo khảo cổ); Điền Trì, Chung Ly, Giang Lăng có di chỉ.
- Hiệu năng vòng 5 (`decisions/0005`):
  - toàn cảnh tải khoảng 2 MB (độ cao 0,7 MB); cảnh gần tải thêm các ô lõi quanh camera;
  - dựng mặt nạ lúc mở trang mất khoảng 13 giây trong container;
  - chưa đo FPS trên máy thật.
- `index.html` vẫn là Phase 1 slice cũ.
