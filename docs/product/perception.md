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
- `decide` **chỉ** nhận DecisionContext.
- `fillDecisions` / `decideAll` **bắt buộc** projectPerception rồi decide(context).
- Gọi `decide(game, fid)` ném lỗi.
- Map band → số **private** trong engine. Context không có `bandValues`.

## DecisionContext v1

```
{
  v: 1,
  fid, seed, turn,
  calendar: { year, season },
  self: { troops, grain, loyalty, prestige, seat, provinces[], pacts, last, grudge,
          weights, traits, name, short, quotes, homeCity },
  world: { owners, neighbors, strategic, emperorAt, cities, publicLabels },
  others: { [fid]: { publicLabel, claimedIdentity, alive, troopBand,
                     lastAction, lastSeenTurn, adjacent, provinces } },
  legal: { actions, attackTargets, annexTargets, pactTargets, fortifyTargets },
  prior: null | { id, status: "active"|"obsolete", bias, focus },
  rules: { lateWarTurn, pactMax, coalitionAt, fortMax, commitBase, commitAggression }
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

## intelLog

```
state.intelLog = {
  lastSeen: { [observer]: { [target]: { troops, action, turn, province } } },
  claims: { [fid]: string }
}
```

## API

`Engine.projectPerception(g, fid)`
`Engine.decide(context)`
`Engine.fillDecisions(g, playerFid, playerDecision)`
`Engine.observeFactions(g)`
