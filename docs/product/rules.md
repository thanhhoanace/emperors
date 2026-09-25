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

## Perception

`decide` không nhận `game` sau khi perception attach.
Band quân, không `bandValues` trong context.
Chi tiết `perception.md`. Hộp cát: `agent-sandbox.md`.

## Kết thúc

`unifyProvinces` / còn 1 phe / hết `maxTurns`.
`npm run sim -- 500`. Round A không tune máy A.5.
