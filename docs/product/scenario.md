# Kịch bản khóa — Thu 219, Thất hùng rìa

> **Vai trò:** SOT cho *chuyện thế giới và snapshot*. Luật số nằm ở `data/scenario/219.json` (bản nháp) rồi mới nhập `data/world.json` khi engine đọc được.
> Gameplay khóa: `docs/product/GAMEPLAY-FREEZE.md`.
> Nhân vật: `docs/product/characters.md`.
> Tin: `docs/product/perception.md`. Log cũ: `docs/product/intel.md`.
> Visual / DEM / thành: `docs/product/proposal-all-china.md` và `docs/design/`.
> Chủ dự án chốt hướng này ngày 2026-09-25. ADR: `docs/decisions/0007-scenario-219-periphery.md`.

## Premise một câu

Ba nước Tào–Thục–Ngô đã thành hình và đang giằng Kinh / Hán Trung. Bốn hoàng đế xuyên không xuất hiện ở **rìa và khe**, không ngồi trên ruột ba nước. Đầu game Tam Quốc áp đảo. Giữa game đế bứt nhờ địa thế + **tin lệch** (A-hybrid: Lý/Chu có prior mẫu có điều kiện; Tần/Vũ không có walkthrough Tam Quốc). Bàn cờ đọc như Chiến Quốc Thất Hùng.

## Không làm

- Không năm 190 (Đổng Trác vừa chết) và không năm 200 (Thục chưa có).
- Không chia 14 châu thành quận-huyện kiểu TW3K. Đơn vị luật là **nước / châu**.
- Không cho đế Ích, Từ, hay Trường An lúc mở ván — làm vậy xóa poster 3 màu.
- Không spawn 4 Tào mini 50–110k quân.
- Không cây Civ đầy đủ (era, district, settler spam).
- Không đời 2 cho 4 đế. Không đời 3 cho Tam Quốc.
- Không để 4 đế nhận nhau xuyên không ở lượt 1. Không để Tam Quốc đọc tên đời sau từ cửa `guest_arrival`.

## Mốc

**Mùa thu Kiến An 24 (219).**

Đúng lúc Quan Vũ đánh Phàn Thành / Tương Dương, Lưu Bị vừa có Hán Trung, Tôn Quyền giữ Giang Đông và nhìn Kinh. Ba khối màu có thật trên bản đồ. Kiến Nghiệp đã dựng (212). Nghiệp đã của Tào (204). Trường An trong quỹ đạo Tào.

Lệch có chủ đích:

| Sử 219 | Kịch bản | Vì sao |
| --- | --- | --- |
| Tương Dương của Tào, Giang Lăng của Quan Vũ | Tách 2 châu: `jing` Tào, `jing_nan` Thục | Ba nước cùng chạm Kinh |
| Giao Châu nhà Sĩ Nhiếp | `jiao` trung lập, mặt Sĩ Nhiếp | Đúng sử |
| U năm 219 thuộc Tào | `you` trung lập, mặt Công Tôn Khang | Chỗ Lý khai; gộp Liêu |
| Nam Trung chưa phản | `nanzhong` trung lập, mặt Ung Khải | Lưng Thục / Vũ Đế |
| Quan Vũ sắp mất Kinh | **Không** script chết | Sandbox; mất châu thì ông mất theo luật tướng |
| Hiến Đế ở Hứa | `emperor.province = yu` | Uy tín kinh sư |

## Bản đồ luật — 20 châu

Lõi 3 nước giữ nguyên khối. Rìa là đất đế và trung lập. Map hình có thể vẽ cả nước; **ô có owner** chỉ 20 cái này.

```
            you (Công Tôn Khang)
               |
     bing Lý — ji Tào — qing Tào
         |      |         |
 longxi Tần — guan Tào — si_li Tào — yu Tào — xu Tào
         |      |         |           |        |
       hexi Vũ  han_zhong  jing Tào   yan Tào  huai Chu
         |      Thục       |
                 yi Thục — jing_nan Thục — jiang Ngô — yang Ngô
                  |           Quan Vũ          Lã Mông
              nanzhong                      jiao Sĩ Nhiếp
              Ung Khải
```

Bảng châu (uỷ phủ, chủ): giữ như trước. Tướng đứng từng ô: `characters.md`.

`liang` năm 200 **bỏ**.

## Thế lực lúc mở

Ba nước = quân đông, đất sẵn, bận giằng.
Bốn đế = một châu, quân khoảng 20–35% một cánh Tào, cửa sổ 8 mùa.
Số: `data/scenario/219.json`.

## Ba luật mới (Civ nhẹ)

### 1. Đình chiến khách — 8 mùa

Tam Quốc tấn công đế đang chỉ có 1 châu: trừ Uy, sĩ khí thấp, AI gần như không chọn. Hết 8 mùa hoặc đế đã có 2 châu thì hết bảo hộ.
Đế đánh Tam Quốc được, mất bảo hộ với đúng nước bị đánh.

### 2. Khai hoang / chiêu hàng rìa

Chi tiết mặt và ai chiêu rẻ: `characters.md` mục 1.
Đất hoang trên map lớn chưa phải châu turn 0.

### 3. Cải cách / statecraft — Round A.5 (chưa wire)

Bảng 3 tầng cũ (Tần huyện–quận, Vũ đồn điền/thiên mã/tơ, Chu lúa Chiêm, …) là log thiết kế đã bị `GAMEPLAY-FREEZE.md` thay. Không còn là luật. Không implement trong Round A. Không bonus theo id châu. Chưa chốt cây tiến triển cuối.

## Thừa kế (tóm)

- 4 đế: không kế. Chết → đất + nửa quân chia người diệt (nhiều người thì chia). Chi tiết `characters.md`.
- Tam Quốc: đời 1 → Tào Phi / Lưu Thiện / Tôn Đăng. Đời 2 chết → sập, chia như đế.

## Event cổng

Giữ bảng cũ. Thêm mặt tướng: `characters.md` mục 4 (`actor` / `defender` / `succession` / `realm_fall`).
Cửa là shot + cờ. Không phải tin để cả 7 phe đọc giống nhau — xem `intel.md`.

## Sương mù · danh tính

Chi tiết: `docs/product/intel.md`.

- Người xem / Claude: cả bàn.
- Tam Quốc: châu mình + láng giềng; không biết đế là ai; không thấy `time_displaced`.
- Tần / Vũ: không walkthrough Tam Quốc.
- Lý / Chu: prior mẫu lịch sử có neo — không phải tử vi. Neo gãy thì prior hết.
- Đế không nhận đế khác là xuyên không trừ khi tự xưng.
- Không sƠn đen 20 ô kiểu Civ.

Thống nhất: 12 / 20 châu, hoặc còn 1 phe.
Tướng đi đường: `march.md` + `actorChar`.
