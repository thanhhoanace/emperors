# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-26 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Visual vòng 8** (Claude): canvas chờ chủ dự án xem.
- **Vòng chơi** (Claude): `game.html` chơi được nhiều lượt với engine thật (chọn 1 trong 4 đế → lệnh → `fillDecisions` → `resolveTurn` → diễn RuntimeEvent v1 → sync). Chờ chủ dự án chơi thử trước khi thay `index.html` (`npm start` → `/game.html`; trình diễn cũ: `/game.html?demo=1`; ảnh QA `test-results/game-*.png`).
- **Grok — hợp đồng engine** (xem mục *Chặn* dưới): lịch mùa, nơi xuất quân, điều khoản ngoại giao.

## Đã xong

- 2026-09-26 (Claude, vòng chơi): `src/world/game-controller.js` (vòng lượt quanh engine, không DOM), `player-ui.js` (chọn đế, bảng phe, bảng lệnh 5 hành động, xếp hạng, thanh lượt, màn kết thúc), `demo.js` (trình diễn cũ, `?demo=1`); engine chạy trong trình duyệt. Presenter có "Bỏ qua"; runtime giải phóng cờ, thành đầy đủ, tướng/quân/bụi mỗi lượt (trước đó rò bộ đệm mỗi lượt). Test: `tests/game-controller.test.mjs`, `tests/e2e/game-loop.mjs`. Không đụng `src/engine`, `data/scenario`.
- 2026-09-25 khuya (Claude, runtime): thư viện hình chuyển sang `src/world/` (một bản, prototype nạp từ đó). Mới: `world-runtime.js` (camera chiến dịch / châu / thành, LOD theo view), `event-presenter.js` (attack theo `march.md`, gate theo `shot`, kind khác: focus + thẻ), `hud.js`, `names.js`, `game.html`. QA `tests/e2e/runtime-slice.mjs` + `tests/runtime.test.mjs`. Không đụng engine, attach-219, data/scenario. Đo (SwiftShader, 1440×900): chiến dịch 205 lệnh vẽ / 1,14 triệu tam giác; châu ≤ 2,6 triệu; thành ≤ 2,9 triệu; hành quân ~1,5 triệu; bộ đệm GPU đỉnh 145 MB (cache LOD có giới hạn); mở trang ~31 giây.
- 2026-09-25 đêm (Grok): engine wire cửa 219, guestTruce, succession, RuntimeEvent v1, `firedGates`. Test 19 pass. Sim 500: Lưu Bị 29% · Tôn 18.6% · Lý 16.6% · Tào 13.8% — không bị Tào nuốt bàn. Hầu hết hết giờ ở lượt 48 (hegemon 77.8%).
- 2026-09-25 đêm (Claude, vòng 8): bake toàn quốc Albers, `world.html` đọc `data/world.json` 219.

## Việc tiếp theo

1. Chủ dự án xem `game.html`; duyệt rồi thay `index.html` bằng nó.
2. Grok: gỡ các mục *Chặn* dưới (mỗi mục một thay đổi hợp đồng nhỏ); Claude nối vào UI khi có.
3. Claude: nướng mặt nạ lõi (mở trang ~31 giây trên SwiftShader, 16 giây là `createReal`); sứ giả cho `pact`/`deal_*`, cờ chia đất cho `realm_fall` (hiện chỉ focus + thẻ); cảnh cắt trận.

## Chặn — hợp đồng engine (Claude ghi, Grok quyết)

Frontend không tự bù các chỗ này; UI hiện đúng những gì engine làm.

1. **Lịch mùa.** Mong đợi: lượt 1 = Thu 219 (`world.meta.startSeason`, cửa `opening` nói "Thu Kiến An 24"). Thực tế: `Engine.calendar` tính từ `seasons[0]`, lượt 1 = Xuân 219. Sửa tối thiểu: `calendar` cộng `seasons.indexOf(meta.startSeason)` vào chỉ số mùa (và năm khi qua Đông).
2. **Nơi xuất quân.** Mong đợi ("chọn châu xuất phát"): lệnh `attack` có `from` hợp lệ (châu mình, kề đích) thì dùng `from`. Thực tế: `resolveAttack` bỏ qua `d.from`, luôn dùng `originFor` (thủ phủ nếu kề, không thì châu kề đầu tiên). UI chỉ liệt kê châu có thể xuất quân và ghi "trọng tài chọn". Sửa tối thiểu: `const from = validFrom(d.from) ? d.from : originFor(...)`.
3. **Điều khoản ngoại giao.** Mong đợi: menu `diplomacy.md` (1 đòi + 1 cho: `truce` `alliance` `joint_war` `grain` `passage` `withdraw` `recognize`, kết quả `deal_accept/counter/refuse`). Thực tế: engine chỉ nhận `sub: 'pact'` (minh = đình chiến `rules.pact.turns` lượt) và `sub: 'annex'`. UI chỉ mở hai lựa chọn đó. Sửa tối thiểu: `{ action: 'diplomacy', sub: 'deal', target, ask, give }` → event `deal_*` có `clauses`.
4. **`attach-219.js` không có lối xuất cho trình duyệt** (chỉ `module.exports`). `game.html` dựa vào hàm toàn cục `attach` của script cổ điển. Sửa tối thiểu: thêm nhánh UMD `else root.EmperorsAttach219 = attach`.
5. Nhỏ: loại mưu (`discord`/`burn`/`defect`) không được export (UI chép danh sách id); một số lệnh sai bị engine bỏ qua không sinh event (kết minh với minh hữu, củng cố châu không phải của mình): UI chặn trước nên người chơi không gặp.

## Vấn đề đã biết

- Engine thu 219 / 20 châu đã wire cửa + guestTruce + succession + RuntimeEvent v1.
- Cải cách 3 tầng: tên có, chưa tăng tier.
- `deal_counter` chưa có vòng trả giá tự động; AI mặc định `pact`.
- `index.html` vẫn Phase 1 cũ; trò chơi mới ở `game.html` (chưa thay, chờ duyệt).
- Vòng chơi: bảng xếp hạng và ước lực tấn công đọc số thật của engine (quân mọi phe). Khi `projectPerception` (`perception.md`, `intel.md`) được wire, HUD 1 đế phải đổi sang đọc lớp tin đó; hiện chưa có API.
- Vòng chơi: một lượt đầu có ~9 event, diễn 2× mất vài phút; có 1×/2×/4× và "Bỏ qua". Người chơi chỉ chọn qua danh sách (chưa bấm châu trên bản đồ; đích được tô trên nhãn thành).
- Runtime: bộ đệm GPU sát trần 150 MB (145 MB) khi đã xem nhiều châu/thành; tiền cảnh một số góc cận thành còn sườn núi tán rừng thô.
- Runtime: vị trí tướng trong cảnh `gate` lấy châu trấn gốc (`characters.json` `governors`), chưa theo state khi tướng mất châu.
- Chưa đo FPS máy thật.
