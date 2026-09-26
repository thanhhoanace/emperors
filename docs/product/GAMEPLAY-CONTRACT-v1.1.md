# Gameplay / Perception contract v1.1

> SOT cho vòng này: province intel, quan sát lượt, đình chiến khách, phản ứng minh ước, áp lực khối.
> `GAMEPLAY-FREEZE.md` thắng nếu lệch. Không phải A.5, không Officers, không currency mới.
> Presentation chỉ được vẽ những gì contract này chiếu. Không tự lọc RuntimeEvent.

## Luồng

```
truth (state + RuntimeEvent[])
    → perception
    → DecisionContext + provinceIntel + TurnObservation
    → Claude vẽ đúng phần đã chiếu
```

RuntimeEvent đầy đủ vẫn là sự thật cho engine, replay, debug, spectator/demo.
Người chơi chỉ nhận observation. Cấm đếm việc giấu (`hiddenBattles`, v.v.).

## A — Province intel

`DecisionContext.provinceIntel[pid]`:

```
{
  owner,            // bản đồ công khai, kể cả khi quân chưa thấy
  city,
  troopBand,        // unknown | weak | medium | strong | very_strong
  commander,        // string | null
  fortLevel,        // number | null (0 = đã thấy lũy cấp 0, null = chưa biết)
  lastSeenTurn,     // number | null
  source            // own | adjacent | memory | public | unknown
}
```

V1 không phát `source: "public"`. Chưa quan sát quân sự = `unknown`. Chủ/thành vẫn lấy từ bản đồ công khai.

| Tình huống | troopBand | commander | fort | source |
| --- | --- | --- | --- | --- |
| Châu của mình | band lực đóng tại châu | có | số thật | `own` |
| Châu kề (kể cả trung lập) | band, không số thật | có nếu thấy người giữ thành | số thật (tường nhìn thấy) | `adjacent`, `lastSeenTurn` = lượt hiện tại |
| Đã thấy, nay không kề | đúng bản ghi cũ, không refresh truth | bản ghi cũ | bản ghi cũ | `memory` |
| Chưa từng thấy | `unknown` | null | null | `unknown` |

Người chơi đánh **châu**, không đánh cả phe. Band châu lấy từ lực đóng tại châu (phần quân địa phương), rồi quy ra band. Không ghi số quân vào context. Không gọi `defenseOf` để đưa `power`/tỉ lệ vào quyết định.

Cùng band (ví dụ 26k và 44k đều `medium`) → cùng `provinceIntel`, cùng context, cùng `decide` với cùng RNG riêng.

### intelLog

```
state.intelLog = {
  lastSeen: { [observer]: { [faction]: { troopBand, action, turn, province } } },
  claims: { [fid]: string },
  provinces: { [observer]: { [pid]: { troopBand, commander, fortLevel, turn } } }
}
```

Chỉ lưu quan sát tối giản. Không lưu DecisionContext, số quân ẩn, tỉ lệ đánh, xác suất thắng, snapshot chiếu.

`lastSeen` cũ có `troops` thì đọc vẫn ra band; bản ghi mới chỉ lưu `troopBand`.

## B — Turn observation

`Engine.projectTurnObservation(game, observerFid, turnResult, beforeSnapshot)`

`beforeSnapshot` = `{ owners: { [pid]: owner } }` chụp **trước** `resolveTurn`.
`Engine.ownersSnapshot(game)` tạo đúng hình đó.

Trả về đúng hai mảng. Không có field đếm việc giấu.

```
{ visibleEvents: [...], publicNews: [...] }
```

Không copy `ev.text`. Không redact bằng regex. Chiếu theo nghĩa.

### visibleEvents

Chỉ field observer được biết. Hình thường gặp:

```
{
  kind, role, actorId, actorLabel, otherId, otherLabel,
  from, to, prov, sub, outcome, ownLoss, untilTurn,
  titleKey, textKey
}
```

`actorLabel` / `otherLabel` là `publicLabel` (hoặc "Trung lập"). Không tên thật đế ẩn. Không `time_displaced`.

`outcome`: `win` | `loss` | `ok` | `fail` — theo phía observer với trận của chính họ.

`ownLoss`: chỉ thương vong của observer. Không `commit`, không quân địch, không thương vong địch.

V1 được thấy nguyên event khi:

1. Việc của chính observer.
2. Việc nhắm thẳng phe observer.
3. Việc xảy ra trên châu của observer.
4. Minh ước công khai — xem publicNews; hai bên thấy cả lời từ chối.
5. Cửa công khai (dưới đây) đi vào publicNews, không nhét raw text vào visibleEvents.
6. Trường hợp khác chỉ khi luật quan sát hiện tại cho phép. V1 không tự mở thêm.

Không tự thấy: đánh xa, mưu xa, nội chính địch, củng cố xa, số quân địch, thương vong địch, danh tính ẩn, ai đánh ai trong trận không quan sát.

Trận của mình: biết lệnh, châu đích, châu xuất phát, thắng/thua, thương vong mình. Không biết quân địch hay thương vong địch.

Địch đánh mình: biết châu mình bị đánh, nhãn công khai của kẻ đánh, thắng/thua, thương vong mình. Không biết lực địch, thiệt hại địch, không bắt buộc biết châu xuất phát của địch, không tên thật.

Đánh xa, không có cửa quan sát: không có visibleEvent về trận đó.

### publicNews

Chỉ hệ quả công khai. Hình:

```
{
  kind, id, prov, city,
  ownerId, ownerLabel,
  actorId, actorLabel, otherId, otherLabel,
  untilTurn, accepted,
  titleKey, textKey
}
```

Được phép V1:

- châu đổi chủ (`kind: "ownership"`) — chỉ chủ mới, thành, không thương vong, không tường thuật trận
- minh ước đã ký (`kind: "pact"`, `accepted: true`)
- phe diệt vong công khai, không kẻ giết
- cửa `opening`, `guest_arrival` (`kind: "gate"`, `textKey` riêng, không actors, không raw text)
- thắng cuộc công khai (`kind: "win"`) không quote persona

Cửa khác (tension) **không** tự thành tin. Không lộ danh tính ẩn vì RuntimeEvent có `actors` hoặc câu "Tần, Đường, …".

Cấm: "có 2 trận ở nơi khác", đếm mưu/nội chính giấu, thiệt hại giấu, actor giấu.

Không có gì công khai và không có gì được thấy → `publicNews: []`. Engine không bịa câu "không có tin".

Spectator/demo tiếp tục đọc `result.events` thô.

## C — Đình chiến khách

Luật thật, không chỉ helper.

- `rules.guestTruceTurns = 8`
- Có hiệu lực lượt 1–8 inclusive
- Kẻ đánh là phe Tam Quốc (`warlordIds`)
- Chủ châu là đế (`emperorIds`)
- Đế đang giữ đúng 1 châu
- Đế giữ ≥ 2 châu → mất bảo hộ toàn cục
- Lượt 9 → hết

`remainingTurns = turn > 8 ? 0 : 8 - turn + 1`
(lượt 1 → 8, lượt 8 → 1, lượt 9 → 0).
`active` còn đòi đúng 1 châu. Hết hạn hoặc đủ 2 châu → `active: false`, `protectedFrom: []`.
`remainingTurns` vẫn là đồng hồ lịch khi đế đã có 2 châu nhưng chưa tới lượt 9; `active` mới là "còn được bảo".

Phá ước: đế có **cú đánh hợp lệ** vào một phe Tam Quốc (đã có đường ra quân, không bị hủy vì minh) thì `guestBroken[emperor][faction] = true` ngay khi vào trận, không cần thắng.
Ví dụ Tần đánh Tào → Tào được đánh Tần; Lưu/Tôn vẫn bị cấm đánh Tần nếu Tần còn 1 châu.
Đánh trung lập hoặc đánh đế khác không phá bảo hộ với Tam Quốc.
Tần đánh Tào cũng đặt `qinAttackedCao` (cửa Trường An đang đọc cờ này).

Ba lớp:

1. **Legal.** Châu đang được bảo không có trong `legal.attackTargets` của đúng phe Tam Quốc đó. AI chỉ chọn trong legal — không hard-code `type` trong heuristic.
2. **AI.** Vì vậy không chọn mục tiêu được bảo.
3. **Referee.** Lệnh đánh trái luật bị từ chối: không combat, không đổi chủ. Event truth `kind: "event"`, `code: "guest_truce"`.

`Engine.guestProtectionStatus(game, emperorFid)`:

```
{ active, remainingTurns, protectedFrom: [...], brokenAgainst: [...] }
```

Không field `time_displaced`. Đây là chế độ pháp lý công khai.
DecisionContext mang `world.guestProtection[emperorFid]` cùng hình đó.

## D — Phản ứng minh ước tới người chơi

AI chọn ngoại giao → pact → người chơi: AI đã tiêu main action.
Người chơi nhận reaction, không tiêu main action của mình.
Engine không được roll thay người chơi.

`state.playerFid` đánh dấu người chơi. Phiên chơi (Claude, khi đã có modal) phải ghi field này trước `resolveTurn`.
`fillDecisions` không tự bật chặn — HUD hiện tại chưa trả lời reaction. Không có `playerFid` thì pact AI–AI và pact nhằm phe chưa đánh dấu vẫn roll như cũ. Có `playerFid` thì offer tới đúng phe đó không được roll.

`Engine.pendingReactions(game, playerFid, decisions)` →

```
[{ id, kind: "pact_offer", from, to, turns: 6 }]
```

`id` = `pact:{turn}:{from}:{to}`, ổn định, sort theo id. Nhiều sứ một lượt thì nhiều id.

`Engine.answerReaction(game, playerFid, id, "accept" | "reject")` ghi `state.reactionAnswers`. Không tự resolve cả lượt.

`resolveTurn`: còn offer tới `playerFid` chưa trả lời → `{ blocked: true, pendingReactions, events: [], turn }` và **không** đổi state, không tăng lượt.
Đã trả lời thì resolve bình thường.

Accept: pact thường, `untilTurn = turn + rules.pact.turns` (data = 6), hai chiều, event `pact` `ok: true`.
Reject: không pact, không phạt uy toàn cục, AI vẫn mất action vì lượt vẫn resolve. Event `pact` `ok: false`, `code: "rejected"`.

## E — Pact đi

Người chơi (hoặc AI) gửi pact một điều khoản. Không grain, đất, đồng đánh, mượn đường, hôn nhân, chư hầu.
Đối phương AI accept/refuse bằng luật engine hiện có.
Ký thì sống đúng đồng hồ `rules.pact.turns`.

Công khai trên DecisionContext:

```
world.pacts: [{ a, b, untilTurn, remainingTurns }]
```

`remainingTurns = untilTurn - turn`. Cạnh đã sort, không trùng. Đây là chính trị công khai, không phải quân báo.

## F — Áp lực khối

Không team cố định, không ma trận quan hệ, không điểm thù lâu dài, không quân ẩn, không doctrine/persona/prior.

`diplomaticPressure[fid]`: `none` | `watch` | `high`

Chỉ từ: đồ thị pact đang sống, số châu của khối, khối có giáp observer không, grudge của chính observer.

V1:

- Đồng minh của observer → `none`
- Khối không giáp observer và không có grudge → `none` (Ngô xa không ghét chỉ vì người chơi kết minh)
- Grudge còn hạn và có giáp → `high`; grudge mà không giáp → `watch`
- Có ít nhất một minh ước trong khối, khối giáp observer, tổng châu ≥ 4 → `high`
- Có minh ước trong khối và khối giáp, nhưng dưới 4 châu → `watch`
- Một phe lớn đứng một mình (không minh) → `none` (đe dọa quân sự vẫn là band/threat cũ, không phải áp lực ngoại giao)

Mock AI được lệch nhẹ `fortify` / `diplomacy` / `stratagem`, và điểm đánh mục tiêu `high`, chỉ đọc band này. Không số điểm lộ ra context. Không tài nguyên mới.

## Không làm trong v1.1

Công dân/ô Civ, gathering, trận tactical, Officers, máy A.5, resource mới, deal TW3K đủ clause, HUD, map, `src/world/**`, `game.html`.
