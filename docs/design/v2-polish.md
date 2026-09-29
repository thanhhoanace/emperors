# v2 hoàn thiện: vừa chơi vừa xem

> Chủ dự án, 29/9, sau lượt chơi đầu: "spawn 10 subagent, chia việc cho mỗi subagent phụ trách 1 việc, làm 1 bản hoàn thiện
> vừa chơi vừa xem được, ưu tiên trải nghiệm vẻ đẹp, chất lượng của game thủ lên cao nhất có thể".
> Trước đó: "trải nghiệm còn nhiều lỗi lắm … a thấy hướng đi này khoai quá". Gốc của cảm giác đó: luật có nhiều việc xảy ra
> (hành quân, vây, hàng, đồng minh, thẻ) nhưng chỉ trận có hình; phần còn lại là một dòng chữ trong tóm tắt.
> Nền: `v2.html` ở `f3df28b` (luật `EmperorsV2`, cảnh `HuaiNanScene`, giao diện `HuaiNanUI`, bộ điều phối `huainan-play.js`).
> Hợp đồng cũ: `docs/design/v2-build.md`. Ngân sách: `docs/decisions/0005` và `docs/design/visual-build.md`. Kiến trúc Hán: `docs/decisions/0006`.

## Cảm giác khi xong

1. **Một mùa chơi**: chạm quân, chạm đích, xác nhận (1–2 lệnh), bấm Hết mùa.
2. **Một mùa xem**: máy quay theo từng đạo quân đi theo đường thật; quân vây dựng trại quanh thành; cờ hạ, cờ kéo lên khi thành đổi chủ; mọi thứ ≤ 10–12 giây, chạm để tua.
3. **Trận vừa chơi vừa xem**: bảng lượt trên bản đồ (tướng đề xuất, người chơi đổi, bấm Đánh), rồi một cảnh cắt tỉ lệ 1 m dài 3–6 giây cho khoảnh khắc lớn nhất của lượt (kỵ xung phong, mưa tên, hỏa công, leo tường, phá cổng, tan vỡ). Mở trận và kết trận cũng có cảnh.
4. **Chế độ Xem**: một nút, ván tự chơi bằng đề xuất của tướng, máy quay đạo diễn; `&watch=1` mở thẳng để quay clip.
5. **Mở đầu, kết thúc**: màn tải đẹp, cảnh bay qua Hoài Nam, cảnh thắng / thua.
6. **Đẹp và có tiếng**: bốn mùa rõ (xuân mạ xanh, hạ mưa, thu vàng, đông tuyết), cờ vải bay, khói, lửa, người động, nhạc và tiếng động sinh bằng mã.
7. **Không có gì chỉ là một dòng chữ**; ngân sách 0005 giữ ở cả ba mức; điện thoại ngang 844×390 là khung chuẩn, máy tính co giãn.

## Móc của bộ điều phối (đã có trong `src/world/huainan-play.js`)

Không agent nào cần sửa vòng lặp của trang. Mô-đun mới nạp **sau** `huainan-play.js` trong `v2.html` (chỗ đánh dấu "v2 polish") và đăng ký lúc nạp:

```
HuaiNanPlay.hook(name, async (ctx, env) => …)   chờ lần lượt; giao diện bị khoá (ui.lock) trong lúc chạy; lỗi thì bỏ qua và ghi console
  boot         ctx = env                        sau khi cảnh và giao diện có, trước khung chơi đầu
  intro        ctx = { view }                   trước màn mục tiêu
  playback     ctx = { before, after }          sau Hết mùa: View trước và sau mùa (after.moves, after.report)
  battleOpen   ctx = { bt }                     trận của ta bắt đầu (V2.battle), trước lượt 1
  battleTurn   ctx = { before, after, over }    một lượt vừa đánh: before = V2.battle trước; after = V2.battle, hay V2.lastBattle khi hết trận
  battleResult ctx = { lb }                     sau lượt cuối, trước bảng kết quả
  beat         ctx = { taken, view }            một thành đổi chủ (report.taken[i]), trước thẻ của nó
  ending       ctx = { over, view }             hết ván, trước màn kết
HuaiNanPlay.on(type, fn)    chỉ nghe: act { name, args } (mọi lần gọi handler), season { view }, battle { bt }, turn, result { lb },
                            beat, report, over, lock (bool), skip (chạm khi móc đang chạy: xong ngay), watch (bool), mute (bool)
env = { V2, rt, sc, ui, H, data, world, cities, quality, params, W, H, seed, fast, watching, game(), view(), emit }
```

`env.fast` (`&fast=1`, e2e) thì móc trả về ngay. Handler mới của giao diện: `onSkip()`, `onWatch(on)`, `onMute(on)`.

## Luật chung cho 10 agent

- Đọc trước: `AGENTS.md` (và `CLAUDE.md`), file này, `docs/design/v2-build.md`, `docs/design/visual-build.md`, `docs/decisions/0005`, `0006`. Agent luật đọc thêm `docs/product/GAMEPLAY-FREEZE.md` (phần B là số của demo).
- Worktree: `git checkout -B polish/<việc> <commit nền>`; `ln -s /home/user/emperors/node_modules node_modules`.
- Chỉ sửa file mình sở hữu (bảng dưới) cộng file mới của mình, và thêm thẻ `<script>` của mình vào chỗ "v2 polish" trong `v2.html`. Cần đổi file người khác: ghi yêu cầu (kèm diff) trong báo cáo; code của mình dò có hay không (`if (x.fn)`) để chạy được cả khi chưa có.
- Máy chủ riêng: `PORT=<cổng của mình> node server/server.js &`, tắt đúng PID của mình khi xong (không `pkill -f`).
- Mọi lần chạy trình duyệt qua `tools/browser-slot.sh` (4 nhân, SwiftShader chạy trên CPU; tối đa 2 trình duyệt cùng lúc cho cả nhóm). Chạy ít, có chủ đích. Ảnh vào `test-results/polish-<việc>/` và **tự xem ảnh**: việc này chấm bằng mắt.
- Ngân sách 0005 cho cả bản đồ và cảnh 1 m, ở `high` / `mid` / `low`; đo bằng `sc.measure()` hoặc `stats()` và ghi số vào báo cáo.
- Không tải tài nguyên ngoài, không TW3K; hình, nhạc, tiếng sinh bằng mã (tài nguyên bản đồ đã bake giữ nguyên). Bố cục có seed (LCG); rung lắc hiệu ứng thì tuỳ.
- Engine thuần: không DOM, không `Math.random`. Đổi luật: engine + test + tài liệu luật trong cùng commit.
- Kiến trúc Hán (0006): không mái cong, không gạch, không ủng thành.
- `npm test` xanh; `tests/e2e/v2-loop.mjs` (chạy với `&fast=1`) xanh ở `low`.
- Commit trong nhánh worktree của mình, thông điệp rõ, kết bằng hai dòng ghi công được giao. Không push, không merge, không sửa file này.
- Báo cáo cuối: đã làm gì, file, API, xem ở URL nào, số đo từng mức, đường dẫn ảnh, giới hạn còn lại, yêu cầu gửi chủ file khác.
- Ưu tiên: một thứ hoàn chỉnh và đẹp hơn nhiều thứ dở dang. Làm cái người chơi thấy nhiều nhất trước.

## Mười việc

| # | Việc | Model | Sở hữu (được sửa) | Giao ra | Cổng |
| --- | --- | --- | --- | --- | --- |
| 1 | Điện ảnh trận | opus | mới `src/world/huainan-cinema.js`, `data/scenario/huainan-cities.json`; `src/world/battle.js`, `src/world/battle-cut.js` | móc `battleOpen`, `battleTurn`, `battleResult` | 3101 |
| 2 | Trận đồng 1 m | opus | mới `src/world/battle-field.js` | `FieldBattle.create(desc, deps)` cùng dạng với `Battle.siege` | 3102 |
| 3 | Đám đông chuyển động | opus | `src/world/crowd.js`, `tests/crowd.test.mjs` | handle, `move`, `play`, loop mới | 3103 |
| 4 | Mùa và không khí | opus | `src/world/terrain.js`, `terrain-real.js`, `flora.js`, `nature.js`, `kit.js`, `world-runtime.js`; mới `src/world/huainan-season.js` | `rt.setSeason`, `Nature` theo mùa, thời tiết | 3104 |
| 5 | Bản đồ sống | opus | `src/world/huainan-scene.js`, `tests/huainan-scene.test.mjs`, `docs/design/prototypes/huainan.html`; mới `src/world/huainan-map-play.js` | móc `playback`, `beat`; `sc.fly`, `sc.path` | 3105 |
| 6 | Mô hình | opus | `src/world/han-models.js` | quân, cờ vải, trại vây, thành hư hại | 3106 |
| 7 | Giao diện và cảm giác | opus | `src/world/huainan-ui.js`, `docs/design/prototypes/huainan-ui.html` | `ui.lock`, `ui.caption`, `ui.watch`, hướng dẫn mùa đầu | 3107 |
| 8 | Âm thanh | sonnet | mới `src/world/huainan-audio.js` | nhạc, nền, tiếng động theo sự kiện; `HuaiNanAudio.cue` | 3108 |
| 9 | Luật và nhịp | opus | `src/engine/v2/huainan.js`, `data/scenario/huainan.json`, `tests/v2-engine.test.mjs`, `tests/v2-sim.mjs`, phần B của `GAMEPLAY-FREEZE.md` | `V2.advise`, cân bằng, sửa ngõ cụt Ngô, trận vô vọng | 3109 |
| 10 | Mở đầu, kết thúc, chế độ Xem | opus | mới `src/world/huainan-show.js`, `tests/e2e/v2-watch.mjs`; màn tải trong `v2.html` | móc `intro`, `ending`; chế độ Xem | 3110 |

### Hợp đồng giữa các việc (dò có hay không, chạy được khi chưa có)

- **3 → 1, 2** (`Crowd`): `const h = crowd.add(kind, rows)` trả `{ kind, start, count }` (cũ vẫn chạy); `crowd.move(h, { to: rows | dx, dz, t0, dur, ease, stagger })` chạy trên GPU; `crowd.play(h, anim, { t0, stagger, hold })`; `crowd.time` (giây); loop mới trong `Crowd.ANIMS`: `charge`, `strike`, `brace`, `volley`, `die` (nằm yên ở khung cuối), `rout`, `cheer`.
- **2 → 1** (`FieldBattle`): `FieldBattle.create(desc, deps)` → `{ group, tick(dt), views, labels(), focus(cam), stats(), dispose(), land, lanes }`; `desc = { attacker, defender: { fid, color, glyph, name, troops: { bo, cung, ky, thuy } }, lanes: [kind × 3] (trái → phải, nhìn từ bên đánh), river, season, hour, seed }`; `deps` như `Battle.siege`. `views`: `deploy`, `lane0`, `lane1`, `lane2`, `overview`, `result`.
- **4 → 1, 2, 5** (mùa): `rt.setSeason(name, { ms })` với `name` là `Xuân | Hạ | Thu | Đông` (bằng `view.calendar`); `Nature` nhận `desc.season` như cũ nhưng mỗi mùa khác màu; tuyết trên mái và đất đi qua vật liệu chung của kit (`HM.mat` / `look`), nên mô hình của việc 6 tự có.
- **5 → 10** (máy quay): `sc.fly(to, ms) → Promise` với `to = { t: [x, z], dist, az, el }`; `sc.orbit(id, ms) → Promise`; `sc.path(fromId, toId, arm) → [[x, z]…]` (đường đi theo đất).
- **6 → 5** (mô hình): chữ ký cũ giữ nguyên; thêm `HM.army({ …, pose })`, `HM.banner` có vải bay (vertex), `HM.siegeCamp({ fid, men, r, seed })`, `HM.town({ …, damage: 0..1, burnt })`.
- **7 → 1, 5, 10** (giao diện): `ui.lock(on)` (ẩn bảng, chặn chạm, hiện "chạm để bỏ qua" và gọi `onSkip`), `ui.caption(text, { who, ms })` (phụ đề cảnh), `ui.watch(on)` (HUD tối giản, nút "Dừng xem" gọi `onWatch(false)`), nút tắt tiếng gọi `onMute`.
- **8 ← mọi việc**: nghe `HuaiNanPlay.on(...)`; `HuaiNanAudio.cue(name, { at })` cho tiếng đúng khoảnh khắc (việc 1, 5 gọi khi có).
- **9 → 10, 7**: `V2.advise(g)` → `[{ type: 'order', army, target, intent, why } | { type: 'task', town, key, why }]`, chỉ dùng những gì người chơi thấy; `view.moves` chỉ còn quân người chơi thấy ở một trong hai đầu.

## Ghép (Claude)

Thứ tự: 9 (luật) → 3, 6, 4 (nền hình) → 2, 1 (điện ảnh) → 5 (bản đồ) → 7 (giao diện) → 8, 10. Sau mỗi lần gộp: `npm test`, `v2-loop` thấp và cao, tự chơi một ván đủ các loại lệnh (đánh, vây, đi, việc thành, thẻ) và xem ảnh từng bước. Ghi số đo và nợ vào `docs/design/v2-build.md`.
