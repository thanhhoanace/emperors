@AGENTS.md

## Riêng cho Claude Code

- Toàn bộ quy tắc dự án nằm trong `AGENTS.md` ở trên; file này chỉ thêm phần riêng của Claude, để Claude và Codex không bao giờ đọc hai bộ luật khác nhau.
- Skills: `.claude/skills/verify`, `.claude/skills/handoff`. Quyền dùng chung (các lệnh đọc và test chạy không cần hỏi) nằm ở `.claude/settings.json`; cấu hình riêng máy để trong `.claude/settings.local.json` (không commit).
- Việc lớn (đổi hướng visual, đổi kiến trúc, đổi luật cốt lõi): lên kế hoạch trước và chờ chủ dự án duyệt.
- Design cần duyệt: dựng trên canvas Design artifact kèm ảnh render thật từ `docs/design/prototypes/`, không code thẳng vào `index.html`.
