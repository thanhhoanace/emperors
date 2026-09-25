# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Visual vòng 8** (Claude): canvas chờ chủ dự án xem.
- **Runtime slice** (Claude): `game.html` diễn RuntimeEvent v1 trên thế giới vòng 8, chờ chủ dự án xem (`npm start` → `/game.html`; ảnh QA `test-results/runtime-*.png`).

## Đã xong

- 2026-09-25 khuya (Claude, runtime): thư viện hình chuyển sang `src/world/` (một bản, prototype nạp từ đó). Mới: `world-runtime.js` (camera chiến dịch / châu / thành, LOD theo view), `event-presenter.js` (attack theo `march.md`, gate theo `shot`, kind khác: focus + thẻ), `hud.js`, `names.js`, `game.html`. QA `tests/e2e/runtime-slice.mjs` + `tests/runtime.test.mjs`. Không đụng engine, attach-219, data/scenario. Đo (SwiftShader, 1440×900): chiến dịch 205 lệnh vẽ / 1,14 triệu tam giác; châu ≤ 2,6 triệu; thành ≤ 2,9 triệu; hành quân ~1,5 triệu; bộ đệm GPU đỉnh 145 MB (cache LOD có giới hạn); mở trang ~31 giây.
- 2026-09-25 đêm (Grok): engine wire cửa 219, guestTruce, succession, RuntimeEvent v1, `firedGates`. Test 19 pass. Sim 500: Lưu Bị 29% · Tôn 18.6% · Lý 16.6% · Tào 13.8% — không bị Tào nuốt bàn. Hầu hết hết giờ ở lượt 48 (hegemon 77.8%).
- 2026-09-25 đêm (Claude, vòng 8): bake toàn quốc Albers, `world.html` đọc `data/world.json` 219.

## Việc tiếp theo

1. Chủ dự án xem `game.html`; duyệt rồi thay `index.html` bằng nó.
2. HUD 1 đế: `Engine.fillDecisions(g, fid, decision)`.
3. Claude: nướng mặt nạ lõi (mở trang ~31 giây trên SwiftShader, 16 giây là `createReal`); sứ giả cho `pact`/`deal_*`, cờ chia đất cho `realm_fall` (hiện chỉ focus + thẻ); cảnh cắt trận.

## Vấn đề đã biết

- Engine thu 219 / 20 châu đã wire cửa + guestTruce + succession + RuntimeEvent v1.
- Cải cách 3 tầng: tên có, chưa tăng tier.
- `deal_counter` chưa có vòng trả giá tự động; AI mặc định `pact`.
- `index.html` vẫn Phase 1 cũ; thế giới mới ở `game.html`.
- Runtime: bộ đệm GPU sát trần 150 MB (145 MB) khi đã xem nhiều châu/thành; tiền cảnh một số góc cận thành còn sườn núi tán rừng thô.
- Runtime: vị trí tướng trong cảnh `gate` lấy châu trấn gốc (`characters.json` `governors`), chưa theo state khi tướng mất châu.
- Chưa đo FPS máy thật.
