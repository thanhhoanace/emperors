# Kịch bản khóa — Thu 219, Thất hùng rìa

> **Vai trò:** SOT cho *chuyện thế giới và snapshot*. Luật số nằm ở `data/scenario/219.json` (bản nháp) rồi mới nhập `data/world.json` khi engine đọc được.
> Visual / DEM / thành: `docs/product/proposal-all-china.md` và `docs/design/`. File này không chỉ thị shader.
> Chủ dự án chốt hướng này ngày 2026-09-25. ADR: `docs/decisions/0007-scenario-219-periphery.md`.

## Premise một câu

Ba nước Tào–Thục–Ngô đã thành hình và đang giằng Kinh / Hán Trung. Bốn hoàng đế xuyên không xuất hiện ở **rìa và khe**, không ngồi trên ruột ba nước. Đầu game Tam Quốc áp đảo. Giữa game đế bứt nhờ địa thế + cải cách đời sau. Bàn cờ đọc như Chiến Quốc Thất Hùng.

## Không làm

- Không năm 190 (Đổng Trác vừa chết) và không năm 200 (Thục chưa có).
- Không chia 14 châu thành quận-huyện kiểu TW3K. Đơn vị luật là **nước / châu**.
- Không cho đế Ích, Từ, hay Trường An lúc mở ván — làm vậy xóa poster 3 màu.
- Không spawn 4 Tào mini 50–110k quân.
- Không cây Civ đầy đủ (era, district, settler spam).

## Mốc

**Mùa thu Kiến An 24 (219).**

Đúng lúc Quan Vũ đánh Phàn Thành / Tương Dương, Lưu Bị vừa có Hán Trung, Tôn Quyền giữ Giang Đông và nhìn Kinh. Ba khối màu có thật trên bản đồ. Kiến Nghiệp đã dựng (212). Nghiệp đã của Tào (204). Trường An trong quỹ đạo Tào.

Lệch có chủ đích (để poster đọc được, không phải để vá năm 200):

| Sử 219 | Kịch bản | Vì sao |
| --- | --- | --- |
| Tương Dương của Tào, Giang Lăng của Quan Vũ | Tách 2 châu: `jing` Tào, `jing_nan` Thục | Ba nước cùng chạm Kinh |
| Giao Châu nhà Sĩ Nhiếp, Tôn ảnh hưởng chứ chưa nuốt | `jiao` trung lập | Tôn không cần thêm đất; đế và Ngô có chỗ tranh Nam |
| Quan Vũ sắp mất Kinh (đông 219) | **Không** script chết Quan Vũ | Sandbox; nếu có event chỉ là cửa, predicate tắt khi Thục mất `jing_nan` |
| Hiến Đế ở Hứa | Giữ `emperor.province = yu` | Uy tín kinh sư |

Bốn chỗ lệch năm 200 trong `history.md` **không còn là quyết định kịch bản**. Hình thành năm 219: Lạc Dương / Trường An không còn là đống tro 190–195. Claude xử lý khi dựng vòng sau.

## Bản đồ luật — 20 châu

Lõi 3 nước giữ nguyên khối. Rìa là đất đế và trung lập. Map hình có thể vẽ cả nước (`proposal-all-china.md`); **ô có owner** chỉ 20 cái này. Tây Tạng / Taklamakan / rừng Mãn = đất hoang, không phải phe.

```
            you (trung lập)
               |
     bing Lý — ji Tào — qing Tào
         |      |         |
 longxi Tần — guan Tào — si_li Tào — yu Tào — xu Tào
         |      |         |           |        |
       hexi Vũ  han_zhong  jing Tào   yan Tào  huai Chu
         |      Thục       |
                 yi Thục — jing_nan Thục — jiang Ngô — yang Ngô
                  |                         |
              nanzhong                      jiao trung lập
              (trung lập)
```

| id | Châu | Thủ phủ | Chủ lúc mở | Vai trò |
| --- | --- | --- | --- | --- |
| `si_li` | Tư Lệ | Lạc Dương | Tào | Kinh cũ, cửa nhà Tào |
| `guan` | Quan Trung | Trường An | Tào | Cửa tây Tào; Tần thèm, không được cầm sẵn |
| `yu` | Dự | Hứa Xương | Tào | Hiến Đế, thủ phủ Tào |
| `ji` | Ký | Nghiệp | Tào | Kho Bắc; Lý thèm |
| `qing` | Thanh | Lâm Truy | Tào | Lõi đông |
| `yan` | Duyện | Xương Ấp | Tào | Lõi |
| `xu` | Từ | Bành Thành | Tào | Giáp khe Chu |
| `jing` | Kinh Bắc | Tương Dương | Tào | Giằng Kinh |
| `yi` | Ích | Thành Đô | Thục | Gốc Thục |
| `han_zhong` | Hán Trung | Nam Trịnh | Thục | Mới lấy 219; cửa Tần Lĩnh |
| `jing_nan` | Kinh Nam | Giang Lăng | Thục | Quan Vũ; giằng Ngô |
| `yang` | Dương | Kiến Nghiệp | Ngô | Gốc Ngô |
| `jiang` | Giang Hạ | Hạ Khẩu | Ngô | Cửa sông |
| `bing` | Tịnh | Tấn Dương | Lý | Rìa Bắc |
| `longxi` | Lũng Tây | Thiên Thủy | Tần | Rìa Tây |
| `hexi` | Hà Tây | Cô Tang (Vũ Uy) | Lưu Triệt | Hành lang tơ lụa |
| `huai` | Hoài | Chung Ly / Haozhou | Chu | Khe Tào–Ngô, không phải rìa thuần |
| `you` | U | Kế | Trung lập | Ô Hoàn / chỗ Lý khai |
| `nanzhong` | Nam Trung | Điền Trì | Trung lập | Lưng Thục |
| `jiao` | Giao | Phiên Ngung | Trung lập | Nhà Sĩ; chỗ Nam |

`liang` năm 200 (Trường An gán nhầm Lương Châu) **bỏ**. Quan Trung tách khỏi Lương. Hà Tây mới là Lương thật.

## Thế lực lúc mở

Ba nước = quân đông, đất sẵn, bận giằng.
Bốn đế = một châu, quân khoảng 20–35% **một cánh** Tào, cộng cửa sổ 8 mùa.

Chỉ số cụ thể: `data/scenario/219.json`. Không chép vào đây.

| Phe | Đất | Đường thắng | Cấm 8 mùa đầu |
| --- | --- | --- | --- |
| Tào | 8 châu lõi Bắc + Quan Trung + Kinh Bắc | Giữ Bắc, không quay rìa cho tới khi một đế có 2 châu hoặc mất `guan`/`ji` | — |
| Thục | Ích + Hán Trung + Kinh Nam | Kinh hoặc giữ cửa Bắc | Đừng đánh Nam Trung nếu Lưu Triệt chưa đụng Ích |
| Ngô | Dương + Giang Hạ | Kinh Nam hoặc Hoài | Đừng đánh Tần / Hà Tây |
| Tần | Lũng Tây | Lũng → Quan Trung khi Tào hở | Công Trường An sớm |
| Lý | Tịnh | U rồi Ký khi Tào nam tiến | Công Lạc Dương sớm |
| Lưu Triệt | Hà Tây | Chuỗi Đôn Hoàng–Hà Tây–Quan Trung, hoặc Nam Trung | Mở hai mặt Tần + Thục |
| Chu | Hoài | Hốt xác Tào–Ngô trên khe; thủy / hỏa khi đã có 2 châu | Công Kiến Nghiệp hoặc Hứa |

## Ba luật mới (Civ nhẹ)

Chi tiết hệ số khi nhập engine. Đây là hành vi.

### 1. Đình chiến khách — 8 mùa

Tam Quốc tấn công đế đang chỉ có 1 châu: trừ Uy, sĩ khí thấp, AI MOCK gần như không chọn. Hết 8 mùa hoặc đế đã có 2 châu thì hết bảo hộ.

Không phải hòa ước. Tào–Thục–Ngô vẫn đánh nhau bình thường. Đế đánh Tam Quốc được, nhưng mất bảo hộ với đúng nước bị đánh.

### 2. Khai hoang / chiêu hàng rìa

Ô trung lập (`you`, `nanzhong`, `jiao`) chiêu hàng rẻ hơn công thành nếu phe có `knowledge` hoặc thẻ vùng khớp (Lý–du mục, Vũ Đế–Hà Tây/Nam Trung, Tần–Hà Sáo sau này).

Đất hoang trên map lớn (Hà Sáo, Đôn Hoàng…) là công trình nhiều lượt, chưa phải châu turn 0. V1 luật chỉ cần 3 ô trung lập trên. Map hình vẽ thêm không bắt buộc có owner.

### 3. Cải cách 3 tầng — chỉ 4 đế

Tam Quốc không có cây này. Đó là giá của “biết đời sau / nhớ đường cũ”.

| Phe | Tầng 1 | Tầng 2 | Tầng 3 |
| --- | --- | --- | --- |
| Tần | Huyện–quận (thu châu mới đủ ngay) | Trực Đạo (nối Lũng–Quan Trung–Hà Sáo, chia quân thủ) | Tổng động viên (tuyển mạnh, dân tâm đau) |
| Lý | Phủ binh (nuôi quân rẻ ở `bing`/`you`) | Huyền Giáp (kỵ đồng bằng / thảo nguyên) | Thiên Khả Hãn (chiêu `you` gần như chắc sau một trận thắng Bắc) |
| Lưu Triệt | Đồn điền (biên không đói) | Thiên mã (kỵ nếu giữ Hà Tây) | Tơ lụa (chuỗi Hà Tây–Quan Trung nhân lương) |
| Chu | Vệ sở (quân tự nuôi một phần) | Lúa Chiêm (thu Hoài / lúa nam) | Hỏa khí / hỏa thuyền (bỏ 1 cấp thành; trên sông mạnh — vẫn không cho 1.000 thắng 10.000) |

Mỗi tầng = 1 hành động Nội chính khi đủ điều kiện (số châu / số mùa / giữ đúng vùng). Agent MOCK ưu tiên tầng 1 trước khi công thành lớn.

## Event cổng — predicate, không cây truyện

Engine chỉ chạy event khi điều kiện còn đúng. Phe chết thì event của phe đó tắt.

| id | Khi nào | Việc gì | Tắt khi |
| --- | --- | --- | --- |
| `guest_arrival` | Lượt 0 | 4 đế hiện; nhật ký kể 3 nước đang giằng | một lần |
| `fan_xiang_stalemate` | Tào giữ `jing`, Thục giữ `jing_nan`, lượt ≤ 10 | Hai bên mòn quân Kinh; Uy người giữ Phàn / Giang Lăng | một bên mất châu đó |
| `hanzhong_pressure` | Thục giữ `han_zhong`, Tào giữ `guan` | Tào muốn lấy lại; Thục thủ dễ hơn 2 mùa | mất Hán Trung hoặc Trường An |
| `wu_looks_at_jing` | Ngô sống, Thục giữ `jing_nan` | Ngô tăng trọng số đánh / minh với Tào | Thục mất Kinh Nam |
| `chang_an_gate` | Tần kề `guan`, Tào đang đánh Kinh hoặc Hán Trung | Tần được gợi ý công Quan Trung | Tào không còn bận, hoặc Tần đã lấy `guan` |
| `ye_exposed` | Lý kề `ji`, Tào quân nam | Lý được gợi ý đánh Nghiệp | Tào về Bắc |
| `huai_scavenge` | Chu sống, Tào và Ngô vừa đánh nhau kề `huai` | Chu tăng chiêu hàng / dân | — |
| `coalition_hegemon` | Một phe ≥ 4 châu hoặc cầm `guan`/`ji`/`yi` | Nước khác tăng trọng số nhắm phe đó | phe đó rơi xuống dưới mốc |
| Điểm yếu tính cách | như `world.json` hiện tại (elixir, xuanwu, purge, superstition, headache, succession) | Flavor | phe chết |

Không viết sẵn “Xích Bích 2”. Xích Bích đã qua (208). Cổng sông là `wu_looks_at_jing` + lợi thế thủy của Ngô / hỏa của Chu.

## Sương mù bất đối xứng

Tam Quốc: quyết định MOCK chỉ thấy châu mình + láng giềng.
Đế: thấy thêm đúng vùng họ “nhớ” (Tần: Quan Trung–Hà Sáo; Vũ Đế: Hà Tây–Nam Trung; Lý: U–Tịnh; Chu: Hoài–Bà Dương).

V1 có thể chỉ là trọng số AI + text nhật ký, chưa cần che map 3D.

## Nhịp một ván (mục tiêu clip)

| Mùa | Việc người xem phải thấy |
| --- | --- |
| 1–2 | Ba nước đánh Kinh / Hán Trung; 4 đế hiện, nội chính / khai |
| 3–8 | Cải cách tầng 1; trung lập về tay đế hoặc Thục/Ngô; Tam Quốc vẫn chưa rảnh |
| 9–16 | Một cửa mở: Trường An hoặc Nghiệp hoặc khe Hoài; hợp tung nếu một phe nhảy vọt |
| 17–32 | Hỗn chiến Thất hùng; thống nhất hoặc xưng bá |

Thống nhất: khoảng 12 / 20 châu, hoặc còn 1 phe. Không dùng mốc 9/14 của `world.json` cũ.

## Cân bằng — hướng, chưa phải số cuối

Sim 500 ván hiện tại (năm 200, đế ngồi lõi) cho Tào 3% và Tôn 28%. Snapshot này **trả lõi cho Tam Quốc**, nên Tào sẽ mạnh lại. Bù bằng: Tào bận Kinh, đình chiến 8 mùa, đế có cây cải cách.

Mục tiêu sau khi nhập engine: không phe nào < 8%, không phe nào > 25%, khoảng 30% ván thống nhất, ván 25–40 lượt. Đo bằng `npm run sim`, không đoán.

## Ranh giới với Claude

| Kịch bản giữ | Claude giữ |
| --- | --- |
| Năm 219, 20 châu có owner, chỗ ngồi đế, event, cải cách | DEM toàn quốc, thành Đông Hán, LOD, bake-map |
| `data/scenario/219.json` cho tới khi nhập engine | Không đọc file này để dựng mesh |
| `guan` dùng toạ độ Trường An hiện gán `liang` | Đổi `cities.json` / phế tích Lạc–Trường khi sang 219 |

Chỗ lệch với `proposal-all-china.md` mục 5: đề xuất kia để Tần **giữ Quan Trung** và Vũ Đế lấy Hà Tây trên nền năm 200. Kịch bản khóa: Tần **Lũng Tây**, Quan Trung của Tào, Vũ Đế Hà Tây, năm **219**. Map 30–35 châu biên là việc hình / mở rộng sau; luật v1 chỉ 20 ô có chủ.

## Việc engine phải làm khi nhập (không làm trong commit này)

1. Đọc `data/scenario/219.json` hoặc thay `world.json` sau khi sim ổn.
2. `guestTruce`, `reforms`, event có `when` (predicate), cạnh láng giềng cho châu mới.
3. Sửa `unifyProvinces`, test replay, `docs/product/rules.md` cùng commit.
4. Persona: thêm câu cho cửa `chang_an_gate`, `ye_exposed`, `huai_scavenge`.
