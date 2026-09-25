# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Chủ dự án duyệt thành trì vòng 3** trên canvas https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV (trang "Vòng 3 · Thành trì"). Hướng design đã chốt: A + cắt cảnh trận của C (`decisions/0004`).

## Đã xong

- 2026-09-25: ghi quyết định A + C2. Dựng lại thành trì chi tiết cao trong `docs/design/prototypes/city.js`: mái cong có ngói và normal map, lầu mái chồng, tường gạch vát có lỗ châu mai và ụ nhô, cổng vòm, ủng thành, tứ hợp viện kín theo khu phố, cung điện nền ba cấp, chợ, nhà ngoại thành. Thêm SSAO, bỏ tilt-shift, cầu gỗ qua sông, dời 5 thành khỏi lòng sông (`data/world.json` → `geo`). Render cận thành, lượt chiến dịch, cảnh cắt trận; đưa lên canvas.
- 2026-09-24: dọn repo và dựng SOT cho Claude + Codex; engine luật chơi mới + 7 test + `npm run sim`; server thu gọn với `/api/turn`; design vòng 1 (stylized) và vòng 2 (hiện thực).

## Việc tiếp theo (theo thứ tự)

1. Nhận phản hồi về thành trì vòng 3; sửa tiếp nếu cần (render bằng `node docs/design/prototypes/render.mjs real city`).
2. Dựng app thật theo A (`docs/architecture.md`, phần "Dự kiến"): tách `prototypes/real.html` + `city.js` thành `src/world/*`, thêm LOD cho thành xa, `src/ui/*` theo UI thủy mặc, `src/main.js` diễn lượt từ event của engine, `battle.js` cho cảnh cắt trận; thay `index.html`.
3. Thay lính khối hộp bằng mô hình người/ngựa có hoạt ảnh (ưu tiên cảnh cắt trận); cây có texture tán lá.
4. Viết lại `tests/e2e/` cho luồng mới.
5. Cân bằng lại; tuỳ chọn agent LLM qua `server/`; chân dung nhân vật.

## Vấn đề đã biết

- **Cân bằng** (`npm run sim -- 500`, 2026-09-24; chưa đổi luật từ đó): Tôn Quyền 28,4% · Chu Nguyên Chương 19,6% · Lưu Bị 18,8% · Lưu Triệt 12,4% · Lý Thế Dân 10,0% · Tần Thủy Hoàng 7,8% · Tào Tháo 3,0%. Chỉ 20,6% ván kết thúc bằng thống nhất; còn lại hết 48 lượt thì "xưng bá". Mục tiêu: thống nhất nhiều hơn, ván 25–40 lượt, Tào Tháo không quá yếu.
- `index.html` vẫn là Phase 1 slice cũ (click Tương Dương → Thành Đô → End Turn); chưa dùng engine mới.
- Prototype tải texture từ `raw.githubusercontent.com` (repo three.js, MIT); cần asset có giấy phép riêng trước khi phát hành.
- Asset Kenney trong `assets/` là của bản đồ cũ, frontend mới chưa dùng.
- Hiệu năng: góc toàn cảnh vẽ đủ 14 thành chi tiết làm WebGL phần mềm (SwiftShader) mất context ở dpr 1.5. App thật cần LOD và đo FPS trên máy có GPU.
- Prototype còn giữ chỗ: lính là khối hộp, cây hơi hoạt hình, huy hiệu là chữ Hán thay cho chân dung.
- Luồng thread Codex cũ (`codex://threads/…`) và bản phân tích Boris/Thariq không truy cập được từ môi trường cloud; cấu trúc SOT dựa trên hướng dẫn công khai của họ (xem `decisions/0001`).
