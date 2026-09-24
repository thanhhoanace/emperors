# Brief sản phẩm — kịch bản gốc

> **Vai trò:** SOT cho *ý đồ* sản phẩm: game là gì, người xem thấy gì, một lượt diễn ra thế nào.
> Không chứa số liệu cân bằng (xem `data/world.json`) và không chứa quyết định visual (xem `docs/design/direction.md`).
> Chỉ sửa phần "Kịch bản gốc" khi chủ dự án đổi ý đồ. Sai lệch có chủ đích ghi ở bảng dưới, kèm quyết định.

## Sai lệch có chủ đích so với kịch bản gốc

| Kịch bản gốc | Hiện hành | Vì sao | Quyết định |
| --- | --- | --- | --- |
| Giữa màn hình là "sảnh" 7 thẻ nhân vật | Giữa màn hình là thế giới 3D; thẻ nhân vật thành nhãn nổi trên thế giới | Chủ dự án muốn UI/UX + thế giới 3D theo phong cách Ryan Sael | `decisions/0004` |
| Tông tối, viền vàng đồng, font có chân | Theo phương án design được duyệt | Đang chờ duyệt 3 phương án | `decisions/0004` |
| Tailwind CDN, 1 file `index.html` | Nhiều file tĩnh trong `src/`, không bundler, không Tailwind | Engine phải test được bằng Node; một file 3.000 dòng khó sửa | `decisions/0002` |
| Backend `POST /turn` bắt buộc | Game chạy hoàn toàn trên trình duyệt (GitHub Pages); `POST /api/turn` là tuỳ chọn khi chạy local | Pages không có backend | `decisions/0003` |
| Docker compose | Chưa làm | Chưa cần khi chạy tĩnh | — |
| LLM làm trọng tài | Trọng tài là luật tất định trong engine; agent MOCK theo tính cách | Chạy không cần API key; LLM cắm vào sau qua `server/` | `decisions/0003` |

## Kịch bản gốc (nguyên văn)

### Mục tiêu
Web app mô phỏng 4 hoàng đế xuyên không vào thời Tam Quốc (~ năm 200),
cạnh tranh trực tiếp với quân phiệt Tam Quốc bằng AI.
TRỌNG TÂM: UI đẹp, trực quan, SHOW RÕ hành động của từng nhân vật mỗi lượt
(để dễ xem và quay video/chụp màn hình).

### Nhân vật xuyên không (giữ NGUYÊN tính cách lịch sử)
- Lý Thế Dân (Đường Thái Tông): kỵ binh thiện chiến, dùng người tài, quyết
  đoán; điểm yếu: vướng mắc gia tộc/kế vị. Màu: lam.
- Tần Thủy Hoàng: pháp trị, tập quyền, công trình lớn; điểm yếu: hà khắc,
  dễ mất dân tâm. Màu: đen-vàng.
- Chu Nguyên Chương: bần nông lên ngôi, giỏi du kích & tổ chức, đa nghi,
  thanh trừng công thần. Màu: đỏ thẫm.
- Lưu Triệt (Hán Vũ Đế): bành trướng, ngoại giao + viễn chinh, trọng Nho;
  điểm yếu: tiêu hao quốc khố, cuối đời mê tín. Màu: tím.

### Đối thủ Tam Quốc (AI)
- Tào Tháo: gian hùng, quyền biến, trọng nhân tài. Màu: xanh rêu.
- Lưu Bị: nhân nghĩa, thu phục lòng người, kiên nhẫn. Màu: xanh lá.
- Tôn Quyền: thủ thành, thủy quân mạnh, linh hoạt liên minh. Màu: cam.

### Cơ chế
- Bản đồ chia 8-10 châu; mỗi thế lực có chỉ số: Binh lực, Lương thảo,
  Lãnh thổ, Dân tâm, Uy tín.
- Chơi theo LƯỢT. Mỗi lượt mỗi agent ra 1 quyết định:
  Tấn công / Ngoại giao / Nội chính / Mưu kế / Củng cố.
- LLM làm trọng tài tính kết quả theo chỉ số (KHÔNG cho 100 quân thắng
  10.000 quân) + 1 chút ngẫu nhiên.
- Mỗi lượt sinh "diễn biến" dạng văn kể + cập nhật số liệu + 1 câu thoại
  ngắn đúng giọng nhân vật.

### GIAO DIỆN (phần quan trọng nhất)
Bố cục 3 vùng, phong cách "sảnh chầu / war room" Tam Quốc, tông tối,
viền vàng đồng, font có chân (serif) cho tiêu đề.

#### 1. Sảnh nhân vật (giữa màn hình) — kiểu "office"
- 7 thẻ nhân vật xếp thành sảnh, mỗi thẻ có:
  - Avatar (placeholder hình tròn + tên + triều đại).
  - Viền sáng theo MÀU thế lực.
  - Badge trạng thái lượt hiện tại: "Đang nghĩ…", "Tấn công ⚔",
    "Đàm phán 🕊", "Nội chính 🏛", "Mưu kế 🎭", "Củng cố 🛡".
  - Bong bóng thoại (speech bubble) hiện 1 câu nói đúng giọng nhân vật
    khi tới lượt hành động của họ.
  - Khi bị tiêu diệt: thẻ chuyển xám + chữ "Diệt vong".

#### 2. Bảng chỉ số (cột phải)
- Danh sách 7 thế lực, mỗi dòng có 5 thanh bar (Binh/Lương/Đất/Dân/Uy)
  với số. Bar đổi màu theo mức (đỏ thấp, vàng vừa, xanh cao).
- Sắp xếp theo Uy tín giảm dần (cập nhật mỗi lượt).

#### 3. Nhật ký diễn biến (cột trái, cuộn dọc)
- Mỗi lượt thêm 1 khối: số lượt + dòng văn kể + các thay đổi số liệu
  (vd "Tào Tháo +2000 binh, Lưu Bị -1 châu").
- Khối mới hiện hiệu ứng fade-in, tự cuộn xuống.

#### Animation cần có (CSS thuần, nhẹ)
- Badge trạng thái: pulse khi "Đang nghĩ".
- Bong bóng thoại: fade-in + giữ 4s rồi mờ.
- Khi 2 thế lực giao chiến: viền 2 thẻ nháy đỏ đồng thời 1 nhịp.
- Bar số liệu: transition mượt khi đổi giá trị.

#### Điều khiển (thanh dưới cùng)
- Nút "▶ Lượt tiếp theo": chạy 1 lượt.
- Nút "⏩ Tự động": chạy liên tục mỗi 4s đến khi có người thắng (toggle).
- Nút "↺ Chơi lại".
- Hiển thị "Lượt: N" và thông báo "🏆 [Tên] thống nhất thiên hạ!" khi kết thúc.

### Trình tự một lượt (để UI kể chuyện rõ)
1. Lần lượt từng thế lực còn sống: badge "Đang nghĩ" (pulse) ~0.6s.
2. Gọi LLM cho thế lực đó → badge đổi sang hành động + bong bóng thoại.
3. Sau khi cả 7 đã quyết định → gọi trọng tài tính kết quả.
4. Cập nhật bar (transition) + thêm khối nhật ký + viền giao chiến nháy.
5. Kiểm tra thắng/thua.
(Có thể hiển thị tuần tự để xem rõ; tốc độ chỉnh được.)

### Ràng buộc kỹ thuật
- Frontend: 1 file index.html + Tailwind CDN + vanilla JS (không build).
- Backend: Node.js + Express, endpoint POST /turn nhận state → trả
  quyết định + trọng tài. Có chế độ MOCK (không cần API key) để test UI.
- Đóng gói Docker: docker compose up → mở http://localhost:3000.
- KHÔNG dùng thư viện nặng. Animation bằng CSS/Tailwind.
