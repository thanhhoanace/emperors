# 0005 — Ngân sách hiệu năng web cho thế giới 3D

**Trạng thái:** Đề xuất · 2026-09-25 (chờ duyệt cùng bản đồ vòng 4)

## Bối cảnh

Chủ dự án hỏi: đưa lên web có nặng quá mà không tải được không, và vì sao dat.city của Ryan Sael tải nhẹ.

Đo trên prototype vòng 2–3 (`render.mjs` in số liệu, xem `docs/design/direction.md`):

| Cảnh | Lệnh vẽ | Tam giác/khung | Bộ đệm GPU |
| --- | --- | --- | --- |
| Toàn cảnh (14 thành chi tiết) | 4.834 | 55 triệu | 80 MB |
| Chiến dịch | 3.789 | 55 triệu | 102 MB |

Kết quả: GPU phần mềm sập ở góc toàn cảnh, còn máy thật sẽ giật. Tải về thì nhỏ; nặng là ở khối lượng GPU phải vẽ:

- 52.000 cây, mỗi cây 740 tam giác;
- 14 thành dựng đủ chi tiết cùng lúc;
- hơn 1.000 mesh cầu gỗ riêng lẻ;
- InstancedMesh của three r146 không loại theo khung nhìn, nên cả ngoài màn hình vẫn phải vẽ.

Về dat.city: môi trường làm việc chặn trang và mã nguồn của nó, nên phần dưới là suy ra từ cách trang hiển thị và cách làm chuẩn với three.js, không phải đọc code của Ryan. Trang nhẹ vì:
- hình khối đơn giản, tô màu phẳng, gần như không dùng texture;
- rất nhiều nhà nhưng chỉ vài lệnh vẽ (instancing, gộp hình);
- thành phố được sinh trong trình duyệt từ một file số liệu nhỏ;
- camera đi theo các điểm dừng định sẵn, và vùng ngoài tiêu điểm bị làm xám, mờ, nên không bao giờ phải vẽ cả thế giới ở độ chi tiết cao;
- host tĩnh qua CDN.

## Quyết định

Thế giới 3D phải nằm trong ngân sách sau. Mỗi thay đổi visual đều đo bằng `render.mjs` (in `calls`, `triangles`, `bufferMB`, `buildMs`) trước khi báo xong.

| Hạng mục | Mục tiêu (máy tính, GPU tích hợp) |
| --- | --- |
| Tải về lần đầu | ≤ 1 MB gzip (three.js + code + dữ liệu). Texture sinh bằng code; ảnh nào bắt buộc thì nén (KTX2/WebP) |
| Hiện bản đồ đầu tiên | ≤ 3 giây trên 4G. Dựng dần: địa hình trước, thành/cây sau, không có tác vụ nào dài quá 100 ms |
| Lệnh vẽ | ≤ 400 (kể cả bóng) |
| Tam giác mỗi khung | ≤ 1,5 triệu ở toàn cảnh, ≤ 3 triệu ở cận cảnh (kể cả bóng) |
| Bộ đệm GPU | ≤ 150 MB |
| Khung hình | 60 fps; tự hạ `devicePixelRatio` khi khung vượt 20 ms |

Kỹ thuật bắt buộc (đã áp dụng trong `docs/design/prototypes/map.html`):

1. **LOD thành:** chỉ thành camera đang nhìn dựng đủ chi tiết (`CityKit.build({lod:'full'})`). Các thành khác dùng bản giản lược (`lod:'lite'`, khoảng 1/8 số tam giác) và gộp chung lượt vẽ (`CityKit.sink/flush`).
2. **Rừng:** rừng xa là một lớp tán duy nhất (heightfield) có shader vẽ vòm cây. Cây riêng lẻ chỉ có quanh tiêu điểm và dọc ruộng, đường.
3. **Địa hình theo ô:** lưới 0,5 đơn vị gần camera và tiêu điểm, 1–2 đơn vị ở xa, gộp thành một mesh, có mép che khe hở giữa các ô.
4. **Nướng sẵn:** bóng núi, AO và các lớp mặt nạ (rừng, ruộng, đường, bờ sông, biên giới) tính một lần thành texture. Runtime chỉ còn bóng thời gian thực cho vùng quanh tiêu điểm.
5. **Chia ô instancing:** cây và nhà làng chia thành ô 80 đơn vị, mỗi ô có vùng bao riêng và bật `frustumCulled` (three r146 mặc định tắt cho InstancedMesh). Mỗi ô chỉ dùng một vật liệu.
6. **Hậu kỳ:** SSAO chỉ bật ở cận cảnh. DOF/SSAO chạy nửa độ phân giải ở mức chất lượng thấp.
7. **Ba mức chất lượng**, tự chọn theo máy và cho phép đổi tay:
   - Cao: DPR 1,5, SSAO, bóng 4096.
   - Vừa: DPR 1, không SSAO, bóng 2048.
   - Thấp (điện thoại): DPR 1, không DOF, không bóng thời gian thực, ít cây riêng.

## Hệ quả

Đo lại sau khi áp dụng (vòng 4):

| Cảnh | Lệnh vẽ | Tam giác/khung | Bộ đệm GPU |
| --- | --- | --- | --- |
| Toàn cảnh | 160 | 1,3 triệu | 24 MB |
| Chiến dịch | 348 | 2,7 triệu | 29 MB |

- Tải về khoảng 200 KB gzip (three.js 150 KB, code 50 KB, dữ liệu 3 KB, texture 0 KB).
- Việc còn nợ trước khi phát hành:
  - Dựng địa hình trong trình duyệt mất 5–8 giây trong container. App thật phải nướng heightfield và mặt nạ thành ảnh PNG ngay lúc build (script Node), để lúc mở trang chỉ cần tải khoảng vài trăm KB và dựng mesh.
  - Đo FPS trên laptop và điện thoại thật; chưa đo được vì container không có GPU.
- Bản đồ vòng 2 (`prototypes/real.html`) giữ lại để so sánh, không dùng làm nền cho app.
