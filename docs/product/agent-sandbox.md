# Hộp cát agent trong game

> Hợp đồng bắt buộc khi sau này cắm LLM. Round A chưa implement adapter mạng.
> `DecisionContext` = toàn bộ thế giới mà một phe được phép biết.

## LLM / MOCK một phe chỉ được nhận

1. `DecisionContext` của đúng `fid` (`Engine.projectPerception(game, fid)`).
2. Persona **của phe đó** (`data/personas/<fid>.json`).
3. Schema lệnh hợp lệ (`ACTIONS`, `STRATAGEMS`, đích nằm trong `context.legal`).
4. Intel đã nhớ của đúng phe (`state.intelLog.lastSeen[fid]`, `claims` đã chiếu vào context).

Gọi tương lai:

```
JSON.stringify(projectPerception(game, fid))
+ persona[fid]
```

Adapter **không** nhận `game`. Context **không** chứa `seed`, `bandValues`, hay quân đúng phe ẩn.

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

Khi có provider LLM: gọi không web, không search, không browser, không tools.
