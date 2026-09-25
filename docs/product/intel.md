# Tin · sương · danh tính

> Luật thông tin. Không đổi owner, không giết tướng, không quyết trận.
> Người xem clip ≠ đầu vào `decide()`.
> SOT kịch bản: `scenario.md`. Số: `data/world.json`.

## Premise

Bốn đế biết *Tam Quốc 219*. Tam Quốc không biết *họ là ai*.
Bốn đế **không** biết nhau xuyên không — kể cả khi đánh nhau — trừ khi một bên tự xưng rõ.
Không có liên minh 4 đế từ lượt 1. Đó là cửa lật bàn.

## Hai kênh

| Kênh | Ai | Thấy gì |
| --- | --- | --- |
| Clip / Claude | Người xem | Cả bàn, hành quân, tên thật, shot cửa |
| Quyết định | `decide()` / HUD 1 đế | Chỉ lớp tin phe đó có |

Cửa vẫn bắn shot cho Claude. MOCK 3K không đọc shot như sự thật.

## Ma trận biết

Gọi 3 nước = Tào / Thục / Ngô. Gọi khách = 4 đế.

| Người nhìn \ mục tiêu | 3 nước | Khách khác | Cửa lịch sử |
| --- | --- | --- | --- |
| 3 nước | Láng giềng + đồn | Chúa rìa lạ. Không biết đời sau, không biết tên thật | Đồn |
| Một đế | Sách sử + đai nhớ | Chúa rìa lạ. Không biết cùng xuyên không | Intel (thật) |
| Người xem | Hết | Hết | Shot |

“Biết Tam Quốc” = biết Tào–Thục–Ngô là ai, đang giằng Kinh / Hán Trung, cửa Phàn–Giang Lăng là thật.
Không = biết đúng quân Kiến Nghiệp nếu không kề / không nằm đai nhớ.

## Ba lớp tin (mỗi phe, mỗi lượt)

**A — Công khai trong thế giới**
Chủ 20 châu. Tướng đứng thành (mặt event). Có chúa lạ ở Lũng Tây, Tịnh, Hà Tây, Hoài.
Không công khai: tên đời sau, cải cách tầng, quân số đúng, hành động mùa trước của phe xa.

**B — Thấy được (kề + châu mình)**
Quân gần đúng. Cấp thành. Hành động mùa vừa rồi của chủ ô kề.
Giống TW3K: đội hiện khi sát biên.

**C — Đai nhớ — chỉ đúng đế đó**

| Đế | Đai nhớ |
| --- | --- |
| Tần | `longxi` `guan` `si_li` |
| Lý | `bing` `you` `ji` |
| Vũ | `hexi` `yi` `nanzhong` |
| Chu | `huai` `yang` `jiang` |

Trong đai: quân gần đúng + cửa lịch sử là **intel**.
Ngoài đai: lớp B nếu kề, không thì đồn (±30% quân lần thấy gần nhất, hoặc `unknown`).

Tam Quốc không có lớp C.

## Danh tính

State: `knownIdentity[observerFid][targetFid] = false|true`.

Mặc định lượt 1:

- Mọi phe: 3 nước = `true` với nhau (Tào biết Lưu, Tôn…).
- Mọi đế: 3 nước = `true` (họ đọc sử).
- 3 nước → mỗi đế = `false` (chúa rìa, không phải “Tần Thủy Hoàng”).
- Đế → đế khác = `false`.

Gặp nhau, đánh nhau, kết minh **không** bật cờ.
Họ thấy một chúa mạnh ở rìa. Không có lý do để đoán đời sau.

Bật `true` chỉ khi:

1. Phe đó **tự xưng** (điều khoản `recognize`, hoặc event `declare_title`).
2. Cải cách tầng 3 đi vào thế giới (hỏa khí, Huyền Giáp…) — láng giềng thấy dị vật, vẫn chưa chắc *tên*.
3. Người chơi chọn nói thẳng trong deal.

Không bật vì cửa `guest_arrival`. Cửa đó là kênh clip.

Khi `false`, HUD / quote MOCK dùng tên mặt đất:

| id | Tên thật (clip) | Tên trong thế giới |
| --- | --- | --- |
| `qin_shihuang` | Tần Thủy Hoàng | Chúa Lũng Tây |
| `li_shimin` | Lý Thế Dân | Chúa Tấn Dương |
| `liu_che` | Hán Vũ Đế | Chúa Cô Tang |
| `zhu_yuanzhang` | Chu Nguyên Chương | Chúa Chung Ly |

## Cửa: intel khác đồn

| Cửa | Đế (intel) | 3 nước (đồn) |
| --- | --- | --- |
| `fan_xiang_stalemate` | Quan Vũ đang vây Phàn, Tào kẹt | “Đánh lớn ở Kinh” |
| `wu_looks_at_jing` | Ngô sẽ đánh Kinh | Ngô “nhìn sông”, không chắc |
| `hanzhong_pressure` | Hán Trung vừa đổi chủ | Tào–Thục đánh ở Tày |
| `chang_an_gate` | Tần thấy cửa Quan | Tào thấy chúa Lũng áp biên nếu kề |
| `ye_exposed` | Lý thấy Nghiệp mỏng | Tào thấy áp Tịnh nếu kề |
| `huai_scavenge` | Chu thấy khe Tào–Ngô | Tào/Ngô thấy chúa Hoài |
| `coalition_hegemon` | Đế biết mình đã thành bá | 3 nước chỉ tăng trọng số nếu *nhìn thấy* ≥ 4 châu |

Đồn: +trọng số nhỏ, có thể sai. Intel: được phép đánh đúng cửa.

## `decide()` được đọc gì

```
knownTroops[fid]     // số, ước ±30%, hoặc null
lastSeenAction[fid]  // nếu lớp B/C mùa này hoặc trước
knownIdentity[fid]   // boolean
rumors[]             // gateId đồn
intel[]              // gateId thật — chỉ đế
```

Cấm MOCK 3K đọc `state.factions[emperor].troops` trừ khi lớp B.
Cấm MOCK đế đọc `type === time_displaced` của đế khác.
Cấm 3 nước tạo coalition “4 khách cùng loại”.

## HUD người chơi 1 đế

- Đai nhớ: sáng, có thanh quân.
- Ngoài đai, không kề: chỉ chủ đất + tên mặt đất.
- Đế khác: không ghi “xuyên không”, không hiện cải cách.
- Nút tùy chọn: tự xưng (mở deal `recognize`, mất yếu tố bất ngờ).

## Không làm ở V1

- Không sƠn đen 20 ô kiểu Civ (bản đồ Hán đã biết).
- Không che mesh khỏi Claude.
- Không gián điệp 12 tháng kiểu TW3K.
- Không để `guest_arrival` viết tên thật vào tai 3 nước.

## Thứ tự code

1. `knownIdentity` + tên mặt đất trong quote MOCK.
2. Lọc `knownTroops` trong `decide()`.
3. Cửa → `intel` / `rumor` theo loại phe.
4. HUD đai nhớ. Claude vẫn full board.
