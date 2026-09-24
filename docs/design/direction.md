# Hướng visual và UI

> **Vai trò:** SOT cho *cách game trông và cảm*: tham chiếu, nguyên tắc, phương án đang chờ duyệt, những điều không đổi.
> **Trạng thái (2026-09-24): CHỜ CHỦ DỰ ÁN CHỌN PHƯƠNG ÁN.** Canvas duyệt: https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV
> (trang "Vòng 2 · Hiện thực" là hướng chính; "Vòng 1 · Stylized" để so sánh). Khi đã chọn: ghi kết quả vào `decisions/0004` và cập nhật file này.

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

## Vòng 2 — ba hướng hiện thực (đang chờ chọn)

Cả ba dựng từ **cùng một thế giới** (`prototypes/real.html`): địa hình theo 14 châu, sông Hoàng Hà / Trường Giang / Hán Thủy / Hoài Thủy, núi đá vôi, khoảng 50.000 cây instanced, 14 thành tường, ruộng quanh thành, quân Tào Tháo đang hành quân từ Hứa Xương đánh Tương Dương.

| | A — Chiến dịch Thiên Hạ | B — Sa bàn bảo tàng | C — Bản đồ rõ + cắt cảnh trận |
| --- | --- | --- | --- |
| Ý tưởng | Bản đồ chiến dịch liền mạch kiểu TW3K, camera nghiêng thấp, có chân trời. UI thủy mặc: dải mực, cuộn giấy, huy hiệu chân dung, bản đồ tròn | Cùng thế giới đó, đóng khung như sa bàn trên bàn gỗ dưới đèn; tilt-shift mạnh; UI kiểu Ryan | Tầng chiến lược nhìn từ trên kiểu Civ VI (lãnh thổ, biển tên thành); mỗi trận cắt sang cảnh 3–5 giây góc thấp kiểu TW3K |
| Vì sao | Hiện thực và điện ảnh nhất; chất Ryan nằm ở camera theo lượt và hiệu ứng tiêu điểm | Thật mà vẫn dễ thương, dễ hiểu; thế giới gói trong một khung hình; dễ tối ưu | Đọc thế cục nhanh nhất; có "khoảnh khắc đỉnh" cho clip; làm được theo từng tầng |
| Đánh đổi | Việc 3D nặng nhất; toàn cảnh khó đọc lãnh thổ hơn C | Cảm giác mô hình nhiều hơn; ít không khí điện ảnh | Nhìn từ trên kém điện ảnh; cảnh trận cận mặt đất đòi mô hình chi tiết |
| Ảnh | `real.html?shot=campaign`, `far` | `board`, `boardclose` | `strategy`, `battle` |

**Đề xuất:** A làm nền chính, lấy thêm cắt cảnh trận của C cho mỗi lần giao chiến; dùng khung sa bàn của B cho cảnh mở đầu và kết thúc video.

## Vòng 1 — stylized (đã bị thay)

Ba hướng đồ chơi/voxel bám sát Ryan: sa bàn khối (`prototypes/a.html`), đại lộ bảy phủ xếp theo Uy tín kiểu Token Town (`b.html`), đảo anh hùng chibi với "lăng kính" chỉ số kiểu airace.lol (`c.html`). Không chọn vì chủ dự án ưu tiên độ hiện thực. Ý tưởng còn dùng lại được: xếp vị trí theo thứ hạng (B) và đổi lăng kính chỉ số (C).

## Không đổi, dù chọn phương án nào

- Đủ các phần của kịch bản gốc: 5 chỉ số Binh / Lương / Đất / Dân / Uy (bar đỏ–vàng–xanh theo mức, luôn kèm số), bảng xếp hạng theo Uy tín, nhật ký diễn biến, nhãn trạng thái ("Đang nghĩ…", hành động), câu thoại, nháy đỏ khi hai phe giao chiến, các nút Lượt tiếp theo / Tự động / Chơi lại, tốc độ chỉnh được, thông báo thống nhất thiên hạ.
- Trình tự một lượt: lần lượt từng phe "Đang nghĩ" → hành động + câu thoại → trọng tài → cập nhật số liệu + nhật ký → kiểm tra thắng.
- Màu thế lực theo kịch bản gốc, nhưng phải khác nhau cả về **độ sáng**, không chỉ sắc độ: Tào Tháo xanh rêu *tối*, Lưu Bị xanh lá *sáng*. Mã màu ở `data/world.json`.
- Icon hành động vẽ bằng SVG; không dùng emoji trên UI thật.
- Tỉ lệ: cây nhỏ hơn thành; núi thành dãy liền; không khối chữ nhật trông như placeholder.

## Prototype

`docs/design/prototypes/` chứa các cảnh three.js dùng để render ảnh duyệt. Đây là mã nháp, không phải code sản phẩm: dùng làm điểm xuất phát khi triển khai phương án được chọn.

```bash
npm start
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome xvfb-run -a node docs/design/prototypes/render.mjs real campaign
# → test-results/design/real-campaign.jpg (+ .json toạ độ màn hình của thành và quân, để đặt nhãn UI)
```

Texture chi tiết (cỏ, pháp tuyến nước) tải từ thư mục ví dụ của repo three.js (MIT) lúc chạy. Trước khi phát hành phải thay bằng asset có giấy phép rõ ràng và ghi vào `assets/SOURCE.md`.
