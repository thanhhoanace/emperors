# Hộp cát agent trong game

> Hợp đồng bắt buộc khi sau này cắm LLM. Round A chưa implement adapter mạng.
> `DecisionContext` hiện tại là context nội bộ cho MOCK và UI, chưa phải payload LLM.

## MOCK / UI một phe được nhận

1. `DecisionContext` của đúng `fid` (`Engine.projectPerception(game, fid)`).
2. Persona **của phe đó** (`data/personas/<fid>.json`).
3. Schema lệnh hợp lệ (`ACTIONS`, `STRATAGEMS`, đích nằm trong `context.legal`).
4. Intel đã nhớ của đúng phe (`state.intelLog.lastSeen[fid]`, `claims` đã chiếu vào context).

Context **không** chứa `seed`, `bandValues`, quân đúng của phe ẩn, `type`, `time_displaced`, `emperorIds`, `warlordIds`, hay `world.guestProtection`.
Đình chiến khách của chính phe nằm ở `self.guestProtection` (null nếu phe không có chế độ đó).

## Chưa được gửi thẳng cho LLM

Id nội bộ vẫn nằm trong context và trong TurnObservation:

`qin_shihuang`, `li_shimin`, `zhu_yuanzhang`, `liu_che` xuất hiện ở `world.owners`, `provinceIntel.owner`, `world.pacts`, `diplomaticPressure`, `actorId` / `otherId` / `ownerId`.

Những id này **chính là** danh tính lịch sử ẩn. `publicLabel` an toàn cho UI người chơi. `JSON.stringify(projectPerception(...))` **không** phải payload LLM.

Lớp chiếu sau này phải đổi id ẩn thành ref công khai trước khi gọi model. Chưa làm adapter đó. Đừng cắm LLM bằng context thô.

## Cấm

- raw `game` / `game.state`
- quân đúng của phe ẩn
- bảng map band → số
- `type` / `time_displaced` của phe khác
- doctrine / statecraft phe khác
- persona phe khác
- prior lịch sử của Lý/Chu nếu observer không phải chủ prior
- cả pack `gates.json` như kiến thức ẩn
- source repo, filesystem, browser, web/search, tool ngoài, hội thoại agent khác

RuntimeEvent = sự thật spectator / clip. **Không** tự biến thành tai AI.

Khi có provider LLM: gọi không web, không search, không browser, không tools, và chỉ sau lớp remap id.
