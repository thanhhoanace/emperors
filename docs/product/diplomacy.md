# Ngoại giao

> Luật đang chạy: `docs/product/GAMEPLAY-CONTRACT-v1.1.md`.
> V1.1 chỉ có **minh ước 6 mùa** (`rules.pact.turns`) và chiêu châu trung lập.
> Bảng điều khoản bên dưới là hướng sau, **engine chưa đọc**.

## V1.1 đang chạy

Một main action / phe / lượt.

- AI gửi pact cho người chơi: phiên phải đặt `state.playerFid` trước `resolveTurn`. Khi đó engine không roll. `pendingReactions` → `answerReaction` accept/reject. Reaction không tiêu main action. Chưa trả lời thì `resolveTurn` trả `{ blocked: true }` và không đổi state. HUD hiện chưa đặt `playerFid`, nên chưa chặn — Claude phải gắn cùng modal.
- Accept tạo pact hai chiều, `untilTurn = turn + 6`. Reject: không pact, không phạt uy toàn cục, lượt AI vẫn đã tiêu.
- Pact AI–AI hoặc người chơi gửi cho AI: engine roll như cũ. Ký rồi thì sống trên đồng hồ 6.
- `world.pacts` trên DecisionContext là đồ thị công khai `{ a, b, untilTurn, remainingTurns }`.
- `diplomaticPressure[fid]` = `none | watch | high`, suy từ pact công khai + số châu khối + biên + grudge của mình. Không ma trận quan hệ, không team cố định, không quân ẩn.

## Không copy y nguyên

Civ6: một màn deal kéo 15 loại tài nguyên, favor, đô thị, đại hội.
TW3K: deal + quan hệ tướng + hôn nhân + chư hầu.

Emperors sau này: **1 hành động / lượt**. Một lượt ngoại giao = 1 đối tác + tối đa 2 điều khoản (1 đòi + 1 cho). Đối phương: nhận / trả giá 1 điều / từ. **Chưa làm trong v1.1.**

## Bảng điều khoản — chưa wire

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

Chiêu châu trung lập vẫn là nhánh `annex`.

## Cấm v1.1

Bán châu, hôn nhân, chư hầu, favor, đại hội, đồ, team A/B, điểm thù lưu.
