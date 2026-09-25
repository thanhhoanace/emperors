# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Chủ dự án duyệt vòng 5** trên canvas (địa hình thật + thành Đông Hán): `decisions/0005`, `0006`.
- **Claude / visual:** map toàn quốc và mật độ chi tiết theo `docs/product/proposal-all-china.md` (cách C). Kịch bản luật **không** chờ 30–35 châu có chủ.
- **Nhập snapshot 219 vào engine** khi chủ dự án bảo làm luật: `data/scenario/219.json` → `data/world.json` + `src/engine/engine.js` + `docs/product/rules.md` + test, rồi `npm run sim -- 500`.

## Đã xong

- 2026-09-25 (kịch bản):
  - Chủ dự án chốt: thu 219, 3 khối Tào–Thục–Ngô nguyên, 4 đế ở rìa/khe, 20 châu, Civ nhẹ. Không năm 200 xé đất, không quận TW3K.
  - SOT: `docs/product/scenario.md`, ADR `0007`, dữ liệu nháp `data/scenario/219.json` (engine chưa đọc).
  - Bốn chỗ lệch năm 200 trong `history.md` không còn blocker kịch bản.
- 2026-09-25 (vòng 5–4 và SOT repo): địa hình thật, thành Đông Hán, engine 14 châu năm 200 vẫn đang chạy.

## Việc tiếp theo (theo thứ tự)

1. Visual: phản hồi vòng 5; nếu đổi năm dựng thành sang 219 thì Lạc Dương / Trường An không còn là phế tích 190.
2. Khi được bảo nhập luật: wire `219.json`, đình chiến khách, cải cách, gate events; sửa `unifyProvinces`; đo sim.
3. Nướng mặt nạ + chia ô (`bake-map.mjs`) — việc hình.
4. App thật gắn engine (`docs/architecture.md`, phần Dự kiến).
5. Persona: thêm thoại cho cửa Trường An / Nghiệp / Hoài.

## Vấn đề đã biết

- Engine và `data/world.json` vẫn là năm 200, 14 châu, đế ngồi Lương/Tịnh/Từ/Ích. Sim cũ: Tôn 28,4% · Chu 19,6% · Lưu Bị 18,8% · Lưu Triệt 12,4% · Lý 10,0% · Tần 7,8% · Tào 3,0%. Snapshot 219 trả lõi cho Tào — phải đo lại, không dùng số này.
- `index.html` vẫn Phase 1 slice cũ.
- `proposal-all-china.md` mục 5 (Tần giữ Quan Trung, năm 200) **lệch** so với kịch bản khóa; lấy địa thế / lợi thế riêng, không lấy chỗ ngồi đó.
- Các vấn đề hình / ngân sách / texture CDN: giữ như trước (`decisions/0005`).
