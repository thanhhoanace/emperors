# Nhân vật 219 — mặt trên bản đồ

> SOT cho *ai đứng ở châu nào, ai kế vị, 3 ô trung lập*. Số quân nằm ở `data/scenario/219.json`.
> Tướng không phải phe thêm: **1 lệnh / phe / lượt** vẫn đúng. Tướng là mặt để clip và event `from`/`to` biết vẽ ai.
> Nguồn tên: roster TW3K / sử 219, không copy mesh hay portrait từ game.
> Claude: chỉ cần `id`, `name`, `province`, `role`. Không đổi chỗ ngồi.

## Luật gắn tướng

- Mỗi châu có chủ → đúng 1 tướng đứng (`governor`).
- Event `attack`: tướng châu xuất phát đi; thủ là tướng châu đích.
- Mất châu: tướng đó **chết hoặc hàng** (hàng nếu `knowledge` / chiêu; chết nếu công thành). Không có tù binh v1.
- Phe lấy châu mới mà hết tướng dự phòng → đứng `no_name` ("tướng gắc"), clip vẫn chạy, yếu flavor.
- 4 đế: chính họ là tướng ô đầu. Không gán tướng TW3K vào triều đế.

## 1. Ba ô trung lập

Không phải phe thứ 8–10. Không có lượt riêng. Mỗi ô: một mặt + quân trấn + cách vào.

### `you` — U châu · Kế

| | |
| --- | --- |
| Mặt | **Công Tôn Khang** (`gongsun_kang`) |
| Sử | Ông ở Liêu Đông. U năm 219 trên giấy là của Tào sau Bạch Lang (207). |
| Lệch | Gộp ảnh hưởng Công Tôn + tàn Ô Hoàn vào một ô `you` để có mặt TW3K, không thêm châu Liêu. |
| Quân | `neutral.you` |
| Vào bằng chiêu | Lý (Thiên Khả Hãn / thẻ du mục) rẻ. Tào rẻ hơn đế khác (từng đánh Ô Hoàn). |
| Vào bằng đánh | Kề `bing` hoặc `ji`. |
| Nếu bị diệt | Đất + ~nửa quân về tay người lấy. Không kế vị. |

Cửa: sau khi Lý thắng 1 trận ở `bing`/`you`, `li_shimin` chiêu `you` gần như chắc (tầng 3). Không script Công Tôn dâng đầu Viên Thượng — đã qua.

### `nanzhong` — Nam Trung · Điền Trì

| | |
| --- | --- |
| Mặt | **Ung Khải** (`yong_kai`) |
| Sử | Hào tộc Ích chưa phản hẳn năm 219; nổi với Mạnh Hoạch ~223. |
| Lệch | Cho ô mặt sớm để Thục / Vũ Đế có chỗ khai phía nam. **Không** spawn Mạnh Hoạch. |
| Quân | `neutral.nanzhong` |
| Vào bằng chiêu | Lưu Bị rẻ (lưng Ích). Lưu Triệt rẻ nếu đã có đồn điền. Tào / Ngô / đế khác khó. |
| Vào bằng đánh | Kề `yi`. |
| Nếu bị diệt | Như `you`. |

Cửa: Thục đừng đánh Nam Trung 8 mùa đầu trừ khi Lưu Triệt đã kề `yi`.

### `jiao` — Giao châu · Phiên Ngung

| | |
| --- | --- |
| Mặt | **Sĩ Nhiếp** (`shi_xie`) |
| Sử | Đúng. Sống đến 226. Tôn chưa nuốt Giao năm 219. |
| Lệch | Không. |
| Quân | `neutral.jiao` |
| Vào bằng chiêu | Ngô rẻ nhất. Chu rẻ nếu đã có `yang` hoặc lúa nam. Thục trung bình. |
| Vào bằng đánh | Kề `yang` hoặc `jing_nan`. |
| Nếu bị diệt | Như `you`. Sĩ Nhiếp không có đời 2 trên bàn. |

Không cho 3 ô này ký `alliance`. Chỉ chiêu / đánh / để yên.

## 2. Thừa kế và chết

### Bốn đế — không truyền ngôi

Tần, Lý, Lưu Triệt, Chu: chết là hết phe.

Chết khi: mất hết châu, hoặc mất ô đang đứng mà không còn châu khác để dời (thủ phủ rơi, không còn đất).

**Phân đất / quân**

1. Châu bị chiếm *trong lượt này* đã về đúng tay đánh.
2. Châu còn lại của đế chết + kho lương + **nửa** quân sống: chia cho *người diệt*.
3. Người diệt = mọi phe đánh trúng đất họ trong cùng `resolveTurn` (kể `joint_war`).
4. Một người → hết. Nhiều người → chia châu theo **kề trước**, rồi theo sát thương; quân chia theo số châu vừa nhận. Lẻ → phe sát thương cao nhất.
5. Nửa quân còn lại bỏ trốn. Không đổ về trung lập trừ khi không có ai đánh lượt đó (dị thường) — lúc đó châu thành trung lập `no_name`.

Đế không có `heir`. Không có triều đời 2.

### Tam Quốc — một đời kế, rồi sập

| Phe | Đời 1 | Đời 2 | Đời 2 chết |
| --- | --- | --- | --- |
| Tào | Tào Tháo | **Tào Phi** (`cao_pi`) | Sập, chia như đế |
| Thục | Lưu Bị | **Lưu Thiện** (`liu_shan`) | Sập, chia như đế |
| Ngô | Tôn Quyền | **Tôn Đăng** (`sun_deng`) | Sập, chia như đế |

Đời 1 chết (mất ô đang đứng / hết châu nhưng còn đất để dời + leader down):

- Đời 2 lên, phe **còn**. Đất không chia.
- Trừ Uy, trừ dân tâm (hệ số khi nhập engine).
- Tôn Đăng năm 219 còn trẻ: trừ thêm dân tâm (nhiếp chính). Vẫn là đời 2 đúng mạch, không đổi sang Tôn Hoàn.
- Tướng phụ giữ nguyên châu.

Đời 2 chết: như 4 đế. Không đời 3 (không Tào Duệ, không Lưu Thiện → Gia Cát làm nhiếp).

Trung lập: không đời 2.

## 3. Roster lúc mở — thu 219

Chỉ người **còn sống và đáng vẽ**. Không Chu Du (210), không Lỗ Túc (217), không Hạ Hầu Uyên (đầu 219 Định Quân).

### Tào

| id | Tên | Châu | Vai |
| --- | --- | --- | --- |
| `cao_cao` | Tào Tháo | `yu` | Lãnh đạo |
| `cao_pi` | Tào Phi | `ji` | Kế vị; kho Nghiệp |
| `cao_ren` | Tào Nhân | `jing` | Phàn / Tương Dương |
| `zhang_he` | Trương Hợp | `guan` | Cửa Hán Trung sau Định Quân |
| `xiahou_dun` | Hạ Hầu Đôn | `si_li` | Lạc Dương |
| `zhang_liao` | Trương Liêu | `xu` | Hợp Phì / Từ — giáp Chu |
| `zang_ba` | Tang Bá | `qing` | Thanh |
| `li_dian` | Lý Điển | `yan` | Duyện |

Dự phòng khi lấy thêm đất: `xu_huang` Tî Hoàng, `yue_jin` Nhạc Tiến, `sima_yi` Tư Mã Ý (chưa cầm châu).

### Thục

| id | Tên | Châu | Vai |
| --- | --- | --- | --- |
| `liu_bei` | Lưu Bị | `yi` | Lãnh đạo |
| `guan_yu` | Quan Vũ | `jing_nan` | Giang Lăng / Phàn |
| `wei_yan` | Ngụy Diên | `han_zhong` | Hán Trung |
| `liu_shan` | Lưu Thiện | — | Kế vị, chưa cầm châu |

Dự phòng: `zhuge_liang` (cố vấn ô `yi`, không đánh lượt 0), `zhang_fei`, `zhao_yun`, `huang_zhong`.

Cửa `fan_xiang_stalemate` / `wu_looks_at_jing`: mặt phải là Quan Vũ. **Không** script ông chết. Mất `jing_nan` thì ông chết hoặc hàng theo luật mất châu.

### Ngô

| id | Tên | Châu | Vai |
| --- | --- | --- | --- |
| `sun_quan` | Tôn Quyền | `yang` | Lãnh đạo |
| `lu_meng` | Lã Mông | `jiang` | Nhìn Kinh |
| `sun_deng` | Tôn Đăng | — | Kế vị, trẻ |

Dự phòng: `lu_xun` Lụ Tốn, `gan_ning` Cam Ninh, `zhu_ran` Chu Nhiên, `ling_tong` Lăng Thống.

### Bốn đế

| id | Tên | Châu |
| --- | --- | --- |
| `qin_shihuang` | Tần Thủy Hoàng | `longxi` |
| `li_shimin` | Lý Thế Dân | `bing` |
| `liu_che` | Hán Vũ Đế | `hexi` |
| `zhu_yuanzhang` | Chu Nguyên Chương | `huai` |

Không gán Lý Tư / Tần Thủc Bảo lên map v1. Đế lấy châu 2 → `no_name` cho tới khi có roster đời sau (ADR riêng).

### Trung lập

| id | Tên | Châu |
| --- | --- | --- |
| `gongsun_kang` | Công Tôn Khang | `you` |
| `yong_kai` | Ung Khải | `nanzhong` |
| `shi_xie` | Sĩ Nhiếp | `jiao` |

## 4. Event engine phải trả thêm

Ngoài `from`/`to`/`fid`/`win`:

- `actor` — id tướng đi
- `defender` — id tướng thủ
- `kind: succession` — `fid`, `from` đời 1, `to` đời 2
- `kind: realm_fall` — `fid`, `killers[]`, `shares[]` (châu + quân từng kẻ)

## 5. Cấm v1

Duel TW, quan hệ tình cảm, đồ tướng, tù đổi, hôn nhân, tướng đi lặch châu mỗi lượt (assignment). Một tướng = một châu cho đến khi chết / đổi chủ.
