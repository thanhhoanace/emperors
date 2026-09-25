# RuntimeEvent v1

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
  by?: factionId
}
```

## kind

`attack` `pact` `deal_accept` `deal_counter` `deal_refuse` `deal_break`
`annex` `internal` `fortify` `stratagem` `revolt` `event` `gate`
`succession` `realm_fall` `fall` `win`

Điều khoản: `truce` `alliance` `joint_war` `grain` `passage` `withdraw` `recognize` `break`.
`pact` AI = `clauses: ["truce"]`.

Fixture: `data/scenario/runtime-events.v1.json`.
