# Tam Quốc Loạn Nhập

Bốn hoàng đế xuyên không về năm 200 tranh thiên hạ với Tào Tháo, Lưu Bị, Tôn Quyền. Mô phỏng theo lượt trong một thế giới 3D Three.js, làm ra để xem và quay clip: mỗi lượt kể rõ ai nghĩ gì, làm gì, và trọng tài phán ra sao.

> **Trạng thái (2026-09-24):** engine luật chơi mới đã xong và có test. Giao diện và thế giới 3D đang chờ chủ dự án chọn phương án design ([canvas duyệt](https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV)). Trang đang phát hành vẫn là bản Phase 1 cũ. Chi tiết: [`docs/status.md`](docs/status.md).

## Bảy thế lực

| Quân chủ | Thế lực | Màu | Lối chơi | Điểm yếu lịch sử |
| --- | --- | --- | --- | --- |
| Tần Thủy Hoàng | Nhà Tần | Đen–vàng | Pháp trị, xây thành, đánh mạnh | Dân tâm tự giảm |
| Lý Thế Dân | Nhà Đường | Lam | Kỵ binh, dùng người tài | Bóng ma Huyền Vũ Môn |
| Chu Nguyên Chương | Nhà Minh | Đỏ thẫm | Du kích, vệ sở, mưu kế | Thanh trừng công thần |
| Lưu Triệt (Hán Vũ Đế) | Tây Hán | Tím | Viễn chinh, ngoại giao | Hao quốc khố, cuối đời mê tín |
| Tào Tháo | Tào Ngụy | Xanh rêu | Đồn điền, cầu hiền, gian hùng | Dễ trúng phản gián |
| Lưu Bị | Thục Hán | Xanh lá | Nhân nghĩa, thu phục lòng người | Báo thù cảm tính |
| Tôn Quyền | Đông Ngô | Cam | Thủy quân, giữ Trường Giang | Yếu khi đánh lên phương Bắc |

Mỗi lượt mỗi phe chọn một trong năm việc: **Tấn công, Ngoại giao, Nội chính, Mưu kế, Củng cố**, kèm một câu thoại đúng giọng. Trọng tài tính kết quả theo năm chỉ số **Binh, Lương, Đất, Dân, Uy**. Luật chi tiết: [`docs/product/rules.md`](docs/product/rules.md).

## Chạy

Cần Node 18 trở lên.

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm start            # http://localhost:3000 (đừng mở file:// trực tiếp)
npm test             # test engine và dữ liệu
npm run sim -- 500   # chạy 500 ván tự động, xem thế lực nào hay thắng
```

Server có `POST /api/turn` để chạy một lượt phía server (hiện dùng agent MOCK). Đây là chỗ sẽ cắm agent LLM sau này.

## Cấu trúc

```text
index.html        entry (GitHub Pages)
src/engine/       luật chơi, chạy cả trình duyệt lẫn Node
data/             bản đồ, thế lực, số liệu cân bằng, giọng nhân vật
server/           server local + /api/turn
tests/            test engine, báo cáo cân bằng, QA trình duyệt
docs/             brief, luật, hướng design, kiến trúc, trạng thái, quyết định
```

Dùng AI agent (Claude Code, Codex) để làm dự án: đọc [`AGENTS.md`](AGENTS.md) trước.

## Bản quyền

Mã nguồn phát triển nội bộ. Asset và giấy phép: [`assets/SOURCE.md`](assets/SOURCE.md). Ảnh Civilization và Total War trong `docs/design/references/` chỉ để tham khảo hướng nghệ thuật, không phát hành cùng game.
