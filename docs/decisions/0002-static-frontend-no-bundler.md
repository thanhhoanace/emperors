# 0002 — Frontend tĩnh nhiều file, không bundler, three.js r146 bản global

**Trạng thái:** Chấp nhận · 2026-09-24 · Thay cho ràng buộc "1 file index.html + Tailwind CDN" của kịch bản gốc

## Bối cảnh

Kịch bản gốc yêu cầu một file `index.html`, Tailwind CDN, không build. Bản đồ 3D cũ đã phình tới khoảng 3.000 dòng trong một file, khó sửa và không test được. Site phát hành trên GitHub Pages (tĩnh). Commit `ab70543` phải chuyển từ import map ES module về bản three.js global cổ điển để chạy ổn trên host tĩnh công khai.

## Quyết định

- Vẫn không bundler, không bước build: `index.html` nạp các script cổ điển trong `src/` theo thứ tự.
- three.js **r146** bản global (`build/three.min.js`, `examples/js/...`) từ jsdelivr. r146 là một trong những bản cuối còn có `examples/js`.
- Không dùng Tailwind: CSS viết tay, vì UI theo hướng design riêng và cần ít phụ thuộc.
- Engine là UMD để test được bằng Node.

## Hệ quả

- Có thể tách module mà vẫn deploy thẳng repo lên Pages.
- Với r146 phải đặt `THREE.ColorManagement.legacyMode = false` và dùng `outputEncoding` (API cũ).
- Nâng three.js lên bản ES module sau này là một ADR riêng (import map hoặc bundler).
