# Tam Quốc Loạn Nhập — Mô phỏng quân chủ xuyên không

## Mục tiêu
Web app mô phỏng 4 hoàng đế xuyên không vào thời Tam Quốc (~ năm 200),
cạnh tranh trực tiếp với quân phiệt Tam Quốc bằng AI.
TRỌNG TÂM: UI đẹp, trực quan, SHOW RÕ hành động của từng nhân vật mỗi lượt
(để dễ xem và quay video/chụp màn hình).

## Nhân vật xuyên không (giữ NGUYÊN tính cách lịch sử)
- Lý Thế Dân (Đường Thái Tông): kỵ binh thiện chiến, dùng người tài, quyết
  đoán; điểm yếu: vướng mắc gia tộc/kế vị. Màu: lam.
- Tần Thủy Hoàng: pháp trị, tập quyền, công trình lớn; điểm yếu: hà khắc,
  dễ mất dân tâm. Màu: đen-vàng.
- Chu Nguyên Chương: bần nông lên ngôi, giỏi du kích & tổ chức, đa nghi,
  thanh trừng công thần. Màu: đỏ thẫm.
- Lưu Triệt (Hán Vũ Đế): bành trướng, ngoại giao + viễn chinh, trọng Nho;
  điểm yếu: tiêu hao quốc khố, cuối đời mê tín. Màu: tím.

## Đối thủ Tam Quốc (AI)
- Tào Tháo: gian hùng, quyền biến, trọng nhân tài. Màu: xanh rêu.
- Lưu Bị: nhân nghĩa, thu phục lòng người, kiên nhẫn. Màu: xanh lá.
- Tôn Quyền: thủ thành, thủy quân mạnh, linh hoạt liên minh. Màu: cam.

## Cơ chế
- Bản đồ chia 8-10 châu; mỗi thế lực có chỉ số: Binh lực, Lương thảo,
  Lãnh thổ, Dân tâm, Uy tín.
- Chơi theo LƯỢT. Mỗi lượt mỗi agent ra 1 quyết định:
  Tấn công / Ngoại giao / Nội chính / Mưu kế / Củng cố.
- LLM làm trọng tài tính kết quả theo chỉ số (KHÔNG cho 100 quân thắng
  10.000 quân) + 1 chút ngẫu nhiên.
- Mỗi lượt sinh "diễn biến" dạng văn kể + cập nhật số liệu + 1 câu thoại
  ngắn đúng giọng nhân vật.

## GIAO DIỆN (phần quan trọng nhất)
Bố cục 3 vùng, phong cách "sảnh chầu / war room" Tam Quốc, tông tối,
viền vàng đồng, font có chân (serif) cho tiêu đề.

### 1. Sảnh nhân vật (giữa màn hình) — kiểu "office"
- 7 thẻ nhân vật xếp thành sảnh, mỗi thẻ có:
  - Avatar (placeholder hình tròn + tên + triều đại).
  - Viền sáng theo MÀU thế lực.
  - Badge trạng thái lượt hiện tại: "Đang nghĩ…", "Tấn công ⚔",
    "Đàm phán 🕊", "Nội chính 🏛", "Mưu kế 🎭", "Củng cố 🛡".
  - Bong bóng thoại (speech bubble) hiện 1 câu nói đúng giọng nhân vật
    khi tới lượt hành động của họ.
  - Khi bị tiêu diệt: thẻ chuyển xám + chữ "Diệt vong".

### 2. Bảng chỉ số (cột phải)
- Danh sách 7 thế lực, mỗi dòng có 5 thanh bar (Binh/Lương/Đất/Dân/Uy)
  với số. Bar đổi màu theo mức (đỏ thấp, vàng vừa, xanh cao).
- Sắp xếp theo Uy tín giảm dần (cập nhật mỗi lượt).

### 3. Nhật ký diễn biến (cột trái, cuộn dọc)
- Mỗi lượt thêm 1 khối: số lượt + dòng văn kể + các thay đổi số liệu
  (vd "Tào Tháo +2000 binh, Lưu Bị -1 châu").
- Khối mới hiện hiệu ứng fade-in, tự cuộn xuống.

### Animation cần có (CSS thuần, nhẹ)
- Badge trạng thái: pulse khi "Đang nghĩ".
- Bong bóng thoại: fade-in + giữ 4s rồi mờ.
- Khi 2 thế lực giao chiến: viền 2 thẻ nháy đỏ đồng thời 1 nhịp.
- Bar số liệu: transition mượt khi đổi giá trị.

### Điều khiển (thanh dưới cùng)
- Nút "▶ Lượt tiếp theo": chạy 1 lượt.
- Nút "⏩ Tự động": chạy liên tục mỗi 4s đến khi có người thắng (toggle).
- Nút "↺ Chơi lại".
- Hiển thị "Lượt: N" và thông báo "🏆 [Tên] thống nhất thiên hạ!" khi kết thúc.

## Trình tự một lượt (để UI kể chuyện rõ)
1. Lần lượt từng thế lực còn sống: badge "Đang nghĩ" (pulse) ~0.6s.
2. Gọi LLM cho thế lực đó → badge đổi sang hành động + bong bóng thoại.
3. Sau khi cả 7 đã quyết định → gọi trọng tài tính kết quả.
4. Cập nhật bar (transition) + thêm khối nhật ký + viền giao chiến nháy.
5. Kiểm tra thắng/thua.
(Có thể hiển thị tuần tự để xem rõ; tốc độ chỉnh được.)

## Ràng buộc kỹ thuật
- Frontend: 1 file index.html + Tailwind CDN + vanilla JS (không build).
- Backend: Node.js + Express, endpoint POST /turn nhận state → trả
  quyết định + trọng tài. Có chế độ MOCK (không cần API key) để test UI.
- Đóng gói Docker: docker compose up → mở http://localhost:3000.
- KHÔNG dùng thư viện nặng. Animation bằng CSS/Tailwind.

## Cập Nhật Visual Map 3D (2026-06-15)

Triển khai hiện tại đã chuyển trọng tâm khỏi UI "office" ban đầu sang bản đồ Three.js trực tiếp trong `index.html`. Mục tiêu visual v1 là bản đồ chiến lược Civ-like: đọc được địa hình, dãy núi, sông, trục đường, thành trì/cửa ải và thế lực trên bản đồ, nhưng không sao chép asset từ Civilization hoặc game thương mại.

### Hướng Hiện Tại

- Giữ app một file `index.html` cho v1; chưa chuyển sang bundler.
- Chỉ dùng asset CC0 local trong `assets/`, có `assets/manifest.json` và ghi nguồn trong `assets/SOURCE.md`.
- Giữ schema gameplay hiện tại: `PROVINCES`, `RIVERS`, `MOUNTAINS`, factions và simulation logic không đổi nếu không có yêu cầu riêng.
- Cây/rừng đang dùng GLB clone từ Kenney Nature Kit, nhưng cần tiếp tục giảm scale/mật độ để không lớn hơn thành trì.
- Núi hiện dùng procedural mountain ranges theo dữ liệu `MOUNTAINS`; asset đá rời không đủ tốt để thể hiện dãy núi địa hình.
- Thành trì/cửa ải vẫn là procedural layout, cần thay block thô bằng silhouette kiến trúc rõ: gate, tower, wall, courtyard.
- Sông và đường cần được nhấn mạnh hơn để đọc được các tuyến lịch sử khi zoom out.

### Nợ Visual Còn Lại

- Mountain ranges cần có ridge liên tục, chân núi, band đá/tuyết và màu sắc tốt hơn.
- Các wall segment gần Thục Đạo dễ bị hiểu là khối địa hình; cần đổi sang kiến trúc thành/cổng hoặc asset khác.
- Shadow đã giảm nhưng vẫn cần QA nhiều góc camera để tránh lộ footprint/mesh base.
- Map scale đã mở rộng tạm thời, nhưng cần tuning lại camera, padding, label density và feature scale.
- Kenney không đủ đẹp cho toàn bộ mục tiêu Civ-like; worker tiếp theo nên đánh giá thêm Quaternius hoặc nguồn CC0 khác trước khi nhập asset mới.

### Acceptance Cho Worker Tiếp Theo

- Zoom in/out không thấy cây lớn hơn thành trì.
- Dãy núi đọc được như địa hình liên tục, không phải các khối đá rời.
- Thành trì/cửa ải có silhouette kiến trúc, không còn block chữ nhật thô.
- Đường chính và sông chính rõ ở zoom out.
- Console không có asset 404, GLTF parse error hoặc lỗi syntax.
- Chạy qua `http://localhost:3000/`; không dùng `file://` cho asset loading.
