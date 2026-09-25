# Hướng visual và UI

> **Vai trò:** SOT cho *cách game trông và cảm*: tham chiếu, nguyên tắc, phương án đang chờ duyệt, những điều không đổi.
> **Trạng thái (2026-09-25): ĐÃ CHỌN A + cắt cảnh trận của C** (`decisions/0004`). Thành trì vòng 3 đã được duyệt. Bản đồ chiến dịch vòng 4 (theo TW3K, trong ngân sách web `decisions/0005`) đang chờ duyệt.
> Canvas duyệt: https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV

## Yêu cầu của chủ dự án

1. Làm lại dự án theo phong cách của **Ryan Sael** (dat.city, Token Town, mrr.city, airace.lol), giữ nguyên kịch bản gốc (`docs/product/brief.md`). Phần cần đổi là UI/UX và thế giới 3D Three.js.
2. Lấy thêm ý tưởng từ thế giới và bản đồ **Total War: Three Kingdoms**.
3. **Ưu tiên độ hiện thực cao** như cách Ryan, Total War và Civilization VI đạt được.

## Học gì từ từng tham chiếu

| Nguồn | Lấy | Không lấy |
| --- | --- | --- |
| Ryan Sael | Camera khóa theo điểm dừng (‹ › đi qua từng nhân vật, nút về toàn cảnh); vùng ngoài tiêu điểm chuyển xám và tối nhẹ; mờ ống kính theo độ sâu và tilt-shift; nhãn nổi trên công trình; số liệu biến thành cảnh (to nhỏ, đông vắng); UI tối giản, sạch | Khối voxel "đồ chơi" khi cần hiện thực |
| Total War: Three Kingdoms | Núi đá vôi dựng đứng; rừng dày; sông uốn lượn; thành tường, lầu gác, mái ngói sẫm, cung điện tường đỏ; quân hàng nghìn lính theo khối, nhiều cờ; sương xa, nắng xiên giờ vàng; biển tên thành kèm chân dung; UI thủy mặc (dải mực, giấy, triện đỏ), bản đồ tròn | Bất kỳ asset, icon, font hay ảnh nào của game |
| Civilization VI | Đọc thế cục trong 1 giây: lãnh thổ tô màu, viền rõ, biển tên thành có số; bảng màu bão hòa, dễ nhìn | Bố cục UI nguyên bản của Civ |

Ảnh Civ VI cũ nằm trong `references/legacy-civ6/` và chỉ dùng để tham khảo (ảnh có bản quyền, không phát hành cùng game).

## Vòng 2 — ba hướng hiện thực (đã chọn A + C2)

Cả ba dựng từ **cùng một thế giới** (`prototypes/real.html`): địa hình theo 14 châu, sông Hoàng Hà / Trường Giang / Hán Thủy / Hoài Thủy, núi đá vôi, khoảng 50.000 cây instanced, 14 thành tường, ruộng quanh thành, quân Tào Tháo đang hành quân từ Hứa Xương đánh Tương Dương.

| | A — Chiến dịch Thiên Hạ | B — Sa bàn bảo tàng | C — Bản đồ rõ + cắt cảnh trận |
| --- | --- | --- | --- |
| Ý tưởng | Bản đồ chiến dịch liền mạch kiểu TW3K, camera nghiêng thấp, có chân trời. UI thủy mặc: dải mực, cuộn giấy, huy hiệu chân dung, bản đồ tròn | Cùng thế giới đó, đóng khung như sa bàn trên bàn gỗ dưới đèn; tilt-shift mạnh; UI kiểu Ryan | Tầng chiến lược nhìn từ trên kiểu Civ VI (lãnh thổ, biển tên thành); mỗi trận cắt sang cảnh 3–5 giây góc thấp kiểu TW3K |
| Vì sao | Hiện thực và điện ảnh nhất; chất Ryan nằm ở camera theo lượt và hiệu ứng tiêu điểm | Thật mà vẫn dễ thương, dễ hiểu; thế giới gói trong một khung hình; dễ tối ưu | Đọc thế cục nhanh nhất; có "khoảnh khắc đỉnh" cho clip; làm được theo từng tầng |
| Đánh đổi | Việc 3D nặng nhất; toàn cảnh khó đọc lãnh thổ hơn C | Cảm giác mô hình nhiều hơn; ít không khí điện ảnh | Nhìn từ trên kém điện ảnh; cảnh trận cận mặt đất đòi mô hình chi tiết |
| Ảnh | `real.html?shot=campaign`, `far` | `board`, `boardclose` | `strategy`, `battle` |

**Đã chọn:** A làm nền chính, cắt cảnh trận của C cho mỗi lần giao chiến.

## Thành trì — tiêu chuẩn chất lượng

Phản hồi của chủ dự án: thành trong mock vòng 2 còn "đồ chơi", chưa tới TW3K và chưa tới độ chăm chút của dat.city. Một thành đạt yêu cầu phải có:

- Mái cong kiểu Trung Hoa (dốc gắt ở nóc, thoải ở mép, bốn góc vênh), vật liệu ngói có vân, bờ nóc và bờ quyết, mái có độ dày; lầu lớn dùng mái chồng hai tầng.
- Tường thành vát chân, vật liệu gạch hoặc đất nện, lỗ châu mai, ụ nhô ("mã diện"), tháp góc; cổng có vòm tối, cửa gỗ, lầu cổng hai tầng; cổng chính có ủng thành.
- Bên trong dày đặc và có trật tự: đại lộ Bắc–Nam từ cổng chính vào cung, phố lát đá, tứ hợp viện, chợ, cây trong sân, người đi lại, đèn lồng. Cung điện đặt trên nền đá nhiều cấp.
- Ánh sáng tạo khối: bóng đổ, bóng tiếp xúc (AO) ở chân tường và khe mái, nắng xiên giờ vàng.
- Không một khối hộp trơn nào nhìn thấy được ở tầm camera chiến dịch.

Hiện trạng: `prototypes/city.js` dựng thành theo đủ các tiêu chí trên và đã được duyệt (2026-09-25). Có hai mức chi tiết: `full` cho thành camera đang nhìn, `lite` cho các thành xa (`decisions/0005`).

> **Vòng 5 đề xuất thay mục này.** Chủ dự án yêu cầu thành "đúng theo lịch sử". Mái cong góc vênh, tường gạch, ủng thành là kiểu Minh–Thanh, sai với năm 200. Tiêu chuẩn mới ở mục "Vòng 5" bên dưới (`decisions/0006`, chờ duyệt).

## Bản đồ chiến dịch — tiêu chuẩn TW3K (vòng 4)

Phản hồi của chủ dự án về vòng 2–3: "bản đồ chưa đạt được theo Total War: Three Kingdoms, search thêm cho chuẩn". Nguồn tham khảo gồm ảnh chủ dự án gửi và các bài phỏng vấn, đánh giá về bản đồ TW3K; không dùng asset của game.

Điều TW3K làm:
- Bản đồ 3D có nhiều vách dựng và núi, rừng xanh dày, dãy núi hiểm trở theo địa hình Trung Hoa; sông lấp lánh, đồng bằng nắng.
- Mùa thay đổi: lá chuyển xanh sang nâu đỏ; có tuyết, hoa đào.
- Có chu kỳ ngày đêm.
- Phóng gần thì hậu cảnh mờ theo độ sâu.
- Thu nhỏ hết cỡ thì sang chế độ chiến lược, tô lãnh thổ theo chủ.
- UI mực thủy mặc tối giản.

Một bản đồ đạt yêu cầu phải có:
- **Địa lý nhận ra được là Trung Hoa**, kể cả khi đã bóp méo cho vừa lối chơi:
  - Hoàng Hà uốn chữ 几 quanh Ordos, cao nguyên hoàng thổ;
  - Trường Giang qua Tam Hiệp; Hán, Hoài, Vị, Phần; các hồ Động Đình, Bà Dương, Thái Hồ;
  - Bột Hải và bán đảo Sơn Đông;
  - bồn địa Tứ Xuyên có núi bao quanh; Tần Lĩnh, Thái Hành, Nam Lĩnh;
  - Tây Tạng tuyết phía tây, thảo nguyên và Vạn Lý Trường Thành phía bắc;
  - núi đá vôi phía nam.
- **Tỉ lệ:** thành chiếm khoảng 1/6 bề ngang châu, đất giữa các thành có làng, ruộng, rừng, đường. Renderer giãn toạ độ `geo` với hệ số `S` (hiện 1,45); `data/world.json` vẫn giữ toạ độ bản đồ.
- **Sông mảnh và uốn khúc**, không phải kênh thẳng. Sông lớn có bãi, Hoàng Hà nước đục.
- **Núi cao**, có sống núi và vách đá, tuyết trên đỉnh. **Rừng thành khối tán liền**, không phải chấm tròn rải đều.
- **Đường tự tìm lối** qua thung lũng và đèo; ruộng chia thửa; nhiều làng nhỏ.
- **Không khí:** chân trời, sương dày ở thung lũng, đỉnh núi nhô khỏi sương, bóng núi.
- **Biên giới:** nét màu của phe, châu cùng phe chỉ có nét mờ; có chế độ chiến lược tô màu theo chủ.
- **Mùa** đổi bằng tham số (`uSeason`).
- **Không nhiễu hình:** mọi hoa văn sinh bằng shader phải giới hạn theo kích thước điểm ảnh (`fwidth`), hai bề mặt chồng nhau không được trùng mặt phẳng. Xem mục Bài học trong `AGENTS.md`.

Hiện trạng (2026-09-25): `prototypes/map.html` + `terrain.js` + `flora.js` dựng đủ các ý trên. Ảnh ở trang "Vòng 4" của canvas: toàn cảnh, chế độ chiến lược, lượt chiến dịch, mùa thu, cận thành. Còn giữ chỗ:
- quân trên bản đồ vẫn là khối lính hộp; TW3K dùng một tướng cưỡi ngựa cỡ lớn kèm cờ;
- rìa thảo nguyên phía bắc còn trống;
- chân dung nhân vật.

## Vòng 6–7 — bản đồ toàn quốc (đã chốt) và thế giới thu 219

**Vòng 6, chủ dự án chốt 2026-09-25** (`decisions/0006`, mục "Bổ sung vòng 6"):
- phạm vi: Trung Quốc ngày nay, kèm nhãn cửa Hán (Giao Chỉ, Lạc Lãng, Đại Uyển), không thêm châu có chủ;
- tỉ lệ C (đúng tỉ lệ, chi tiết giảm dần ra vùng biên), phép chiếu Albers;
- kịch bản 219 giữ nguyên.

**Vòng 7, thế giới thu 219** trên bản đồ vòng 5 (bake Albers toàn quốc là bước sau):
- 20 thủ phủ; thảo nguyên, sa mạc, Tây Tạng, Đài Loan là đất hoang không chủ, bạc màu trong chế độ chiến lược.
- Sáu thành mới theo di chỉ: Thiên Thủy (thành Ký), Cô Tang, Chung Ly, Nam Trịnh, Giang Lăng, Điền Trì (`history.md`).
- Lạc Dương, Trường An: cổng và tường đã vá, dân ở lại một phần quanh cổng, chợ, phủ; cung Hán vẫn là nền cháy, vì khảo cổ và sử cho thấy vậy.
- Nghiệp có Tam Đài trên tường tây; Quan Vũ đem thuyền vây Tương Dương, Phàn Thành.
- Địa mạo mới: sa mạc sỏi Hà Tây với ốc đảo Cô Tang, cát Đằng Cách Lý, hồ Điền Trì, bồn địa cao có ruộng.
- Thành nhỏ (dưới 1,2 km) có tường, cổng, tháp thấp theo, để không thành cụm tháp.

## Vòng 5 — địa hình thật và thành Đông Hán (nền cho vòng 6–7)

Phản hồi về vòng 4:
- Bản đồ chưa chuẩn và "bé hơn thực tế nhiều lắm".
- Thành chưa đúng lịch sử.
- Hình ảnh đẹp nhưng chưa thật.

Quyết định đề xuất: `decisions/0006`.

**Bản đồ:**
- Độ cao thật (DEM) và sông, hồ thật, ở tỉ lệ 1 đơn vị = 3 km. Cả vùng chơi rộng khoảng 2.000 × 2.300 km.
- Thành đặt đúng kinh độ, vĩ độ (`data/world.json` → `lonlat`).
- Địa lý sửa về năm 200: Hoài Hà ra biển, không có hồ Hồng Trạch (`history.md`).
- Châu chia theo chi phí đi lại, nên biên đi theo sống núi và sông lớn.
- Góc máy:
  - toàn cảnh (thấy cả Trung Hoa);
  - chế độ chiến lược;
  - vùng (Trung Nguyên);
  - chiến dịch (thung lũng Hán Thủy);
  - cận thành.
- Rìa bản đồ chìm vào mây mù, không để lộ mép cắt.

**Thành trì — tiêu chuẩn mới:**
- Hình dạng, số cổng, vị trí cung, trạng thái năm 200 lấy theo khảo cổ. Mỗi thành một bản ghi trong `data/cities.json`, nguồn ở `history.md`.
- Kiến trúc Đông Hán:
  - tường đất nện có lớp, thân vát, tường chắn thấp;
  - cổng đỉnh bằng (xà gỗ), lầu gỗ trên cổng; kinh đô mỗi cổng 3 lối;
  - cặp khuyết trước cổng chính: khuyết mẹ–con cho quan, khuyết ba cho thiên tử;
  - mái thẳng ngói xám, cột son, tường trắng;
  - cung trên đài đất nện;
  - nhà sân tường, cổng hướng nam, có tháp canh;
  - kho tròn.
- Không có mái cong góc vênh, tường gạch, ủng thành.
- Lạc Dương và Trường An là phế tích: lầu cổng cháy, cung chỉ còn nền, nhà thưa, cỏ mọc.
- Có nét riêng từng thành, theo `cities.json`:
  - Phàn Thành bên kia sông Hán;
  - đồn trăng khuyết Hạ Khẩu, có chiến thuyền chặn sông;
  - Thạch Đầu Thành trên đồi;
  - tiểu thành và đài Hoàn Công ở Lâm Truy;
  - Thành Đô thành đôi, lệch hướng;
  - nội thành và đài Dục Tú ở Hứa Xương;
  - Linh Đài, Minh Đường, Tích Ung ở Lạc Dương.
- Tỉ lệ:
  - Thành phóng to `2,8·L^0,8` đơn vị (L là cạnh dài, tính bằng km). Chiều cao phóng đại hơn nữa để đọc được từ camera chiến dịch.
  - Cây, làng, tường Trường Thành thu nhỏ theo, nên cây luôn thấp hơn tường thành.

Hiện trạng: `prototypes/world.html`, `terrain-real.js`, `hancity.js`. Ảnh ở trang "Vòng 5" của canvas. Còn giữ chỗ:
- Quân vẫn là khối lính hộp.
- Chưa đối chiếu với ảnh bản đồ TW3K, vì mạng của môi trường chặn các trang có ảnh.
- Bờ biển năm 200 (Thượng Hải, Thiên Tân lùi vào trong) và Vân Mộng Trạch chưa dựng.

## Vòng 1 — stylized (đã bị thay)

Ba hướng đồ chơi/voxel bám sát Ryan: sa bàn khối (`prototypes/a.html`), đại lộ bảy phủ xếp theo Uy tín kiểu Token Town (`b.html`), đảo anh hùng chibi với "lăng kính" chỉ số kiểu airace.lol (`c.html`). Không chọn vì chủ dự án ưu tiên độ hiện thực. Ý tưởng còn dùng lại được: xếp vị trí theo thứ hạng (B) và đổi lăng kính chỉ số (C).

## Không đổi, dù chọn phương án nào

- Đủ các phần của kịch bản gốc: 5 chỉ số Binh / Lương / Đất / Dân / Uy (bar đỏ–vàng–xanh theo mức, luôn kèm số), bảng xếp hạng theo Uy tín, nhật ký diễn biến, nhãn trạng thái ("Đang nghĩ…", hành động), câu thoại, nháy đỏ khi hai phe giao chiến, các nút Lượt tiếp theo / Tự động / Chơi lại, tốc độ chỉnh được, thông báo thống nhất thiên hạ.
- Trình tự một lượt: lần lượt từng phe "Đang nghĩ" → hành động + câu thoại → trọng tài → cập nhật số liệu + nhật ký → kiểm tra thắng.
- Màu thế lực theo kịch bản gốc, nhưng phải khác nhau cả về **độ sáng**, không chỉ sắc độ: Tào Tháo xanh rêu *tối*, Lưu Bị xanh lá *sáng*. Mã màu ở `data/world.json`.
- Icon hành động vẽ bằng SVG; không dùng emoji trên UI thật.
- Tỉ lệ: cây nhỏ hơn thành; núi thành dãy liền; không khối chữ nhật trông như placeholder.

## Prototype

`docs/design/prototypes/` chứa các cảnh three.js dùng để render ảnh duyệt. Đây là mã nháp, không phải code sản phẩm, nhưng là điểm xuất phát khi dựng app.
- Hướng đang dùng (vòng 5):
  - `world.html`;
  - `terrain-real.js` đọc `assets/map/`;
  - `hancity.js` đọc `data/cities.json`;
  - dùng chung shader và dụng cụ của `terrain.js`, `flora.js`, `city.js`, `kit.js`.
- Để so sánh:
  - `map.html` (vòng 4);
  - `real.html` (vòng 2–3);
  - `a/b/c.html` (vòng 1).

```bash
npm start
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome xvfb-run -a node docs/design/prototypes/render.mjs world campaign
# vòng 5: overview, strategic, region, campaign, city (thêm "c=<id châu>" để chọn thành, ví dụ "c=si_li")
# → test-results/design/map-campaign.jpg + .json (stats: lệnh vẽ, tam giác, MB, thời gian dựng; anchors: toạ độ màn hình để đặt nhãn UI)
# góc máy: overview, strategic, campaign, autumn, city. Tham số thứ 3 là dpr, thứ 4 là query gỡ lỗi:
#   "hide=water,canopy,clouds"  "off=shadow,ao,dof,atmos"  "dbg=masks|flat|albedo"
```

`map.html` không tải texture nào: vân cỏ, pháp tuyến nước, gạch, ngói đều sinh bằng code. Riêng `real.html` cũ còn tải hai texture từ repo three.js (MIT); Chromium headless trong container chặn chứng chỉ của nguồn này, nên các ảnh cũ render thiếu texture đó.
