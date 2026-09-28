# RuntimeEvent v1 (attack v2)

> Hợp đồng Claude / HUD đọc. Engine raw giữ field cũ (`defender` = phe trên attack raw).
> `resolveTurn().events` đã **chuẩn hoá**. Không đọc `defender` trên object v1.

## Shape

```
{
  v: 1,
  kind: string,
  text: string,
  tone: "good" | "bad" | "neutral",
  fid?: factionId,
  id?: string,
  from?: provinceId,
  to?: provinceId | charId,
  win?: boolean,
  actorChar?: charId,
  defenderFid?: factionId | "neutral",
  defenderChar?: charId,
  other?: factionId,
  prov?: provinceId,
  clauses?: string[],
  actors?: charId[],
  shot?: object,
  ok?: boolean,
  killers?: factionId[],
  shares?: { fid, troops }[],
  by?: factionId,
  commit?: number,                  // attack: quân bên đánh đưa ra trận
  attLoss?: number,                 // attack: quân bên đánh mất
  defLoss?: number,                 // attack: quân bên thủ mất
  battle?: BattleDescriptor         // attack v2, xem dưới
}
```

## `attack` v2: BattleDescriptor

Mỗi `attack` (trừ `guest_truce`) mang `battle`, v2. Thêm trường, không đổi trường v1: bản đọc v1 bỏ qua được. Engine dựng từ đúng các số referee đã tung (`resolveAttack`), **không rút số ngẫu nhiên nào**: kết quả, tổn thất, cân bằng như v1 (test `tests/battle-contract.test.mjs` giữ ảnh chụp ván trước khi có descriptor).

```
battle: {
  v: 2,
  turn: number,                     // lượt diễn ra trận
  site: provinceId,                 // = to
  from: provinceId,                 // = from
  terrain: string, river: boolean,  // của site (world.json)
  siege: true,                      // v1: mọi trận là đánh thành; false để dành cho dã chiến v2
  walls: 1–4,                       // 1 + mức củng cố (0–3) bên đánh gặp; 0 để dành cho dã chiến
  attacker: { fid, gen, men, units: { bo, cung, ky, thuy } },
  defender: { fid | "neutral", gen, men, units, holding: true },
  result: { win, losses: { A, D }, routed: "A" | "D", turns: 3 | 4 | 5 }
}
```

- `men`: bên đánh = `commit` v1; bên thủ = số quân thủ v1 (`defenseOf`). `units` là `men` chia theo tỉ lệ binh chủng của phe (`world.json` `factions[].arms`, trung lập `neutral.arms`), số nguyên, cộng đúng `men`. **Thủy** chỉ đánh khi `site` ven sông; bên đánh cần cả `from` ven sông; không thì thủy binh đánh bộ (cộng vào `bo`). Engine v1 chỉ có một số quân mỗi phe, nên đây là cách chia hiển thị; khi có đạo quân (freeze v2) `units` là của đạo quân thật.
- `gen`: `actorChar` / `defenderChar` (attach-219 điền, `null` nếu không có).
- `losses` = `attLoss` / `defLoss`. `routed`: bên tan (bên thua). `turns`: tỉ lệ sức đã tung, lệch xa (|ln| > 0,5) 3 lượt, vừa (> 0,2) 4, sát 5.
- Người chơi không đọc `battle` của RuntimeEvent: họ đọc bản đã làm mờ trong TurnObservation (`perception.md`, mục Trận). Spectator (`?demo=1`) đọc thẳng.
- Hình: `src/world/battle-cut.js` dựng quân bộ + cung (`bo + cung`), kỵ, thuyền theo `units`.

## kind

`attack` `pact` `deal_accept` `deal_counter` `deal_refuse` `deal_break`
`annex` `internal` `fortify` `stratagem` `revolt` `event` `gate`
`succession` `realm_fall` `fall` `win`

Điều khoản: `truce` `alliance` `joint_war` `grain` `passage` `withdraw` `recognize` `break`.
`pact` AI = `clauses: ["truce"]`.

Fixture: `data/scenario/runtime-events.v1.json` (hai `attack` mang `battle`).

## Diplomacy model (canonical)

Locked in `docs/product/diplomacy.md`:

- **kind** = outcome: `pact` (AI minh đơn), `deal_accept`, `deal_counter`, `deal_refuse`, `deal_break`, `annex`
- **clauses[]** = type: `truce` `alliance` `joint_war` `grain` `passage` `withdraw` `recognize` `break`

Do not use `deal_alliance` / `deal_grain` as event kinds.
`deal_counter` is reserved; MOCK AI does not emit it yet.
