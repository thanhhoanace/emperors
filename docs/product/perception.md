# Perception · sở hữu chỉ số

> Codex đúng kiến trúc. File này chốt *ai ghi số đâu* để không fan-out.
> Chưa wire. Round A sau playable loop.

## Ba thứ không được trộn

| Lớp | Ai đọc | Lưu đâu |
| --- | --- | --- |
| Truth | `resolveTurn`, sim referee, Claude *trình diễn* | `state` + `data/world.json` |
| Perception | `decide(fid)`, HUD 1 đế | **Tính mỗi lượt**. Persist chỉ log |
| Presentation | Claude shot / full board | RuntimeEvent v1 |

`decide(cao_cao)` cấm đọc `state.factions.li_shimin.troops`.
Test: `decide` chỉ nhận `projectPerception(g, fid)`.

## Persist gì

Không lưu 7 knowledge graph đầy đủ.
Rebuild được từ truth + 3 log:

```
state.intelLog = {
  lastSeen: { [observer][targetFid]: { troops, action, turn, province } },
  identity: { [observer][targetFid]: "unknown"|"suspected"|"known"|"self_revealed" },
  rumors:   { [observer]: [gateId] }
}
```

`projectPerception(g, fid)` ra snapshot Codex mô tả (estimate, confidence, publicName, intel[]).

Identity: biết tên ≠ biết xuyên không. `known` = "Doanh Chính, kẻ dựng hiệu Tần". Chỉ spectator biết đời sau.

## Derived capability

5 stat catalog → 5 capability *cố định hệ số* → engine đọc 3 số trận.

Hệ số nằm **một chỗ**: `data/scenario/formulas.json` (Grok). Không nhân tag/affinity/fort vào từng công thức.

Combat đọc `FIELD` `DEFENSE` `SIEGE`.
Nội trị / chiêu đọc `GOVERN` `DIPLOMACY`.

## Sở hữu file

JSON vẫn đúng cho *catalog tĩnh*. Sai cho số suy ra.

| File | Chủ | Được có | Cấm |
| --- | --- | --- | --- |
| `data/world.json` | Grok owner/start/rules; Claude lonlat | quân thật, chủ ô | perception, 5 stat tướng |
| `data/scenario/officers.json` | Grok | id, tên, ô mở, 5 stat *mở*, hệ, tag, homeRegion, preferences[], relations *hiếm* | 210 ô affinity, XP, capability |
| `data/scenario/intel-rules.json` | Grok | đai nhớ, publicName, nậc identity, rumor vs intel | snapshot từng phe |
| `data/scenario/formulas.json` | Grok | trọng số 70/30, hệ số confidence | — |
| `data/scenario/gates.json` | Grok | cửa, shot | ai được biết cửa |
| `state.*` | Engine runtime | troops, owner, firedGates, intelLog | capability đã nhân |
| `src/engine/perception.js` | Grok | `projectPerception` | DOM |
| Claude runtime | Claude | đọc RuntimeEvent | đọc raw troops để AI |

Thêm phe thứ 8: sửa `intel-rules` + doctrine tag, không sửa 30×8 ô.

## Affinity

Không bảng 30×7.
Tính: homeRegion khớp ô chủ + doctrine khớp cải cách phe + `relations` chỉ cặp nổi (Quan–Lưu, Lã–Tôn, Liêu–Tào).
Doctrine vocab đóng: `centralization` `merit` `aristocracy` `river` `cavalry` `colony`. Không đẻ tag tự do.

## Governor / commander

Một officer, hai slot. 1 action / phe.
`{ action, from, to, commander }`.
Kéo Quan Vũ khỏi Kinh = công ↑ thủ Kinh ↓. Không thêm lượt.

## Outcome khi mất ô

Không chết mặc định. Round C: retreat / captured / wounded / dead.
V1–A: mất ô → retreat nếu còn đường, else captured. Chết hiếm.

## Round

A Perception + test AI không lao đúng 4 đế yếu.
B Officer 5 stat → capability, governor/commander.
C Capture / retreat.
D XP / doctrine.
