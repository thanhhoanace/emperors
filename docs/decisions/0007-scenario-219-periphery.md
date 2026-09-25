# 0007 — Kịch bản Thu 219, đế ở rìa, 20 châu

**Trạng thái:** Chấp nhận · 2026-09-25 (chủ dự án chốt hướng sau khi so với năm 200 / quận TW3K / map toàn quốc)

## Bối cảnh

`data/world.json` đang là năm 200, 14 châu, bốn đế ngồi Lương / Tịnh / Từ / Ích. Tào bị xé đất (sim: 3% thắng). Bốn chỗ lệch sử năm 200 chờ quyết. `docs/product/proposal-all-china.md` đề xuất map toàn quốc và để Tần giữ Quan Trung.

Chủ dự án muốn: Tam Quốc đã thành hình (không phải Đổng Trác vừa chết), 3 nước giằng co rồi 4 đế tới như Thất hùng, đế không có lõi sẵn, bù bằng map rìa + tăng tiến nhẹ kiểu Civ.

## Quyết định

1. Mốc **thu 219**, không 190 và không 200.
2. Đơn vị luật là **châu / nước** (20 ô có chủ). Không xuống quận-huyện TW3K.
3. Tào–Thục–Ngô giữ lõi. Đế spawn Lũng Tây, Tịnh, Hà Tây, Hoài.
4. Ba luật mới: đình chiến khách 8 mùa, khai hoang rìa, cải cách 3 tầng chỉ 4 đế.
5. Event là predicate trong `data/scenario/219.json`, không phải cây truyện.
6. File hình / 30 châu biên trong `proposal-all-china.md` vẫn là đề xuất visual. Luật v1 không bắt buộc 30–35 chủ.

## Hệ quả

- Bốn chỗ lệch trong `docs/design/history.md` hết là blocker kịch bản. Hình Lạc Dương / Trường An năm 219 không còn phế tích 190 — Claude xử lý khi dựng vòng sau.
- `data/world.json` + engine **chưa đổi** trong commit kịch bản. Nhập snapshot khi có sim.
- Tần không ngồi Trường An (khác mục 5 của proposal-all-china).
