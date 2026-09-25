# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Visual vòng 5 và bản đồ toàn quốc** (Claude):
  - Canvas vòng 5 đã đưa lên (https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV): địa hình thật, thành theo khảo cổ; ADR 0005, 0006.
  - Trang "Vòng 6" của canvas: kịch bản 219 vẽ trên bản đồ toàn quốc (`docs/design/proposal-all-china.jpg`) và bảng cải cách 3 tầng chép từ `scenario.md`.
  - Phần *hình* của `docs/product/proposal-all-china.md` còn chờ chủ dự án chọn:
    - phạm vi: biên giới nay hay thế giới nhà Hán;
    - tỉ lệ A, B hay C;
    - phép chiếu Albers;
    - chia ô, nướng mặt nạ, bản đồ tranh khi thu nhỏ.
  - Phần xuất phát và lợi thế trong proposal đã được thay bằng kịch bản 219 (ADR 0007).
- **Nhập engine** (kịch bản đã OK): `219.json` + đình chiến khách + cải cách + gates + **menu ngoại giao** (`docs/product/diplomacy.md`) + event `attack` đủ `from`/`to` cho hành quân (`docs/product/march.md`).

## Đã xong

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
3. Claude, bản đồ và thành cho năm 219:
   - châu mới (Quan Trung tách khỏi Lương, Lũng Tây, Hà Tây, Hoài, Hán Trung, Kinh Nam, Nam Trung);
   - Lạc Dương và Trường An năm 219 không còn là phế tích 190–195;
   - Kiến Nghiệp dáng 212 trở thành đúng niên đại;
   - Hạ Khẩu là thành của Tôn Quyền;
   - `cities.json` thêm Thiên Thủy, Cô Tang, Chung Ly, Nam Trịnh, Giang Lăng, Điền Trì.
4. Claude: bản đồ toàn quốc theo phương án được chọn (bake Albers, chia ô, mặt nạ nướng sẵn).
5. Claude: tướng đi đường theo event `attack` (`march.md`).
6. Persona thoại cho deal và cửa Trường An / Nghiệp / Hoài.

## Vấn đề đã biết

- Engine vẫn năm 200 / 14 châu. Sim cũ không dùng cho 219.
- `219.json` trên repo đang là bản rút; bảng châu đầy đủ nằm ở `scenario.md`.
- Prototype `world.html` và `cities.json` vẫn dựng thế giới năm 200 (14 châu; Lạc Dương, Trường An là phế tích).
- Hiệu năng vòng 5 (`decisions/0005`):
  - tải về khoảng 2,4 MB, vượt trần lần đầu, cần chia ô tải dần;
  - dựng mặt nạ lúc mở trang mất khoảng 13 giây trong container;
  - chưa đo FPS trên máy thật.
- `index.html` vẫn là Phase 1 slice cũ.
