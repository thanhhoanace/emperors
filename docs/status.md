# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-24 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Chủ dự án chọn phương án design** trên canvas https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV (trang "Vòng 2 · Hiện thực"). Đề xuất: A (Chiến dịch Thiên Hạ) + cắt cảnh trận của C + khung sa bàn của B cho mở đầu/kết thúc. Chưa code frontend mới trước khi có quyết định.

## Đã xong (phiên 2026-09-24)

- Dọn repo: bỏ state công cụ agent (`.omc/`, `.omx/`), zip rỗng, gitlink hỏng; gom dữ liệu về `data/`, test về `tests/`, ảnh tham chiếu về `docs/design/references/`, server cũ về `server/`.
- SOT mới cho Claude và Codex: `AGENTS.md` (chính), `CLAUDE.md` (import), `docs/` phân vai rõ, ADR trong `docs/decisions/`, skills `verify` và `handoff`.
- Engine luật chơi mới theo kịch bản gốc: `src/engine/engine.js` (thuần, tất định theo seed, chạy được cả trình duyệt lẫn Node), dữ liệu `data/world.json`, giọng nhân vật tiếng Việt trong `data/personas/`. Sửa lỗi dữ liệu cũ: Chu Nguyên Chương và Lưu Triệt bị Tào Tháo/Lưu Bị ghi đè nên khởi đầu không có châu nào.
- `server/server.js` thu gọn: static + `POST /api/turn` (MOCK, dùng chung engine). Bỏ mô phỏng real-time WebSocket cũ vì không khớp kịch bản theo lượt.
- 7 test engine; `npm run sim` để đo cân bằng; QA trình duyệt cũ chạy lại được offline; CI chạy thêm `npm test`, deploy chỉ file runtime.
- Design: vòng 1 (stylized, 3 hướng) rồi vòng 2 (hiện thực: TW3K + Civ VI + Ryan, 3 hướng), render thật bằng three.js, đưa lên canvas. Mã cảnh ở `docs/design/prototypes/`.

## Việc tiếp theo (theo thứ tự)

1. Nhận quyết định design → ghi vào `docs/decisions/0004-visual-direction.md` và `docs/design/direction.md`.
2. Dựng frontend mới theo `docs/architecture.md` (phần "Dự kiến"): tách `prototypes/real.html` thành `src/world/*`, thêm `src/ui/*`, `src/main.js`; thay `index.html`.
3. Viết lại `tests/e2e/` cho luồng mới: bấm "Lượt tiếp theo" → đủ 7 phe hành động → nhật ký có mục mới → số liệu đổi → không lỗi console.
4. Cân bằng lại (xem "Vấn đề đã biết").
5. Tuỳ chọn: agent LLM thật qua `server/` (thay `decide`), chân dung nhân vật cho UI.

## Vấn đề đã biết

- **Cân bằng** (`npm run sim -- 500`, 2026-09-24): Tôn Quyền 28,4% · Chu Nguyên Chương 19,6% · Lưu Bị 18,8% · Lưu Triệt 12,4% · Lý Thế Dân 10,0% · Tần Thủy Hoàng 7,8% · Tào Tháo 3,0%. Chỉ 20,6% ván kết thúc bằng thống nhất; còn lại hết 48 lượt thì "xưng bá". Mục tiêu: thống nhất nhiều hơn, ván 25–40 lượt, Tào Tháo không quá yếu.
- `index.html` vẫn là Phase 1 slice cũ (click Tương Dương → Thành Đô → End Turn); chưa dùng engine mới.
- Prototype tải texture từ `raw.githubusercontent.com` (repo three.js, MIT); cần asset có giấy phép riêng trước khi phát hành.
- Asset Kenney trong `assets/` là của bản đồ cũ, frontend mới chưa dùng.
- Luồng thread Codex cũ (`codex://threads/…`) và bản phân tích Boris/Thariq không truy cập được từ môi trường cloud; cấu trúc SOT dựa trên hướng dẫn công khai của họ (xem `decisions/0001`).
