# 0003 — Engine thuần dùng chung; agent MOCK; server chỉ là seam

**Trạng thái:** Chấp nhận · 2026-09-24

## Bối cảnh

Kịch bản gốc: mỗi lượt các agent (LLM) quyết định, LLM làm trọng tài, có chế độ MOCK chạy không cần API key. Code cũ có hai engine khác nhau (`scripts/server.js` và `scripts/simulation.js`), mô phỏng real-time bằng WebSocket, frontend không dùng tới, và dữ liệu khởi đầu bị ghi đè sai. GitHub Pages không chạy được server.

## Quyết định

- Một engine duy nhất `src/engine/engine.js`: thuần, tất định theo seed, chạy cả trình duyệt lẫn Node.
- Trọng tài là luật tất định cộng ngẫu nhiên có kiểm soát (không để 1.000 quân hạ được thành 10.000 quân); LLM không làm trọng tài, để kết quả nhất quán và test được.
- Agent MOCK (`decide`) chọn hành động theo trọng số tính cách, bẻ theo tình huống; câu thoại lấy từ persona.
- `server/server.js` chỉ phục vụ file tĩnh và `POST /api/turn`: chỗ cắm agent LLM sau này, cùng dạng quyết định.

## Hệ quả

- Game chạy hoàn toàn trên Pages.
- Muốn thêm LLM: thay `decide` ở server (prompt trong `personas/*.json` → `llm.decision_prompt`), giữ nguyên `resolveTurn`.
- Cân bằng đo bằng `npm run sim`.
