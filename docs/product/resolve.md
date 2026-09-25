# resolveTurn — thứ tự một mùa

> SOT cho *trọng tài*. Code đang chạy: `src/engine/engine.js`. Số: `data/world.json`.
> Phần 219 (deal, thừa kế, `actor`) là đích khi nhập engine, chưa có trong file js.

## Một lượt, nhìn từ ngoài

```
1. decide() × mỗi phe còn sống     → danh sách quyết định (chưa đổi số)
2. resolveTurn(decisions)
     snapshot số cũ
     củng cố → nội chính → ngoại giao → mưu
     tấn công (phe nhiều quân trước)
     hậu cần + biến cố tính cách
     hết minh đã tới hạn, kiểm tra thắng
3. trả { events[], deltas[], state }
```

Mọi `rand` đi qua `state.seed` (mulberry32). Cùng seed + cùng decision → replay y.
UI / Claude chỉ diễn `events[]`. Không tự sửa quân.

## Bước 1 — decide (hiện MOCK)

Mỗi phe chọn **đúng 1** trong 5: đánh / ngoại giao / nội chính / mưu / củng cố.
Trọng số lấy `weights` persona, bẻ theo lương, dân tâm, đe dọa, dẫn đầu, muộn game.
Quyết định có `from` khi đánh (châu kề, ưu tiên thủ phủ).
Người chơi (chưa wire): thay `decide()` của đúng 1 phe bằng lựa chọn tay. 6 phe kia vẫn MOCK.

## Bước 2 — resolve, đúng thứ tự

Thứ tự cố định. Không xen kẽ theo tính cách.

### Củng cố
Châu mộc tiêu của mình, `fort` +1 (trần `fortMax`). Quân ×1.03, dân tâm +3.
Event: `fortify`.

### Nội chính
Cộng lương (màu mỡ × dân × knowledge), tuyển (trần troopCap), dân tâm, +1 Uy.
219: đây là chỗ lấy cải cách 3 tầng nếu đủ điều kiện.
Event: `internal`.

### Ngoại giao — code hiện tại
- `annex` châu trung lập kề: roll theo Uy + `diplomacy`. Đật: lấy đất + nửa quân trấn.
- `pact`: roll 2 chiều, tối đa `pact.max` minh, kéo `pact.turns` mùa.

219 (`diplomacy.md`): đổi `pact` thành 1 đòi + 1 cho; đối phương accept / counter 1 lần / refuse. `annex` giữ, có bonus theo `characters.json` `annexBonus`.

### Mưu
`discord` (trừ dân tâm địch) / `burn` (trừ lương) / `defect` (cướp quân). Trượt: mất Uy.
Chưa gắn tướng cụ thể. 219: `defect` trúng thì có thể lấy tướng dự phòng của địch (không lấy leader).

### Tấn công — mạnh trước
Sắp phe đánh theo `troops` giảm dần. Phe chết ở bước trước thì bỏ lệnh đánh của họ.

Sức đánh = quân đem (`commitBase` + hiếu chiến, kẹp 30–80% tổng quân) × `attack` × sĩ khí × bonus địa hình.
Sức thủ = quân chia đều các châu (× `seatBonus` ở thủ phủ) × phòng địa hình × thành × sĩ khí.
Hai bên nhân ngẫu nhiên ±`randomSpread`.
Luật giữ: 1.000 không hạ 10.000.

Thắng: đổi `owner`, hấp thụ một phần quân thủ, trừ quân đánh. Mất thủ phủ địch → `moveSeat`. Hết châu → `eliminate` (hiện tại: 1 người diệt hấp thụ `captureAbsorb`).
Thua: mất quân đem, không đổi chủ.
Đánh minh + không `betrayal` → hủy lệnh.

219:
- Event thêm `actor` / `defender` (tướng ô `from` / ô đích).
- `guestTruce`: Tam Quốc đánh đế 1 châu trong 8 mùa → trừ Uy, AI hiếm chọn.
- `eliminate` đế hoặc Tam Quốc đời 2: chia đất theo `characters.md` (nhiều killer).
- Đời 1 Tam Quốc chết ở ô đang đứng nhưng còn đất → `succession`, không `fall`.

`passage` (mượn đường): `originFor` được đi qua châu minh như kề. Vẫn 1 đích.

### Hậu cần
Mỗi phe sống: +income, −upkeep. Hết lương → quân bỏ, dân tâm xuống.
Giữ Hiến Đế (`emperorAt`) → +Uy.
Biến cố tính cách (`events` persona) roll từng phe.
Minh hết hạn → xóa pact.
219: gates (`chang_an_gate`…) chạy ở đây nếu predicate đúng — chỉ đổi trọng số / text, không đánh giùm.

### Thắng
Đủ `unifyProvinces` hoặc còn 1 phe → `over`.
Hết `maxTurns` → nhiều châu nhất (hòa thì Uy).

## Đồng thời và mâu thuẫn

Hai phe đánh cùng một châu: phe nhiều quân resolve trước. Phe sau có thể đánh nhầm chủ mới, hoặc đích không còn kề → lệnh hủy, event `fizzle`.
Hai phe đánh nhau đôi công: cũng mạnh trước; lệnh sau vẫn đánh nếu còn sống.
Không có "đánh giữa đường". Quân không đứng ô trung gian.

## Việc Claude cần từ events[]

| kind | Vẽ |
| --- | --- |
| `attack` | Tướng `actor` đi `from` → `to` (`march.md`) |
| `annex` / `pact` / `deal_*` | Sứ giả, không hành quân |
| `succession` | Đổi chân dung leader |
| `realm_fall` | Cờ đổi màu theo `shares[]` |
| `fortify` / `internal` | Camera về thành |
