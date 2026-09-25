# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-26 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Claude — HUD Perception:** file `src/engine/perception.js` + `data/scenario/intel-rules.json` đã lên nhánh. Chưa nạp vào `game.html`. Chưa sửa gameplay.
- **Grok:** wire `decideFromContext` + calendar/`from`/STRATAGEMS vào `engine.js` + đổi `tests/load.mjs` sang `perception.js` (file local đã có; push engine.js lớn chưa xong qua API).
- **Grok A.5:** bốn máy statecraft — chưa.

## Đã xong trên remote (Round A docs + perception file)

- `23a2214` docs: align gameplay SOT with freeze
- `467df97` feat: isolate AI decisions through perception (`perception.js`, `intel-rules.json`)
- loader Node vẫn attach-219 để test cũ không gãy khi engine.js chưa export `decideFromContext`.
