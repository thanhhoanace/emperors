# 0005 — Ngân sách hiệu năng web cho thế giới 3D

**Trạng thái:** Đề xuất · 2026-09-25 (chờ duyệt cùng bản đồ vòng 4–5; sửa mục tải về theo vòng 5)

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

Về dat.city: lúc viết ADR này, môi trường chặn trang nên phần giải thích chỉ là suy đoán. Ngày 25/9 mạng đã mở và đã đọc toàn bộ mã của trang. Ba điều đoán sai:
- dat.city **không** giấu hay làm xám thế giới để đỡ tốn: nó vẽ tất cả mọi khung. Vùng "xám" là một bảng màu tối kèm DOF.
- Tải JS không nhỏ: khoảng 580 KB gzip. Chỉ dữ liệu thế giới là nhỏ (32 KB JSON nhúng trong HTML).
- Nó nặng hơn ta tưởng: khoảng 800 lệnh vẽ, 2,8–3,1 triệu tam giác mỗi khung (khoảng 4,5–4,9 triệu ở khung có vẽ bóng), đo bằng GPU phần mềm.

Cái thật sự làm nó mượt:
- **Gộp theo khối hình, không theo vật:** mỗi loại khối là một InstancedMesh có màu từng bản sao. 63.000 vật nhỏ chỉ tốn 35 lệnh vẽ.
- **Chi tiết nằm trong shader** (cửa sổ, AO giả ở chân tường, đèn đêm) chứ không nằm trong tam giác.
- **Texture sinh bằng code**, không tải ảnh.
- **Dựng dần:** mỗi khung dựng tối đa 5 ms, gần trước xa sau; màn khởi động nhẹ chạy trong lúc tải.
- **Bốn mức chất lượng, tự hạ một mức** khi hai cửa sổ 100 khung liên tiếp trung bình quá 31 ms.
- **Bóng chỉ quanh tiêu điểm,** vẽ lại cách một khung.
- Tổng hợp đầy đủ ở `docs/research/datcity.md`.

## Quyết định

Thế giới 3D phải nằm trong ngân sách sau. Mỗi thay đổi visual đều đo bằng `render.mjs` (in `calls`, `triangles`, `bufferMB`, `buildMs`) trước khi báo xong.

| Hạng mục | Mục tiêu (máy tính, GPU tích hợp) |
| --- | --- |
| Tải về lần đầu | ≤ 1 MB gzip (three.js + code + dữ liệu + lưới độ cao thô). Lưới độ cao mịn tải dần theo ô quanh camera, tổng ≤ 2,5 MB. Texture sinh bằng code; ảnh nào bắt buộc thì nén (KTX2/WebP) |
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

## Đo lại vòng 5 (địa hình thật, `decisions/0006`)

`render.mjs world <góc máy>`, GPU phần mềm (số tam giác không phụ thuộc dpr):

| Cảnh | Lệnh vẽ | Tam giác/khung | Bộ đệm GPU |
| --- | --- | --- | --- |
| Toàn cảnh | 215 | 1,2 triệu | 32 MB |
| Chiến lược | 218 | 1,2 triệu | 32 MB |
| Vùng (Trung Nguyên) | 105 | 1,4 triệu | 38 MB |
| Chiến dịch (có bóng) | 210 | 2,1 triệu | 40 MB |
| Cận thành Tương Dương | 170 | 1,5 triệu | 37 MB |
| Cận thành Trường An | 153 | 2,8 triệu | 38 MB |
| Cận thành Hạ Khẩu | 107 | 1,4 triệu | 36 MB |

- **Tải về: khoảng 2,4 MB gzip.**
  - Độ cao 2,05 MB: lưới mịn 1,77 MB và lưới thô 0,28 MB. Đã nén delta 2 chiều; bản thô là 4,8 MB.
  - Sông 0,1 MB, three.js 0,15 MB, code 0,08 MB.
  - Vượt trần lần đầu, nên đã sửa ngân sách ở bảng trên. App thật phải tải lưới thô trước, rồi tải dần lưới mịn theo ô.
- **Dựng mặt nạ lúc mở trang: khoảng 13 giây trong container.** Gồm rừng, ruộng, đường, biên châu (14 lượt Dijkstra) và bóng núi. Phải nướng sẵn lúc build (`tools/bake-map.mjs`).
- **Những gì đã làm để vào trần tam giác:**
  - Toàn cảnh dùng lưới đất 2 đơn vị.
  - Mép che khe chỉ đặt ở chỗ hai ô khác độ mịn. Trước đó mép còn tốn tam giác hơn cả mặt đất.
  - Thành xa dùng mẫu nhà khoảng 60 tam giác.
  - Cây riêng thưa hơn ở cảnh chiến dịch.
  - Kết quả: toàn cảnh 4,6 → 1,2 triệu tam giác; chiến dịch 3,9 → 2,1 triệu.
- **Mọi cảnh đều nằm trong trần tam giác.** Cận thành lớn nhất (Trường An) sát trần 3 triệu. Mức chất lượng "Vừa" sẽ giảm cây riêng và bóng.
