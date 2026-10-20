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

## Vòng 3 — toàn bản đồ (20/10)

> Chủ dự án sau vòng 2: "ổn đấy, làm toàn bộ bản đồ theo phong cách này. Ưu tiên độ đẹp trước. Phần thành trì hơi xấu hơn bản cũ, tinh chỉnh lại."

- `paper.html` mặc định là **toàn bản đồ 219** (`src/world/paper-world.js`), chỉ xem; `?map=huainan` giữ vòng chơi Hoài Nam; `?map=towns` xếp năm cấp thành cạnh nhau để duyệt.
- Địa hình thật từ bake (`Terrain.loadBaked`, `Terrain.projection` của `terrain-real.js`, chỉ lưới thô 6 km): 3 lớp biển + 7 lớp đất theo mét (0 · 250 · 620 · 1150 · 1850 · 2750 · 3750), làm mềm trước khi cắt. Biển là các dải xanh mòng két lượn theo khoảng cách tới bờ, mép bọt trắng. Sông (Hoàng Hà, Trường Giang, Hoài, Hán và các nhánh) đào rãnh trong lớp đất, ba dải giấy chồng nhau và bọt; hồ (Động Đình, Bà Dương, Thái Hồ, Sào Hồ, Thanh Hải, Điền Trì, Đại Dã) là các tờ lồng nhau.
- Núi: cụm đỉnh origami (vòng điểm so le nên nhiều nếp nhỏ, màu theo tầng) đặt theo địa hình thật, ưu tiên Tần Lĩnh, Đại Ba, Thái Hành, Đại Biệt, Vũ Di, Nam Lĩnh, Vũ Lăng, rìa cao nguyên, Kỳ Liên, Âm Sơn.
- 20 châu: chia bằng chi phí đi lại từ 20 thủ phủ (dốc, độ cao, đất khô tốn hơn), mỗi châu một màu giấy riêng; biên là dải giấy nổi hai màu theo phe chủ hai bên (cùng chủ: dải kem mảnh). Chủ lấy từ `factions[].start.provinces`, chữ trên cờ từ `data/personas`.
- Thành (`hanTown` trong `paper.js`, dùng cho cả Hoài Nam): bố cục theo `HM.town` của v2 — tường vuông theo lũy, cổng giữa mỗi mặt có lầu sơn son, lầu góc, mã diện từ lũy 3, hào từ lũy 3, phủ trị ở bắc trung tâm quay nam, tháp canh ở ngã tư, nhà sân trong các khối, chợ có mái che, kho tròn, cây; làm bằng giấy: tường bìa có răng cưa gấp và nắp sáng, mái đá phiến có nếp ngói và nóc nhạt, cửa là khe tối, đế hai lớp bìa, ruộng quanh. Cấp: thủ đô 4, thủ phủ 3, biên viễn (Hà Tây, Nam Trung, Giao, U) 2, đồn (Hạ Khẩu) 1.
- Camera: toàn cảnh vừa khung, kéo/chụm xuống tới một châu (`&focus=<châu>&zoom=<khoảng cách>`); dải tilt-shift nhẹ ở toàn cảnh, hẹp khi đến gần; thớ giấy rõ khi đến gần.

Đo (GPU phần mềm, 844×390, kể cả bóng):

| Tier | Toàn cảnh: tam giác / lệnh vẽ | Cận cảnh (zoom 60): tam giác / lệnh vẽ |
| --- | --- | --- |
| low | 0,48 M / 48 | 0,48 M / 10 |
| mid | 1,24 M / 75 | 1,23 M / 18 |
| high | 1,86 M / 75 | 1,86 M / 18 |

Ảnh: `prototypes/paper/world-overview-mid.png`, `world-overview-high.png`, `world-province-mid.png`, `world-town-high.png`, `towns-levels-high.png`, `town-level4-paper-high.png` cạnh `town-v2-old-high.png`, `paper-default.png` (Hoài Nam). `paper-zoom-town*.png`, `paper-winter.png` là thành vòng 2 (cũ).

Còn thiếu so với ảnh mẫu: núi còn nhỏ ở toàn cảnh (ảnh mẫu là cận cảnh vài ngọn lớn); sóng biển là dải phẳng, chưa có các ngọn sóng giấy dựng đứng; đồng bằng phía nam còn nhiều đảo lớp nhỏ; nhãn châu chồng nhau ở toàn cảnh thì ẩn bớt; chưa có thuyền, mây ít; toàn bản đồ chưa nối luật chơi.
