# 0006 — Bản đồ theo địa hình thật, thành trì theo khảo cổ Đông Hán

**Trạng thái:** Chấp nhận · 2026-09-25. Chủ dự án chốt phần hình vòng 6 dựa trên hướng này; xem mục "Bổ sung vòng 6" ở cuối.

## Bối cảnh

Phản hồi của chủ dự án về vòng 4:
- Bản đồ chưa chuẩn và "bé hơn thực tế nhiều lắm".
- Thành trì chưa ổn: "lấy đúng theo lịch sử cho chuẩn hoặc tìm ảnh cho từng thành trì".
- Hình ảnh đẹp, nhưng độ thực tế của bản đồ và thành trì thì chưa.

Bản đồ vòng 4 là địa hình vẽ tay bằng nhiễu, bóp theo toạ độ `geo` tự đặt. Thành vòng 3 (`city.js`) theo kiểu Minh–Thanh: mái cong góc vênh, tường gạch, ủng thành. Tất cả đều sai niên đại năm 200 (`docs/design/history.md`).

Môi trường làm việc chặn Wikipedia, Baidu, dat.city, fandom/twdb (ảnh bản đồ TW3K). Vì vậy dữ kiện lịch sử lấy từ đoạn trích của công cụ tìm kiếm. Dữ liệu địa hình tải được từ AWS Open Data và GitHub.

## Quyết định

1. **Địa hình thật.** Độ cao lấy từ AWS Terrain Tiles (terrarium z7), sông và hồ từ Natural Earth 10 m.
   - Phép chiếu phẳng quanh 112°E, 32°N; **1 đơn vị = 3 km**, nên bản đồ rộng khoảng 2.000 × 2.300 km.
   - Độ cao phóng đại khoảng 9 lần: `h = 0,1 + mét × 0,003`.
   - Nướng một lần bằng `tools/bake-map.mjs` ra `assets/map/` và commit kết quả. Lúc chạy không gọi nguồn ngoài.
2. **Sửa địa lý về năm 200**:
   - Hoài Hà chảy thẳng ra Hoàng Hải, bỏ hồ Hồng Trạch.
   - Chỉ giữ Động Đình, Bà Dương, Thái Hồ, Sào Hồ.
   - Thêm các sông nhỏ mà các thành đứng cạnh: Lạc, Truy, Tứ, Biện, kênh Hà, Bì, Kiểm, Châu Giang.
3. **Thành phóng to để đọc được, phần còn lại giữ đúng tỉ lệ.**
   - Cạnh dài L km thành `2,8·L^0,8` đơn vị. Thứ bậc vẫn đúng: kinh đô to hơn thủ phủ.
   - Sông né thành bằng cách uốn sang bên, vẫn chảy về phía nó vốn chảy (sông làm hào, như thật).
   - Nền đất dưới thành được làm phẳng.
4. **Thành dựng theo khảo cổ.**
   - Bố cục từng thành nằm ở `data/cities.json`: đường viền, cổng, cung, trạng thái năm 200. Quy tắc kiến trúc nằm ở `history.md`.
   - Dựng bằng `docs/design/prototypes/hancity.js`: tường đất nện, cổng đỉnh bằng, lầu gỗ, khuyết, mái thẳng ngói xám, cung trên đài đất, nhà sân có tháp canh.
   - Lạc Dương và Trường An dựng ở dạng phế tích.
   - Mục này thay tiêu chuẩn thành vòng 3 trong `direction.md`. `city.js` chỉ còn dùng làm bộ vật liệu chung.
5. **Châu chia theo chi phí đi lại**, không theo khoảng cách thẳng.
   - Mỗi thủ phủ chạy một lượt Dijkstra; núi dốc, sông lớn và địa hình cao làm tăng chi phí.
   - Nhờ vậy biên đi theo sống núi và sông: Ba Thục khép trong núi, Kinh Châu theo thung lũng Hán Thủy.

## Hệ quả

- Tải thêm khoảng 2 MB dữ liệu độ cao, đã nén bằng delta 2 chiều + gzip. Ngân sách tải lần đầu của `0005` phải sửa: lưới mịn chia ô và tải dần.
- Dựng mặt nạ lúc mở trang mất khoảng 12 giây trong container. App thật phải nướng luôn mặt nạ (rừng, ruộng, đường, biên, bóng) ở bước build.
- Kịch bản lệch lịch sử ở bốn chỗ; chủ dự án cần quyết (`history.md`):
  - Kiến Nghiệp năm 200 chưa có.
  - Trường An thuộc Tư Lệ, không phải Lương Châu.
  - Hạ Khẩu là của Hoàng Tổ.
  - Nghiệp Thành là của Viên Thiệu.
- Chưa đối chiếu được với ảnh bản đồ TW3K và cách dat.city render, vì mạng bị chặn. Khi môi trường mở mạng (hoặc chủ dự án gửi ảnh chụp) thì so lại.
- `data/world.json` đổi `geo` thành `lonlat` (kinh độ, vĩ độ thật). Prototype vòng 4 (`map.html`) giữ toạ độ cũ trong chính nó để còn render được.

## Bổ sung vòng 6 (chủ dự án chốt 2026-09-25)

- **Phạm vi hình:** lãnh thổ Trung Quốc ngày nay.
  - Giao Chỉ, Lạc Lãng, Đại Uyển chỉ là nhãn "cửa Hán" ở mép bản đồ, không thêm đất.
  - Không thêm châu có chủ: luật vẫn là 20 châu của kịch bản 219 (`decisions/0007`). Phần còn lại là đất hoang có tên.
- **Tỉ lệ C:** đúng tỉ lệ 3 km/đơn vị trên toàn bộ; chi tiết giảm dần ra vùng biên; cao nguyên, sa mạc, rừng bắc là đất hoang, chỉ có vài hành lang đi qua; thu nhỏ hết cỡ thì chuyển sang bản đồ tranh. Chi tiết ở `docs/product/proposal-all-china.md`, mục 3 và 8.
- **Phép chiếu Albers nón** (vĩ tuyến chuẩn 25° và 47°, kinh tuyến giữa 105°E) thay cho phép chiếu phẳng quanh 112°E ở mục 1. Bake toàn quốc sẽ chia ô và nướng sẵn mặt nạ.
- **Thành theo năm 219**, không còn năm 200:
  - Lạc Dương và Trường An đã dựng lại một phần sau loạn 190–195, không còn là phế tích.
  - Thêm sáu thủ phủ mới của kịch bản: Thiên Thủy, Cô Tang, Chung Ly, Nam Trịnh, Giang Lăng, Điền Trì.
  - Bốn chỗ lệch năm 200 nêu ở mục Hệ quả không còn là câu hỏi: kịch bản 219 khớp sử ở những chỗ đó.
- Mạng của môi trường đã mở sau vòng 5. Dữ kiện thành được đối chiếu lại với Wikipedia, Commons và bài khảo cổ (`docs/research/cities.md`).
