# 0001 — AGENTS.md là nguồn sự thật chung cho Claude và Codex

**Trạng thái:** Chấp nhận · 2026-09-24

## Bối cảnh

Repo có nhiều file "SOT" chồng chéo và lỗi thời: `README.md` mô tả tính năng chưa có (LLM agent, WebSocket), `HANDOFF.md` chứa đường dẫn máy macOS, `DESIGN-DOCUMENT.md` trộn kịch bản gốc với ghi chú visual đã cũ, và state của công cụ agent (`.omc/`, `.omx/`) bị commit. Chủ dự án dùng cả Claude Code lẫn Codex; hai công cụ đọc hai file khác nhau (`CLAUDE.md` và `AGENTS.md`).

## Quyết định

Theo hướng dẫn công khai của Boris Cherny và Thariq Shihipar (nhóm Claude Code):

- **Một file vào cửa, ngắn, commit vào git, cả nhóm dùng chung.** `AGENTS.md` là file chính; Codex đọc trực tiếp. `CLAUDE.md` chỉ `@AGENTS.md` cộng vài dòng riêng của Claude, nên hai công cụ không bao giờ lệch nhau.
- **Tiết lộ dần (progressive disclosure).** File vào cửa chỉ có bản đồ "câu hỏi → file nguồn", lệnh chạy, quy tắc, bài học. Chi tiết nằm trong `docs/`; quy trình lặp lại là skill (`.claude/skills/*/SKILL.md`), agent chỉ mở khi cần.
- **Hệ thống file là ngữ cảnh.** Thư mục và tên file tự mô tả (`data/`, `src/engine/`, `docs/product/`, `docs/design/`…) để agent tự tìm được bằng tìm kiếm.
- **Một sự thật, một chỗ.** Mỗi loại thông tin có đúng một file chủ (bảng trong `AGENTS.md`). Tài liệu dẫn link, không chép, và không chép số liệu từ `data/`.
- **Cho agent cách tự kiểm tra.** Lệnh test/QA nằm ngay trong `AGENTS.md`, cộng skill `verify`.
- **Bài học tích luỹ.** Mỗi lần agent làm sai, thêm một dòng vào mục "Bài học" để không lặp lại.
- Tách tài liệu *ổn định* (brief, rules, direction, architecture, ADR) khỏi tài liệu *sống* (`docs/status.md`, cập nhật mỗi phiên bằng skill `handoff`).

## Hệ quả

- Xoá `HANDOFF.md` và `DESIGN-DOCUMENT.md`; nội dung chuyển vào `docs/status.md`, `docs/product/brief.md`, `docs/design/direction.md`.
- `.omc/`, `.omx/`, `.codex/`, `.claude/settings.local.json` nằm trong `.gitignore`.
- Skill của Claude đặt ở `.claude/skills/`; `AGENTS.md` liệt kê đường dẫn để Codex đọc cùng nội dung như tài liệu thường.
- Bản phân tích Boris/Thariq trước đây nằm trong một thread Codex không truy cập được; nếu chủ dự án có bản đó, đối chiếu và sửa ADR này.
