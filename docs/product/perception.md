# Perception — Round A

> SOT hành vi: `docs/product/GAMEPLAY-FREEZE.md`.
> Officers / statecraft A.5 / credibility: chưa.

## Ranh giới

```
truth state
    → projectPerception(game, observerFid)
    → DecisionContext
    → decide(context)
```

`resolveTurn` đọc truth. RuntimeEvent = clip.

Sau khi `perception.js` đã attach:
- `decide(context, rng)` chỉ nhận DecisionContext. `rng` là `{seed}` private, không nằm trong context.
- `fillDecisions` / `decideAll`: `observeFactions` một lần, project mọi phe từ cùng snapshot, quyết định xong mới ghi `faction.last`.
- `projectPerception` không mutate intel và không đọc quyết định cùng lượt của phe khác.
- Gọi `decide(game, fid)` ném lỗi.
- Không `bandValues`, không `seed` trong context.

## DecisionContext v1

```
{
  v: 1,
  fid, turn,
  calendar: { year, season },
  self: { troops, grain, loyalty, prestige, seat, provinces[], pacts, last, grudge,
          weights, traits, name, short, quotes, homeCity },
  world: { owners, neighbors, strategic, emperorAt, cities, publicLabels, guestProtection },
  others: { [fid]: { publicLabel, claimedIdentity, alive, troopBand,
                     lastAction, lastSeenTurn, adjacent, provinces } },
  legal: { actions, attackTargets, annexTargets, pactTargets, fortifyTargets },
  prior: null | { id, status: "active"|"obsolete", bias, focus },
  provinceIntel: { [pid]: { owner, city, troopBand, commander, fortLevel, lastSeenTurn, source } },
  rules: { lateWarTurn, pactMax, pactTurns, coalitionAt, fortMax, commitBase, commitAggression }
}
```

## Band

`unknown | weak | medium | strong | very_strong`

Ngưỡng: `data/scenario/intel-rules.json`. `Engine.bandValue(band)` private.

Kề → band hiện tại. Không kề → stale từ intelLog hoặc `unknown`.

## Danh tính

`publicLabel` + optional `claimedIdentity`. Không credibility.

## Prior A-hybrid

Chỉ `li_shimin`, `zhu_yuanzhang`. Mẫu `wu_jing_pressure`.
Tần / Vũ / Tào / Lưu / Tôn: `prior === null`.

Neo active (cả bốn phải đúng; gãy một cái → obsolete):

- Quan Vũ còn sống
- `jing_nan` của Lưu Bị
- `jiang` của Tôn Quyền
- `jing` của Tào Tháo

`bias.attack` nhân **một lần**, và chỉ vào điểm số mục tiêu nằm trong `focus`. Không nhân `w.attack` toàn cục. Prior = cửa lịch sử hấp dẫn hơn, không phải phe trở nên hung hơn.

## intelLog

```
state.intelLog = {
  lastSeen: { [observer]: { [target]: { troopBand, action, turn, province } } },
  claims: { [fid]: string },
  provinces: { [observer]: { [pid]: { troopBand, commander, fortLevel, turn } } }
}
```

Bản cũ `lastSeen.*.troops` vẫn đọc được ra band. Bản mới không lưu số quân.

Chi tiết tỉnh, cửa nhìn sự kiện, khách, minh ước: `GAMEPLAY-CONTRACT-v1.1.md`.

## Turn observation

`Engine.projectTurnObservation(game, observerFid, turnResult, beforeSnapshot)` → `{ visibleEvents, publicNews }`.
`Engine.ownersSnapshot(game)` chụp chủ châu trước resolve.
Không copy `ev.text`. Spectator vẫn dùng `result.events`.

## API

`Engine.projectPerception(g, fid)`
`Engine.decide(context, rng)`
`Engine.fillDecisions(g, playerFid, playerDecision)`
`Engine.observeFactions(g, turn?)`
`Engine.observeProvinces(g, turn?)`
`Engine.projectTurnObservation(g, fid, turnResult, beforeSnapshot)`
`Engine.ownersSnapshot(g)`
