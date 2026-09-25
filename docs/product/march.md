# Hành quân — phần nhìn, không đổi luật

> SOT cho Claude / frontend khi diễn event `attack`.
> Luật vẫn là: chọn châu đích kề, đem một phần quân, trọng tài tính xong rồi mới vẽ.

## Luật (engine) — không đụng

Tấn công = từ châu A (thủ phủ hoặc châu kề đích) sang châu B láng giềng. Không có ô đường. Không có stack dừng giữa hai thành. `passage` (mượn đường) chỉ làm B thành "kề logic" qua đất minh, vẫn 1 đích.

## Việc người xem thấy (Claude)

Sau `resolveTurn`, mỗi event `attack` diễn xong rồi mới tới event kế.

1. Camera bay tới thủ phủ phe đánh.
2. Một tướng cỡ lớn + cờ màu phe đi theo đường đã nướng (cạnh láng giềng). Tốc độ theo 1×/2×/4×.
3. Tới dưới thành đích: cắt cảnh trận ngắn (battle.js) hoặc xôkhiên 2 cờ nếu máy yếu.
4. `win: true` → cờ đổi màu, nhật ký. `win: false` → cờ rút về.

Event engine cần đủ: `kind: attack`, `fid`, `from`, `to`, `other`, `win`, `text`. Không cần tọa độ từng bước — đường lấy từ láng giềng + `assets/map`.

## Cấm

Người chơi không kéo quân từng bước. Không pause giữa đường để đổi đích. Đó là TW campaign, không phải luật này.
