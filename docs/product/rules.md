# Luật chơi

> Số: `data/world.json`. Code: `src/engine/engine.js` + `perception.js`.
> Gameplay: `docs/product/GAMEPLAY-FREEZE.md`.

## Thế giới

- **20 châu**, thu 219, `startSeason` = Thu. Lượt 1 = Thu 219; qua Đông thì sang năm.
- 7 thế lực + trung lập.
- 1 lượt = 1 mùa.

## Một lượt

1. `fillDecisions`: người chơi giữ lệnh; AI = `projectPerception` → `decide(context)`.
2. `resolveTurn` trên truth: Củng cố → Nội chính → Ngoại giao → Mưu → Đánh (mạnh trước) → Hậu cần → Thắng.
3. RuntimeEvent v1 cho clip.

## Tấn công

Ô kề. `from` hợp lệ (châu mình, kề đích) thì dùng; không thì `originFor`.
Mưu: `Engine.STRATAGEMS` = discord, burn, defect.
Ngoại giao V1: pact | annex. Deal đủ điều khoản = vòng sau.
Mỗi trận ra `attack` kèm `battle` (BattleDescriptor v2, `runtime-event.md`): quân mỗi bên chia bộ / cung / kỵ / thủy theo `factions[].arms` (thủy chỉ ở thành ven sông), tường = 1 + mức củng cố, số lượt trận 3–5 theo độ chênh sức. Chỉ để mô tả: không rút số ngẫu nhiên, không đổi kết quả hay tổn thất v1.
Đình chiến khách: Tam Quốc không đánh đế đang giữ đúng 1 châu trong lượt 1–8. Đế đánh một phe Tam Quốc thì mất bảo hộ với đúng phe đó. Lệnh trái luật bị referee từ chối, không vào combat. Chi tiết `GAMEPLAY-CONTRACT-v1.1.md`.

## Trận theo lượt (v2, `src/engine/battle.js`)

API thuần, chưa nối vào lượt v1: `resolveAttack` vẫn một lần tung sức. Nối vào đâu, khi nào, người chơi ra lệnh ra sao là việc của freeze v2.

- **Bàn trận:** 3 làn (trái, giữa, phải) × 6 hàng; hàng 0–1 bên đánh, 4–5 bên thủ; đánh thành thì hàng 4–5 là tường. Tối đa 5 lượt.
- **Làn:** `open` đồng trống (kỵ +30 %), `ford` bến sông (lội −20 %, thuyền +15 %), `wood` rừng thưa (kỵ −30 %, cháy được), `hill` đồi (bên thủ +25 %, kỵ lên dốc −15 %). Bản đồ đưa làn qua `opts.lanes` (laneProvider); không có thì theo địa hình châu, châu ven sông có một làn bến.
- **Cánh quân:** mỗi bên 1–6 cánh từ `units` của BattleDescriptor: bộ trải các làn (đồn trú giữ cả ba mặt tường), kỵ ở sườn, cung và thuyền sau làn giữa. Trạng thái cánh `{ id, side, arm, men, start, morale, lane, row, order, routed, gone }`, `Battle.view(b)` cho hình đặt khối quân.
- **Lệnh:** tiến, xung phong (kỵ, +40 % cú va), giữ (thủ +25 %, bộ giữ chặn kỵ +50 %), bắn (cung, tầm 2 hàng), vòng sườn (kỵ, lần chạm tới +50 %), rút (lùi, hồi sĩ khí), hỏa công (một lần mỗi trận, tướng Mưu ≥ 7, cần gió 60 %). Cánh không có lệnh nhận lệnh tự động (cũng là lệnh của máy).
- **Một lượt:** đi (bên đánh trước) → lửa → tên → giáp lá cà (cùng làn, cách ≤ 1 hàng; mất tối đa 35 % mỗi lượt) → đột phá (một cánh vào hàng sau của làn địch bỏ trống: leo tường, hoặc đánh hậu trận; cả bên kia −12 sĩ khí) → tan (dưới 80 người hoặc sĩ khí < 18).
- **Kết thúc:** một bên hết cánh; hoặc hết lượt 5: đánh thành thì bên đánh thắng chỉ khi đã có cánh qua tường, không thì thành đứng; dã chiến thì hơn 20 % sức còn lại (quân × sĩ khí) là thắng, không thì hoà. `Battle.outcome(b)` có dạng `result` của BattleDescriptor; cánh tan mất thêm nửa số còn lại.
- **Tướng:** năm chỉ số 1–10: Uy (sĩ khí đầu trận 55 + 3·Uy), Dũng (sức đánh ±3 %/điểm quanh 5), Kiên (sức thủ ±3 %/điểm), Mưu (hỏa công; dự đoán, mục 4), Tài (chưa dùng trong trận). Trung dưới 70 trừ tới −8 sĩ khí, từ 85 +3; chúa tự cầm quân 0. Đặc tính theo tác dụng: `charge`, `walls`, `navy`, `stubborn`, `commoner` (`Battle.TRAITS`); tướng nào có gì là dữ liệu (freeze v2, chưa có trong `data/`). Không có tướng: quan giữ thành 4/4/3/4/5.
- **Ngẫu nhiên:** gió và vận mỗi bên (±15 %) trong ngày, dao động từng đòn; tất cả từ `seed` của trận.
- **Số:** của spike demo 1, không đổi: test so từng seed với `demo1/src/hn-rules.js` (Thọ Xuân khi Trương Liêu còn trong thành 0 %, Liêu đã rút một đạo 20 %, hợp binh 100 %). Trên các trận v1 (`npm run sim -- 500 --battles`, cả hai bên tự động, tướng thường): cùng kết quả với v1 ở 85 % số trận, bên đánh thắng 75 % (v1 88 %), bên đánh mất 26 % quân (v1 22 %), trận dài 3 / 4 / 5 lượt: 36 / 29 / 35 %.

## Dự đoán của tướng (v2, `Battle.forecast`)

Trước trận, tướng Mưu cao nhất bên hỏi đọc trận: `Battle.forecast(plan, tướng, { key })` → `{ analyst, label, estWin, est: { la, ld }, sa, sd, reasons, band, lanes }`.

- **Sự thật** là 24 trận mô phỏng của `plan` với 24 ngày khác (gió, vận khác ngày thật). `plan` là cái bên hỏi biết: quân địch qua perception (±20 %), nên đọc sai địch và tướng kém cộng dồn.
- **Sai số:** một độ lệch cố định cho mỗi câu hỏi (`key`, ví dụ lượt + nơi + đạo quân), trong ±(42 − 3,5·Mưu) %, tối thiểu 6 %; hỏi lại không ra số khác. Đo trên 200 câu hỏi: lệch trung bình Mưu 3 là 0,11, Mưu 5 0,09, Mưu 7 0,07, Mưu 10 0,035; nhãn trùng nhãn thật 73 / 77 / 87 / 97 %.
- **Nhãn:** Thắng lớn (> 0,8), Thắng (> 0,55), Ngang ngửa (> 0,42), Thua (> 0,18), Thua lớn. **Không in %.** `estWin` chỉ để vẽ (thanh, màu).
- **Số của tướng:** sức hai bên (`sa`, `sd`, kiểu Civ, làm tròn trăm), thương vong ước (`est.la`, `est.ld`), tối đa 6 lý do ±% lớn nhất (địa thế làn, tường, xung phong, bến sông…), đều lệch theo cùng độ lệch của tướng.
- Kết quả không bao giờ mang tỉ lệ thật hay độ lệch; `Battle.odds` (tỉ lệ thật) chỉ cho test và báo cáo cân bằng.

## Perception

`decide` không nhận `game` sau khi perception attach.
Band quân, không `bandValues` trong context.
Chi tiết `perception.md`. Hộp cát: `agent-sandbox.md`.

## Kết thúc

`unifyProvinces` / còn 1 phe / hết `maxTurns`.
`npm run sim -- 500`. Round A không tune máy A.5.
