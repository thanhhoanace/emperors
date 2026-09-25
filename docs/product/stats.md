# Chỉ số tướng — đề xuất

> Chưa lock. Phe vẫn dùng `traits` trong data. Tướng thêm lớp mỏng này khi nhập engine.
> Không copy 5 chỉ số TW3K (Expertise / Resolve / Instinct / Cunning / Authority).

## Hai game làm gì

**TW3K:** 5 chỉ số + skill + đồ + quan hệ. Phục vụ trận realtime và assignment. Quá nặng cho 1 lệnh / lượt.
**Civ6:** leader = 1–2 *ability* (luật riêng), không có tướng phụ. Gần phe `traits` của ta hơn là roster 30 người.

## Lớp của ta

| Lớp | Đã có | Thêm |
| --- | --- | --- |
| Phe (7 leader) | `traits` + `weights` | giữ |
| Tướng (ô) | tên + châu | 3 trục 1–5 + 1 thẻ |

Tướng không có quân riêng. Chỉ nhân hệ số khi họ là `actor` / `defender` / `governor`.
Trần: mỗi trục đưa tối đa ±15% — giữ luật 1.000 không hạ 10.000.

### Ba trục (1 yếu – 5 xuất sắc)

| | Tên | Khi nào |
| --- | --- | --- |
| Võ | `wu` | `actor` → sức đánh; `defender` → sức thủ |
| Trí | `zhi` | mưu / chiêu châu này / `defect` nhắm họ |
| Chính | `zheng` | ô họ đứng: thu lương ô đó, dân tâm phe khi nội chính |

Hệ số gợi ý: `(stat - 3) * 0.05` → 1 = −10%, 3 = 0, 5 = +10%.

### Một thẻ (tùy người)

`cavalry` | `river` | `siege` | `steppe` | `fire` | `admin`

Chỉ kích khi địa hình / hành động khớp (sông + `river`, đồng + `cavalry`, củng cố + `siege`…). +10% thêm, không cộng dồn 2 thẻ.

Leader đế: 3 trục mang tính cách (đã có `traits` phe — không cộng hai lần). Tướng phụ mới dùng bảng này.

## Bảng nháp 219 (chưa sim)

| id | Võ | Trí | Chính | Thẻ |
| --- | --- | --- | --- | --- |
| `guan_yu` | 5 | 3 | 2 | `siege` |
| `cao_ren` | 4 | 3 | 3 | `siege` |
| `zhang_liao` | 5 | 3 | 2 | `cavalry` |
| `zhang_he` | 4 | 3 | 3 | `cavalry` |
| `xiahou_dun` | 4 | 2 | 3 | — |
| `lu_meng` | 3 | 5 | 3 | `river` |
| `wei_yan` | 4 | 2 | 2 | — |
| `cao_pi` | 2 | 4 | 4 | `admin` |
| `shi_xie` | 2 | 4 | 5 | `admin` |
| `gongsun_kang` | 3 | 3 | 3 | `steppe` |
| `yong_kai` | 3 | 2 | 3 | — |
| `zhuge_liang` (dự) | 2 | 5 | 5 | `admin` |
| `lu_xun` (dự) | 3 | 5 | 3 | `fire` |

4 đế + 3 lãnh đạo Tam Quốc: **không điền bảng này** — dùng `traits` phe.

## Không làm

Skill tree, đồ, satisfaction, dual, level lên sao. Đổi chỉ số giữa ván chỉ khi `succession` (Tôn Đăng: Võ 1 Trí 2 Chính 2).
