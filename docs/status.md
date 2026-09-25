# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Visual vòng 8** (Claude): canvas chờ chủ dự án xem.
- **Claude:** diễn `resolveTurn().events` RuntimeEvent v1. Không bịa cửa, không đổi owner.

## Đã xong

- 2026-09-25 đêm (Grok): engine wire cửa 219, guestTruce, succession, RuntimeEvent v1, `firedGates`. Test 19 pass. Sim 500: Lưu Bị 29% · Tôn 18.6% · Lý 16.6% · Tào 13.8% — không bị Tào nuốt bàn. Hầu hết hết giờ ở lượt 48 (hegemon 77.8%).
- 2026-09-25 đêm (Claude, vòng 8): bake toàn quốc Albers, `world.html` đọc `data/world.json` 219.

## Việc tiếp theo

1. Claude gắn shot theo RuntimeEvent v1 (`data/scenario/runtime-events.v1.json`).
2. HUD 1 đế: `Engine.fillDecisions(g, fid, decision)`.
3. Claude: nướng mặt nạ lõi; tướng đi đường khi có `kind:attack`.

## Vấn đề đã biết

- Engine thu 219 / 20 châu đã wire cửa + guestTruce + succession + RuntimeEvent v1.
- Cải cách 3 tầng: tên có, chưa tăng tier.
- `deal_counter` chưa có vòng trả giá tự động; AI mặc định `pact`.
- `index.html` vẫn Phase 1 cũ.
- Chưa đo FPS máy thật.
