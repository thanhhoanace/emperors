# v3 — Hoài Nam bằng giấy (demo phong cách)

> Chủ dự án, 20/10: "cần tạo 1 bản demo theo phong cách hình ảnh như trên … tạo version mới". Ảnh mẫu: `docs/design/references/paper/` (4 ảnh).
> Đây là demo hình, chưa thay v2. Duyệt xong mới tính đưa vào `v2.html`.

## Phong cách (đọc từ 4 ảnh)

- Mọi thứ là **giấy cắt xếp lớp**: mép dày 1–3 mm, cạnh hơi sáng, mỗi lớp đổ bóng mềm xuống lớp dưới (ambient occlusion và bóng ngắn, không bóng gắt).
- Núi là **giấy gấp origami**: mặt phẳng, nếp gấp rõ, màu kem/trắng ngà ở đỉnh, xanh mòng két / cam đất ở chân.
- Nước là **các dải giấy lượn sóng** xếp chồng (xanh ngọc → xanh đậm), vài mép trắng như bọt.
- Mặt trời tròn bằng giấy (cam/đỏ) có quầng sáng; mây là các đĩa giấy trắng chồng lên nhau.
- Cây là cụm giấy cuộn (cam, vàng, xanh lá) hoặc nón giấy; nhà là hộp giấy mái gấp; thuyền buồm giấy trắng.
- Bảng màu hạn chế, bão hòa vừa, nền trơn gradient (kem → hồng nhạt, hoặc xanh xám). Chiều sâu bằng lớp và sương nhẹ, không bằng texture.
- Toàn cảnh như **một sa bàn / diorama** đặt trên nền, có viền khung (ảnh 3: cổng vòm cắt giấy; ảnh 4: tấm bảng).

## Phạm vi demo

`paper.html` (trang mới, không đụng `v2.html`): sa bàn Hoài Nam thu 219 theo phong cách trên, dùng dữ liệu `data/scenario/huainan.json` (5 thành, sông, phe) và luật `EmperorsV2` để đặt quân và thành theo `V2.view`. Chơi được tối thiểu: chạm quân → chạm đích → xác nhận; nút Hết mùa; quân di chuyển trên sa bàn. Bốn mùa đổi bảng màu giấy (`&season=`).
