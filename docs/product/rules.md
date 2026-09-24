# Luật chơi

> **Vai trò:** giải thích *cơ chế* của engine bằng lời. Con số nằm ở `data/world.json` (khoá được ghi trong ngoặc),
> code nằm ở `src/engine/engine.js`. Tài liệu này không lặp lại con số, để không bao giờ lệch với dữ liệu.
> Đổi cơ chế thì sửa engine, `tests/engine.test.mjs` và file này trong cùng một commit.

## Thế giới

- 14 châu, mỗi châu có thủ phủ, địa hình, độ màu mỡ, dân số, hệ số phòng thủ và danh sách láng giềng (`provinces[]`).
- 7 thế lực (`factions[]`): 4 hoàng đế xuyên không và 3 quân phiệt Tam Quốc. Thế lực trung lập giữ các châu còn lại với quân trấn thủ cố định (`neutral.garrison`).
- Hán Hiến Đế ở một châu (`emperor.province`). Ai giữ châu đó được cộng Uy tín mỗi lượt; chiếm hoặc chiêu hàng được châu đó thì được cộng Uy tín lớn một lần.
- 1 lượt = 1 mùa. Năm bắt đầu và tên mùa ở `meta`.

## Năm chỉ số (thanh bar trong UI)

| UI | Trường | Nghĩa |
| --- | --- | --- |
| Binh | `troops` | Tổng quân. Chia đều cho các châu khi phòng thủ; thủ phủ được hệ số thêm (`combat.seatBonus`). |
| Lương | `grain` | Kho lương. Thu theo màu mỡ × dân số; mỗi lính tốn lương mỗi lượt (`economy.upkeepPerTroop`). Hết lương thì quân bỏ trốn, dân tâm giảm. |
| Đất | số châu | Đạt `unifyProvinces` là thống nhất thiên hạ. |
| Dân | `loyalty` 0–100 | Nhân vào thu nhập, tuyển quân và sĩ khí. Dưới `loyalty.revoltBelow` có thể nổ ra khởi nghĩa, mất châu về tay trung lập. |
| Uy | `prestige` 0–100 | Bảng xếp hạng sắp theo Uy tín. Tăng khi thắng trận, kết minh, mưu kế thành công; giảm khi thua, bị lộ, bội minh. |

## Một lượt

1. **Quyết định.** Lần lượt từng thế lực còn sống chọn 1 trong 5 hành động và nói 1 câu đúng giọng (`decide`). Hiện là agent MOCK: trọng số theo tính cách (`weights`) bị bẻ theo tình huống (thiếu lương thì lo nội chính, bị đe doạ thì củng cố/ngoại giao, thấy thời cơ thì đánh). Câu thoại lấy từ `data/personas/<id>.json`.
2. **Trọng tài** (`resolveTurn`) giải quyết theo thứ tự: Củng cố → Nội chính → Ngoại giao → Mưu kế → Tấn công (mạnh đánh trước) → Hậu cần → Kiểm tra thắng.
3. **Kết quả** trả về danh sách sự kiện (văn kể + dữ kiện để UI diễn hoạt) và thay đổi số liệu từng thế lực.

## Năm hành động

| Hành động | Mục tiêu | Hiệu ứng |
| --- | --- | --- |
| ⚔ Tấn công | châu láng giềng không phải của mình | Đem một phần quân (`commitBase` + độ hiếu chiến) đánh. Thắng: chiếm châu, bắt hàng binh (`surrender`); thua: mất quân. Nếu mục tiêu là minh hữu thì huỷ binh, trừ khi tính cách cho phép bội minh (`traits.betrayal`). |
| 🕊 Ngoại giao | thế lực khác, hoặc châu trung lập kề bên | Kết minh `pact.turns` lượt (tối đa `pact.max` minh hữu mỗi bên), hoặc chiêu hàng châu trung lập không đổ máu. |
| 🏛 Nội chính | thủ phủ | Thu lương, tuyển quân, tăng dân tâm. Hoàng đế xuyên không có hệ số tri thức hậu thế (`traits.knowledge`). |
| 🎭 Mưu kế | thế lực đối thủ | Ly gián (giảm dân tâm), đốt lương, hoặc chiêu hàng tướng (cướp quân). Thất bại thì mất Uy tín. |
| 🛡 Củng cố | châu bị đe doạ nhất | Tăng cấp thành luỹ (tối đa `combat.fortMax`), thêm chút quân và dân tâm. |

## Trọng tài

- Sức đánh = quân đem đi × hệ số tấn công × sĩ khí (từ dân tâm) × bonus (kỵ binh trên đồng bằng, phạt đánh lên phương Bắc…).
- Sức thủ = quân giữ châu × phòng thủ địa hình × thành luỹ × hệ số phòng thủ × sĩ khí × bonus (thủy quân giữ châu có sông…).
- Mỗi bên nhân ngẫu nhiên ±`combat.randomSpread`. Luật kịch bản gốc được test giữ: **1.000 quân không bao giờ hạ được thành 10.000 quân.**
- Mất thủ phủ thì dời đô về châu đông dân nhất còn lại; mất hết châu thì diệt vong, kẻ diệt được hấp thụ một phần tàn quân.

## Tính cách và biến cố

- Mỗi thế lực có `traits` (hệ số) và `events` (điểm yếu lịch sử, xác suất mỗi lượt). Văn bản biến cố ở persona.
- Ví dụ: Tần Thủy Hoàng dân tâm tự giảm; Lý Thế Dân dính bóng ma Huyền Vũ Môn; Chu Nguyên Chương thanh trừng công thần; Hán Vũ Đế về già mê tín; Lưu Bị báo thù kẻ vừa cướp đất của mình.
- Sau lượt `lateWarTurn` mọi thế lực liều hơn. Thế lực đang dẫn đầu (từ `coalitionAt` châu) bị các nước khác ưu tiên nhắm vào.

## Kết thúc

- Chiếm đủ `unifyProvinces` châu → **thống nhất thiên hạ**.
- Chỉ còn một thế lực → thống nhất thiên hạ.
- Hết `maxTurns` lượt → thế lực nhiều châu nhất (hoà thì Uy tín cao hơn) **xưng bá thiên hạ**.

## Cân bằng

- `npm run sim -- 500` chạy 500 ván tự động và in tỉ lệ thắng từng thế lực, độ dài ván.
- Mục tiêu hiện tại: thế lực nào cũng có cơ hội thắng; ván dài vừa đủ để quay clip. Kết quả gần nhất ghi ở `docs/status.md`.
