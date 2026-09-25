# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Visual vòng 7, thế giới thu 219** (Claude): canvas trang "Vòng 7" (https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV) chờ chủ dự án xem: sáu thành mới, Lạc Dương – Trường An hồi sinh một phần, Tam Đài ở Nghiệp, Quan Vũ vây Tương Dương, đất hoang không chủ.
- **Nhập engine** (kịch bản đã OK): `219.json` + đình chiến khách + cải cách + gates + **menu ngoại giao** (`docs/product/diplomacy.md`) + event `attack` đủ `from`/`to` cho hành quân (`docs/product/march.md`).

## Đã xong

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
3. Khi nhập 219 vào `world.json` (luồng luật): `lonlat` của sáu thủ phủ mới đang nằm trong `data/cities.json` (Claude giữ tạm vì chưa có chỗ khác). Chép sang `world.json`, rồi báo Claude xoá bản trong `cities.json` và đổi khoá `liang` thành `guan` (Trường An; hiện `alias` trỏ `guan` về `liang` để test năm 200 vẫn qua).
4. Claude: bản đồ toàn quốc theo phương án đã chốt (bake Albers, chia ô, mặt nạ nướng sẵn, nhãn cửa Hán, bản đồ tranh khi thu nhỏ).
5. Claude: tướng đi đường theo event `attack` (`march.md`).
6. Persona thoại cho deal và cửa Trường An / Nghiệp / Hoài.

## Vấn đề đã biết

- Engine vẫn năm 200 / 14 châu. Sim cũ không dùng cho 219.
- `219.json` trên repo đang là bản rút; bảng châu đầy đủ nằm ở `scenario.md`.
- `world.html` đã là thế giới 219 nhưng vẫn trên bản đồ vòng 5 (phép chiếu phẳng, lưới mịn tới 101°E): toàn cảnh lộ mép bản đồ; Hà Tây, Điền Trì sát mép.
- Chưa dựng được: nước lụt sông Hán quanh Phàn Thành (thu 219), doanh trại vây. Cần kiểu đối tượng mới.
- Hình dạng Thiên Thủy, Nam Trịnh, Cô Tang là đoán (chưa có số đo khảo cổ); Điền Trì, Chung Ly, Giang Lăng có di chỉ.
- Hiệu năng vòng 5 (`decisions/0005`):
  - tải về khoảng 3 MB chưa nén HTTP (độ cao 2 MB), vượt trần lần đầu, cần chia ô tải dần;
  - dựng mặt nạ lúc mở trang mất khoảng 13 giây trong container;
  - chưa đo FPS trên máy thật.
- `index.html` vẫn là Phase 1 slice cũ.
