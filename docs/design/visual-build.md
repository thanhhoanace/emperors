# Đưa hình đã duyệt vào game — kế hoạch mô-đun

> Chủ dự án duyệt hướng hình ở canvas thử Thọ Xuân bị vây (28/9 khuya): "ok như này đẹp r … bắt đầu code các phần".
> File này là kế hoạch và hợp đồng giữa các mô-đun để nhiều agent code song song. Luật hiệu năng: `docs/decisions/0005`.
> Luật kiến trúc Hán: `docs/decisions/0006`. Hướng visual: `docs/decisions/0004` (A + cắt cảnh trận của C). Lane: `docs/product/lanes.md`.

## Hai tỉ lệ, hai hệ thống

| Cảnh | Tỉ lệ | Hệ thống | Trạng thái |
| --- | --- | --- | --- |
| Bản đồ chiến dịch (`game.html`, 20 châu, Hoài Nam) | 1 đơn vị = 3 km (`meta.projection.kmPerUnit`) | `terrain*.js`, `flora.js`, `hancity.js`, `world-runtime.js` | có, trong ngân sách 0005 |
| Cảnh trận (cắt cảnh 3–5 giây khi có `attack`; sau này trận theo lượt 3–5 lượt) | 1 đơn vị = 1 m | mới: `nature.js`, `han-models.js`, `crowd.js`, `battle.js` | đang code, từ prototype `docs/design/prototypes/siege/` |

Prototype `docs/design/prototypes/siege/` là **tham chiếu đã duyệt**, không sửa nữa. Code game nằm ở `src/world/`, script cổ điển (không ES module, quyết định 0002), three r146 bản global, `THREE.ColorManagement.legacyMode = false` do `kit.js` đặt.

## Ngân sách theo mức chất lượng (0005, áp cho cảnh trận)

| Mức | DPR | Bóng | SSAO / DOF | Cây riêng | Lính | Tam giác / khung (kể cả bóng) | Lệnh vẽ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `high` (máy tính, GPU rời hoặc tích hợp mạnh) | 1,5 | 4096 | có / có | đủ (~12.000, mô hình mịn < 260 m) | mịn, có cử động | ≤ 3 triệu | ≤ 400 |
| `mid` (laptop GPU tích hợp) | 1 | 2048 | không / có | một nửa, mô hình nhẹ | mịn, có cử động | ≤ 2 triệu | ≤ 300 |
| `low` (điện thoại) | 1 | không bóng thời gian thực | không / không | ≤ 2.500, xa là thẻ | nhẹ, ít khung cử động | ≤ 1 triệu | ≤ 150 |

Prototype đang 9–11 triệu tam giác, 220–1.288 lệnh vẽ: **vượt trần 3–4 lần**; việc của các mô-đun là vào trần mà giữ được cái nhìn đã duyệt. Đo bằng `docs/design/prototypes/render.mjs` (hoặc harness riêng in `K.stats`) trước khi báo xong. Chưa đo được fps trên máy thật (container không có GPU): `quality.js` phải cho người chơi thấy mức đang chạy và fps để chủ dự án báo lại từ laptop và điện thoại.

## Mô-đun và hợp đồng

### 1. `src/world/quality.js` — global `Quality`

- `Quality.pick(info)` **thuần** (test được bằng Node): `info = { gpu: chuỗi WEBGL_debug_renderer_info, mobile: bool, memoryGB, cores, width, height, dpr, override }` → `{ tier, dpr, shadow, ssao, dof, trees, crowd, reason }` theo bảng trên.
- `Quality.detect(renderer, { override })` gom `info` từ trình duyệt rồi gọi `pick`. `?tier=high|mid|low` ép mức; `?hud=1` hiện góc màn hình: mức, lý do, fps trung bình, tam giác, lệnh vẽ.
- `Quality.monitor(renderer, onDrop)`: luật dat.city — hai cửa sổ 100 khung liên tiếp trung bình quá 31 ms thì hạ một mức (gọi `onDrop(tierMới)`); không hạ quá `low`; không tăng lại trong ván.
- `K.setup(w, h, opts)` nhận `opts.quality` (DPR, loại bóng); `K.lens` nhận `q` để tắt SSAO / DOF và chạy hậu kỳ nửa độ phân giải ở `low`; `WorldRuntime.create({ quality })` truyền xuống. Mặc định (không truyền) giữ nguyên như hiện nay.

### 2. `src/world/nature.js` — global `Nature` (tỉ lệ mét)

Chuyển từ `docs/design/prototypes/siege/sg-nature.js`, giữ tên hàm để `battle.js` gọi được:

- `Nature.noise` (JS), `Nature.GLSL`, `Nature.worldVaryings(sh)`, `Nature.rnd / seed`.
- `Nature.terrain(L, env, q)`, `Nature.water(L, env)`, `Nature.rocks(L, env, q)` → group có `userData.focus(cam)`, `userData.ledges`; `Nature.trees(L, env, sun, extra, q)` → group có `userData.U.uTime`, `userData.focus(cam)`, `userData.count`.
- `L` là **giao diện đất** (mét): `{ EXT, WATER, h(x,z), slope, waterSD, riverSD, roadD, woodAt, fieldAt, trampled, hills, landTex, campIn?, CAMP_R?, CAMP_GATE? }`. `Nature.land(spec)` dựng một `L` tổng hợp từ mô tả `{ river: 'n'|'s'|'e'|'w'|null, hills: 'ne'|…|null, cityR, campSide }` (thay cho `SGN.land()` cố định của prototype). Sau này `L` có thể lấy độ cao từ bản đồ thật; đừng khóa vào dữ liệu Thọ Xuân.
- Bắt buộc (0005 §5): cây, bụi, đá chia **ô 80 m**, mỗi ô một InstancedMesh có `boundingSphere` và `frustumCulled = true`; `q.trees` giảm mật độ; `low` dùng thẻ (billboard) ngoài 150 m và không có thảm cỏ.

### 3. `src/world/han-models.js` — global `HanModels`

Đưa `docs/phases/v2-gameplay/demo1/src/hn-models.js` (bản đã sửa theo 0006: mái thẳng, cổng xà gỗ, khuyết, tháp canh) vào `src/world/`, API giữ nguyên: `HanModels.create({ recv, colors, renderer })` → `HM` với `HM.parts` (kit, rbox, roof, pavilion, house, granary, que, wallPrism…), `HM.figure`, `HM.mat`, `HM.look`, `HM.siegeWall`. Bản trong `docs/phases/` giữ nguyên cho demo 1 (phase đã đóng).

### 4. `src/world/crowd.js` — global `Crowd` (lính có cử động)

- `Crowd.create({ HM, colors, q })` → `crowd`; `crowd.add(kind, list)` với `kind` ∈ `spear | bow | run | climb | pull | idle | fight | rider | horse`, `list` là `[x, y, z, yaw, anim?, phase?]`; `crowd.group`, `crowd.tick(time)`, `crowd.count`, `crowd.stats()`, `crowd.dispose()`.
- Cử động trên GPU: mỗi loại người là **một** InstancedMesh; khung tư thế nướng vào DataTexture (mỗi khung một cột vị trí đỉnh), shader chọn khung theo `anim`, `phase`, `uTime`; thuộc tính từng bản sao: `anim`, `phase`, `speed`. Vật liệu là `HM.mat` (nối `onBeforeCompile` với `look()` của bộ mô hình, `customProgramCacheKey` riêng). Bóng: `customDepthMaterial` cùng shader đỉnh.
- Ba mức chi tiết theo khoảng cách: `fine` gần camera, `light` xa hơn, `far` (tay chân ba cạnh hở đầu, không ủng, khoảng nửa số tam giác của `light`) quá `shadowReach` và không đổ bóng; `low` chỉ `light`, 4 khung / vòng lặp. Màu áo theo phe từ `colors`, màu bản sao cho sắc độ.
- Thay `K.Crowd` (hộp vuông) trong `kit.js` **về sau**; giờ chưa đụng.

### 5. `src/world/battle.js` — global `Battle` (cảnh trận)

- `Battle.siege(desc, deps)` → `{ group, tick(dt), views, labels(), focus(cam), stats(), dispose() }`.
- `desc = { attacker: { fid, color, glyph, name, troops: { bo, ky, thuy } }, defender: { … }, city: { id, name, rank, outline, gates, passages, que, moat, river }, ground: L | spec, season, hour, mode: 'assault' | 'stand' | 'camp', result?: 'win' | 'loss' }`. `city` lấy thẳng từ `data/cities.json` (km → m, outline thật, số cổng, khuyết, hào); quân theo `troops` (mỗi 1.000 quân một khối); thuyền chỉ khi `city.river` và có `thuy`.
- `deps = { HM, Nature, Crowd, env, sun, q, renderer }`. Tường, cổng, lầu, khuyết, phường, kho, phủ: từ `sg-siege.js` `S.city`; doanh trại: từ `sg-camp.js`; máy móc (xe húc, thang, tháp tên, máy bắn đá, khiên chắn), lửa khói tên: từ `sg-siege.js`. Lính qua `deps.Crowd` (hợp đồng mục 4; khi chưa có `crowd.js` thì dùng bản tĩnh nội bộ cùng chữ ký).
- `views`: `approach` (từ phía quân công), `gate` (cổng bị đánh), `wall` (dọc tường), `camp`, `result` (cờ bên thắng); mỗi view `{ target, cam, fov, shadow, ao }` như prototype. Cắt cảnh 3–5 giây: `approach → gate → result`.
- Nhãn `labels()` như prototype (`{ text, kind, x, y, visible }`).

### 6. Nối vào game (sau khi 1–5 xong, làm tuần tự)

- `game.html` nạp `quality.js`, `nature.js`, `han-models.js`, `crowd.js`, `battle.js`.
- `event-presenter.js`: event `attack` mở cắt cảnh `Battle.siege` 3–5 giây (0004); nút Bỏ qua và tốc độ nhanh tắt được; `?cut=0` tắt hẳn; `low` không mở cắt cảnh nếu dựng quá 3 giây.
- e2e `tests/e2e/battle.mjs`: dựng một trận, đo ba mức, so trần 0005.

## Bẫy đã gặp (đừng vấp lại)

- three r146 **không đổi chương trình shader** giữa các InstancedMesh cùng vật liệu có và không có `instanceColor`: mọi InstancedMesh trên cùng một vật liệu phải cùng có (hoặc cùng không có) màu bản sao, đặt từ lúc tạo.
- `customDepthMaterial = null` làm sập lượt bóng; không gán `null`.
- `pkill -f <mẫu>` giết luôn shell của chính mình; dùng `ps aux | grep … | awk '{print $2}' | xargs -r kill`.
- Màu: `new THREE.Color(hex)` đã chuyển sRGB → linear (legacyMode tắt); không chuyển hai lần. Đỏ thuần bị nâng bão hòa thành đỏ nhựa; dùng đỏ gạch.
- GPU giả lập (swiftshader) bỏ ngữ cảnh WebGL khi cảnh quá nặng ở DPR 1,5; số `frameMs` của nó không nói gì về máy thật.
- Nhiễu giá trị (value noise) cắt ngưỡng ra khối vuông theo trục; xoay từng tầng octave.

## Trạng thái

| Mô-đun | Agent | Trạng thái |
| --- | --- | --- |
| quality.js | A | xong (`995d3c0`): pick/detect/monitor/hud, 10 test; `game.html` dò GPU trước khi dựng, `?tier=`, `?hud=1`, tự hạ SSAO/DOF khi khung chậm và nhớ mức cho lần sau |
| nature.js | B | xong (`145e54c`): `Nature.land(spec)`, ô gộp theo khối có vùng bao và loại theo khung nhìn, ba mức; atlas lá và cây mẫu cache theo trang, `Nature.warm(q)` (`f0e7b6d`) |
| han-models.js + battle.js | C | xong (`6ac9c11`, `dd97bd2`): thành theo `cities.json` (đường tường thật, cổng, khuyết, hào, sông), quân theo số binh, doanh trại, lửa khói instanced, sáu góc máy; `Battle.land(def, side, Nature)` dựng đất quanh đường tường thật |
| crowd.js | D | xong (`9e28c71`): khung tư thế nướng vào texture float, một InstancedMesh mỗi thân và mức chi tiết, bóng chạy cùng cử động; mức `far` quá `shadowReach` không đổ bóng (Claude, 29/9) |
| nối vào game, e2e | Claude (chính) | xong (`1ecc451` và sau): `src/world/battle-cut.js` + `EventPresenter` (`plan.cut`, `P.cut`) + `game.html`; `tests/e2e/battle-cut.mjs` 103/103 ở cả ba mức |

## Đo (29/9, GPU giả lập, 1280×720, DPR 1, cả lượt bóng)

`tests/e2e/battle-cut.mjs`: hai trận của fixture chạy trong `game.html`, mỗi trận ba góc (tiếp cận, cổng, kết quả). Ảnh ở `test-results/battle-cut-*.png`.

| Trận, góc nặng nhất | Mức cao | Mức vừa | Mức thấp |
| --- | --- | --- | --- |
| Trường An (Tần đánh, thua) | 3,13 triệu · 276 lệnh vẽ | 1,94 triệu · 250 | 1,00 triệu · 139 |
| Giang Lăng (Ngô đánh, thắng) | 2,84 triệu · 261 | 1,66 triệu · 236 | 0,83 triệu · 106 |
| Dựng trận: Trường An / Giang Lăng | 2,7 / 7,0 giây | 1,9 / 6,0 giây | 1,3 / 4,3 giây |

Ngày 28/9 góc kết quả Trường An còn 3,56 / 2,36 triệu (cao / vừa) và dựng 4,2 giây: lính quá `shadowReach` vẽ bằng mô hình `light` chiếm một phần ba khung. Đã sửa bằng mức `far` cho lính xa, tầm bóng 150 / 120 m, tối đa 360 / 240 lính chi tiết mỗi phe, lưới đất 12 m ở mức vừa; `Battle.land` tìm đường theo ô 100 m và bỏ qua vòng lặp cạnh tường khi xa tường (dựng đất nhanh gấp đôi). Mức cao dành cho card rời nên cho vượt trần tích hợp tới 10 %; mức vừa, thấp dung sai 5 %. Số này không nói gì về fps thật: phải đo trên máy của chủ dự án (`game.html?hud=1`, `&tier=high|mid|low`).

## Nợ còn lại

- Dựng trận còn chặn luồng chính 1–7 giây (thẻ "Đang dựng trận…"; Giang Lăng chậm nhất vì sông và tường dài): phải dựng dần theo khung (dat.city: ≤ 5 ms mỗi khung) hoặc dựng trong lúc quân hành quân.
- Cắt cảnh lấy quân bộ / cung / kỵ / thủy từ `battle` của sự kiện (attack v2, ASSIGN mục 1); ở chế độ chơi là bản đã làm mờ của người chơi, cờ và nhãn theo publicLabel (đế khách không lộ chữ trên cờ). Cảnh chưa dùng `walls`, `turns`: tường vẫn theo `cities.json`, trận diễn một nhịp.
- `season`, `hour`, `deps.sun` của `Battle.siege` chưa dùng; doanh trại luôn quay bắc; ngoài tường (Linh Đài…) chưa dựng.
- Vân bump trên vách đá nhấp nháy khối 2×2 ở GPU giả lập (kế thừa bản mẫu); mức thấp đã tắt bump đá.
- Cảnh dựng bằng `nature.js` + `battle.js` + `crowd.js` tải thêm ~260 KB script (chưa nén) ở `game.html`; chưa tải lười.
