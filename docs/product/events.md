# Event 219 — cốt + khung + cảnh

> SOT cho *cửa kịch bản* và *loại event engine*. Số máy: `data/scenario/gates.json`.
> Không phải cây A→Z. Mỗi cửa: `if` đúng thì bắn **một lần** (trừ khi `repeat`).
> Claude diễn `shot`. Engine chưa bắn — nhập cùng P1.

## Hai lớp

| Lớp | Ai sinh | Ví dụ |
| --- | --- | --- |
| Sandbox | Mọi lượt: attack, pact, annex, internal, fortify, stratagem, revolt, fall, win | Quân đi, đổi chủ |
| Cửa | Predicate thế giới 219 | Quan Vũ vây Phàn, khách tới |

Cửa **không** giết tướng, không đổi chủ đất. Chỉ thoại + cờ + camera. Chết / mất châu = luật sandbox.

## Loại engine (`kind`)

| kind | Field thêm | Claude |
| --- | --- | --- |
| `attack` | `from` `to` `fid` `other` `win` `actor` `defender` | Tướng đi đường (`march.md`) |
| `pact` / `deal_*` | `fid` `other` `sub` | Hai sứ, không hành quân |
| `annex` | `prov` `fid` `actor` `defender` | Mặt trung lập hàng |
| `internal` `fortify` `stratagem` | `fid` `prov?` | Đứng ô seat |
| `revolt` | `prov` | Cờ nổi |
| `event` | `id` (elixir…) | Flavor phe |
| `gate` | `id` (bảng dưới) `actors[]` | Đúng `shot` |
| `succession` | `fid` `from` `to` | Đời 2 lên |
| `realm_fall` | `fid` `killers[]` `shares[]` | Sập nước |
| `fall` `win` | `fid` | Hết ván |

`actor`/`defender` = id trong `characters.json`. Thiếu → `no_name`.

## Tám cửa + mở ván

Chi tiết máy ở `gates.json`. Đây là cốt mà người xem phải đọc được.

### `opening` — thu 219
Ba khối màu + 4 cờ rìa. Camera toàn cảnh rồi zoom Phàn.

### `guest_arrival` — lượt 0–1
Bốn đế xuất hiện Lũng Tây / Tịnh / Hà Tây / Hoài. Đình chiến khách bắt đầu (8 mùa). Không đánh đế 1 châu.

### `fan_xiang_stalemate`
Quan Vũ (`guan_yu`) ở `jing_nan` vây Tương Dương; Tào Nhân (`cao_ren`) thủ `jing`. **Không** chết. Hết khi mất `jing_nan` hoặc `jing` đổi chủ.

### `hanzhong_pressure`
Ngụy Diên `han_zhong` nhìn Trương Hợp `guan`. Lưu Bị vừa có Hán Trung.

### `wu_looks_at_jing`
Lã Mông `jiang` nhìn Giang Lăng. Tôn chưa đánh.

### `chang_an_gate`
Tần kề `guan` (Tào). Cửa Quan Trung mở — chưa phải thành rơi.

### `ye_exposed`
Lý ở `bing` nhìn Nghiệp (`cao_pi`). Sương mù Ký mở nếu chưa.

### `huai_scavenge`
Chu ở Chung Ly, giáp Trương Liêu `xu` và Dương.

### `coalition_hegemon`
Một đế ≥ 4 châu hoặc ngồi `guan`/`ji`/`yi`. Tam Quốc có thể liên minh (đã có `coalitionAt`).

## Cấm cửa

- `guan_yu_dead`, `fan_falls_scripted`, `sun_takes_jing_scripted`
- Cửa sau 219 (Dị Lăng, Ngũ Trường Nguyên) — sandbox tự sinh nếu đánh
- Cửa đổi owner

## Flavor phe (có sẵn `factions[].events`)

`elixir` Tần · `xuanwu` Lý · `purge` Chu · `superstition` Vũ · `headache` Tào  
Trừ số + thoại persona. Không cutscene dài.
