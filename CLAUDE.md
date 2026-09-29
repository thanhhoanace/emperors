@AGENTS.md

## Riêng cho Claude Code

- Toàn bộ quy tắc dự án nằm trong `AGENTS.md` ở trên; file này chỉ thêm phần riêng của Claude, để Claude và Codex không bao giờ đọc hai bộ luật khác nhau.
- Skills: `.claude/skills/verify`, `.claude/skills/handoff`. Quyền dùng chung (các lệnh đọc và test chạy không cần hỏi) nằm ở `.claude/settings.json`; cấu hình riêng máy để trong `.claude/settings.local.json` (không commit).
- Việc lớn (đổi hướng visual, đổi kiến trúc, đổi luật cốt lõi): lên kế hoạch trước và chờ chủ dự án duyệt.
- Design cần duyệt: dựng trên canvas Design artifact kèm ảnh render thật từ `docs/design/prototypes/`, không code thẳng vào `index.html`.
- Model của subagent: Claude chọn cho từng lần gọi (tham số `model` của Agent); không đặt `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` (nó khóa lựa chọn). Không truyền `model` thì subagent chạy model của phiên chính, nên luôn truyền.
  - `haiku`: tra cứu, tìm file, đọc log, việc một bước.
  - `sonnet` (mặc định): code theo hợp đồng đã rõ (module theo spec, test, sửa lỗi đã tái hiện), đo và chụp ảnh, research dài.
  - `opus`: thiết kế, kiến trúc, việc đụng nhiều module hay luật cốt lõi, review chéo, phán đoán hình; và khi `sonnet` trượt hai lần cùng một việc.
  - `fable`: chỉ khi chủ dự án đồng ý (một số gói tính vào usage credits).
  - Advisor (`/advisor`, `advisorModel`): tắt mặc định; mỗi lần gọi nó đọc lại cả hội thoại không cache, phiên dài rất tốn. Bật khi chủ dự án yêu cầu.
  - Báo cáo cho chủ dự án ghi subagent nào chạy model nào.
