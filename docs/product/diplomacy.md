# Ngoại giao — menu thỏa thuận

> SOT cho *chọn lựa ngoại giao*. Số lượt minh / tối đa minh nằm ở data. Engine chưa đọc file này.
> Chủ dự án 2026-09-25: không chỉ pact + chiêu trung lập; phải có màn chọn thỏa thuận.

## Không copy y nguyên

Civ6: một màn deal kéo 15 loại tài nguyên, favor, đô thị, đại hội.
TW3K: deal + quan hệ tướng + hôn nhân + chư hầu.

Emperors: **1 hành động / lượt**. Một lượt ngoại giao = 1 đối tác + tối đa 2 điều khoản (1 đòi + 1 cho). Đối phương: nhận / trả giá 1 điều / từ.

## Bảng điều khoản v1

| id | Tên trên UI | A đòi / A cho | Hiệu ứng |
| --- | --- | --- | --- |
| `truce` | Đình chiến | đòi hoặc cho | Không đánh nhau N mùa |
| `alliance` | Đồng minh | đòi | Như truce + không được bỏ mặt khi bên kia bị đánh (AI ưu tiên cứu). Tối đa 2 minh / phe |
| `joint_war` | Cùng đánh | đòi + chọn phe thứ 3 | Cả hai có lời khai chiến với X. Mùa sau AI X bị hai người tăng trọng số đánh |
| `grain` | Viện lương | cho hoặc đòi | Chuyển một phần `grain` |
| `passage` | Mượn đường | đòi | N mùa được đánh *qua* châu họ như thể kề (không chiếm châu họ) |
| `withdraw` | Rút quân | đòi + chọn châu biên | Họ cam kết không tấn công châu đó N mùa. Không đổi chủ |
| `recognize` | Thừa nhận ranh | cho | +Uy họ, họ dễ nhận `truce`/`alliance` |
| `break` | Bãi ước | — | Hủy truce/alliance. Mất Uy. `betrayal` thấp thì AI hiếm khi chọn |

Chiêu châu trung lập **không** nằm ở màn này. Vẫn là ngoại giao nhưng mục tiêu là châu, không phải phe — một nhánh cũ, giữ.

## Lượt của người chơi (1 đế)

1. Chọn ⚖ Ngoại giao.
2. Chọn đối tác (6 phe còn sống).
3. Chọn **1 điều đòi** và tuỳ chọn **1 điều cho**.
4. Đối phương (MOCK):
   - `accept` → ký, event `pact`/`deal`
   - `counter` → đổi 1 điều (vd đòi `grain` thêm). Người chơi nhận hoặc từ trong cùng lượt
   - `refuse` → hết lượt ngoại giao, đôi bên ít Uy

Không có vòng thương lượng dài. Tối đa 1 lần trả giá.

## AI chấm điểm (lời)

Cộng: cùng kẻ địch, đang yếu, `traits.diplomacy` cao, người đưa `grain`/`recognize`, cửa `coalition_hegemon` chống phe dẫn đầu.
Trừ: đang giằng đất (`jing`/`han_zhong`), vừa bị đánh, `joint_war` nhắm minh hữu họ, Tần/`loyaltyDrift` âm khó ký `alliance`.

Đình chiến khách 8 mùa: Tam Quốc dễ `truce` với đế 1 châu, khó `joint_war` chống đế.

## Event engine phải trả

`kind`: `deal_accept` | `deal_counter` | `deal_refuse` | `deal_break` | `annex` (trung lập).
Kèm `fid`, `other`, `clauses[]`, `text`.

## Cấm v1

Bán châu, hôn nhân, chư hầu, favor, đại hội, đồ. Đủ clip; chưa đủ để gãy 1 action/lượt.
