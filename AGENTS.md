# AGENTS.md — Tam Quốc Loạn Nhập

> Nguồn sự thật cho mọi agent. Codex đọc file này trực tiếp; Claude Code đọc qua `CLAUDE.md` (file đó chỉ `@import` file này).
> Giữ ngắn: chỉ ghi điều một đồng đội mới cần biết ngay. Chi tiết nằm trong `docs/`: dẫn link, không chép lại.

## Dự án

Mô phỏng theo lượt: 4 hoàng đế xuyên không (Tần Thủy Hoàng, Lý Thế Dân, Chu Nguyên Chương, Hán Vũ Đế) tranh thiên hạ năm 200 với Tào Tháo, Lưu Bị, Tôn Quyền. Trọng tâm là **xem và quay clip**: mỗi lượt phải kể rõ ai làm gì, trong một thế giới 3D Three.js.
Chạy hoàn toàn trên trình duyệt (GitHub Pages). Server Node chỉ để chạy local và làm chỗ cắm agent LLM sau này.

## Một sự thật, một chỗ

| Câu hỏi | Nguồn duy nhất |
| --- | --- |
| Game kể chuyện gì, UI phải có gì | `docs/product/brief.md` (kịch bản gốc của chủ dự án) |
| Cơ chế luật chơi | `docs/product/rules.md` → code `src/engine/engine.js` |
| Con số: châu, thế lực, chỉ số, hệ số cân bằng, toạ độ thật (`lonlat`) | `data/world.json` |
| Thành năm 200 trông ra sao (đường viền, cổng, cung, phế tích) | `data/cities.json`; dữ kiện và nguồn: `docs/design/history.md` |
| Địa hình, sông, hồ thật | `tools/bake-map.mjs` → `assets/map/` (file sinh ra, không sửa tay) |
| Giọng nhân vật, câu thoại, prompt LLM | `data/personas/<id>.json` |
| Hướng visual/UI, phương án đang chờ duyệt | `docs/design/direction.md` |
| Kiến trúc code, luồng dữ liệu | `docs/architecture.md` |
| Vì sao chọn cách đang làm | `docs/decisions/NNNN-*.md` |
| Đang ở đâu, việc tiếp theo | `docs/status.md` |
| Nguồn và giấy phép asset | `assets/SOURCE.md` |

Tài liệu không chép con số từ `data/`; muốn đổi số thì sửa `data/world.json`.

## Cấu trúc

```text
index.html               entry cho GitHub Pages (hiện là Phase 1 slice cũ, sẽ thay khi design được duyệt)
src/engine/engine.js     luật chơi thuần, tất định theo seed; chạy cả trình duyệt lẫn Node
data/                    world.json + cities.json + personas/*.json
tools/bake-map.mjs       nướng địa hình thật (DEM + sông) → assets/map/ (chạy tay, commit kết quả)
server/server.js         static + POST /api/turn (agent MOCK dùng chung engine)
tests/                   engine.test.mjs (node:test), sim.mjs (báo cáo cân bằng), e2e/ (Puppeteer)
docs/                    product/, design/ (+ prototypes/ three.js), research/ (tra cứu thô có nguồn), architecture.md, status.md, decisions/
assets/                  map/ (địa hình đã nướng), asset CC0 cũ (Kenney) + giấy phép
.claude/                 skills và settings dùng chung (Claude Code)
.github/workflows/       test + deploy Pages
```

## Lệnh

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci   # bỏ biến nếu cần Puppeteer tự tải Chrome
npm test                           # test engine + dữ liệu
npm run sim -- 500                 # chạy 500 ván, in tỉ lệ thắng và độ dài ván
npm start                          # http://localhost:3000
npm run qa                         # QA trình duyệt; cần server đang chạy (Linux: xvfb-run -a npm run qa)
node docs/design/prototypes/render.mjs world campaign  # render ảnh prototype + in số đo hiệu năng (cần server); world = vòng 5
node tools/bake-map.mjs            # nướng lại assets/map/ khi đổi lonlat, cities.json hay danh sách sông (lần đầu tải nguồn vào .cache/)
```

Trong container không có GPU: đặt `PUPPETEER_EXECUTABLE_PATH` tới Chromium có sẵn; WebGL chạy bằng SwiftShader, chậm nhưng đúng.

## Quy tắc

- **Tự kiểm tra trước khi báo xong.** Luôn chạy `npm test`. Đụng tới frontend thì chạy `npm run qa` và tự xem ảnh chụp màn hình. Quy trình đầy đủ: `.claude/skills/verify/SKILL.md`.
- Engine thuần: không DOM, không `Math.random`; mọi ngẫu nhiên đi qua `state.seed`. Đổi luật thì sửa engine, test và `docs/product/rules.md` trong cùng một commit.
- Frontend tĩnh, không bundler: script cổ điển, three.js r146 bản global qua CDN (`decisions/0002`).
- Thế giới 3D phải nằm trong ngân sách web (`decisions/0005`): đo lệnh vẽ, tam giác, MB bằng `render.mjs` mỗi lần đổi hình ảnh.
- Visual và UI theo `docs/design/direction.md`. Muốn đổi hướng visual thì dựng phương án cho chủ dự án duyệt trước (canvas Design), rồi mới code; ghi quyết định thành ADR.
- Không dùng asset trích từ game thương mại (Civilization, Total War), kể cả ảnh chụp: chỉ để tham khảo. Asset mới phải ghi vào `assets/SOURCE.md`.
- Không commit state máy cá nhân của công cụ agent: `.omc/`, `.omx/`, `.codex/`, `.claude/settings.local.json`.
- Docs và chữ trên UI bằng tiếng Việt; code, identifier và commit message bằng tiếng Anh.
- Cuối phiên cập nhật `docs/status.md`: `.claude/skills/handoff/SKILL.md`.

## Bài học (thêm một dòng mỗi khi agent làm sai, để không lặp lại)

- Mở app qua `http://localhost:3000`, không mở `file://`: fetch dữ liệu và texture sẽ lỗi.
- three r146: đặt `THREE.ColorManagement.legacyMode = false`, nếu không màu hex bị nhạt và bạc.
- Mái nhà: xoay geometry (`rotateY`) trước rồi mới scale, nếu không mái kéo dài thành hình thoi.
- Không để `scene.environment` chiếu sáng toàn cảnh khi đã có đèn: ảnh bị cháy. Chỉ gắn envMap cho nước.
- Không đặt biến top-level tên `top`, `name`, `parent`… trong script cổ điển: trùng thuộc tính của `window`.
- Feedback cũ của chủ dự án vẫn còn hiệu lực: cây không được to hơn thành; không để lại khối chữ nhật trông như placeholder; núi phải thành dãy, không phải cục đá rời; màu không được bạc.
- Cân bằng phải đo bằng `npm run sim`, không đoán. Một thay đổi "nhỏ" có thể đẩy một phe từ 5% lên 50%.
- Mờ tilt-shift làm cảnh trông như mô hình thu nhỏ. Hướng hiện thực chỉ giữ mờ theo chiều sâu và sương xa.
- Thành trì chi tiết rất nặng: vẽ cùng lúc 14 thành đầy đủ làm WebGL phần mềm sập (mất context). Thành xa phải dùng LOD giản lược.
- Thành chiếm khoảng 20 đơn vị bản đồ (cả ủng thành): khi đặt `geo` hay nắn sông, giữ sông cách tâm thành ít nhất 12 đơn vị. (Vòng 4. Vòng 5 thì `bake-map.mjs` tự nắn.)
- three r146 đặt `frustumCulled = false` cho InstancedMesh: chia instance theo ô, gán vùng bao cho từng ô rồi bật lại, nếu không mọi instance ngoài màn hình vẫn bị vẽ (cả lượt đổ bóng).
- Hoa văn sinh bằng shader (nhiễu, thửa ruộng, vòm cây, texture lặp) phải mờ dần theo `fwidth`, nếu không nhìn xa sẽ thành vân ô vuông. Bump bằng `dFdx/dFdy` trên hoa văn bị kéo dài (sườn dốc) sinh khối 2×2 điểm ảnh.
- Hai bề mặt chồng nhau (tán rừng trên đất) không được gần trùng nhau hay xuyên qua nhau: sinh z-fighting. Cắt mép bằng `discard` thay vì hạ bề mặt xuống dưới đất.
- Màu tối trong không gian tuyến tính rất nhỏ: pha 5% màu phe vào tán rừng xanh đã thành nâu. Chỉ nhuộm khi thật sự cần (chế độ chiến lược).
- Thuật toán đường đi: lưu khoảng cách bằng `Float64Array`. Dùng `Float32Array` thì sai số làm tròn khiến một đỉnh được "cải thiện" mãi, thuật toán chạy không dứt.
- Soi ảnh render bằng cách cắt và phóng to từng vùng, không chỉ nhìn cả khung. Cô lập lỗi bằng `hide=` / `off=` / `dbg=` của `map.html`.
- Kiến trúc năm 200 là Đông Hán:
  - Đúng: tường đất nện, cổng xà gỗ đỉnh bằng, mái thẳng ngói xám, cung đặt trên đài đất.
  - Sai: mái cong góc vênh, tường gạch, ủng thành. Đó là kiểu Minh–Thanh.
- Đẩy sông ra khỏi thành theo bán kính làm sông cuộn tròn quanh thành. Phải dời ngang theo pháp tuyến của dòng, dạng bướu cosin dọc theo dòng.
- Sông trong đất liền là dải nước ở mực nước riêng của nó, không dùng mặt biển. Ở góc máy xa, lưới đất thô hơn lòng sông nên phải nâng dải nước lên trên mặt đất, nếu không sông nhỏ sẽ đứt đoạn.
- Biên châu: lấy chênh lệch chi phí chia cho gradient của chính nó thì nét mượt dưới ô lưới. Dùng biến đổi khoảng cách từ mép nhãn thì bị răng cưa.
- DEM có nhiễu nên gzip thường chỉ bớt khoảng 20%. Lượng tử hoá, lấy delta 2 chiều và tách byte trước khi gzip thì bớt được 58%.

## Workflow có sẵn

Claude Code gọi được dưới dạng skill; Codex đọc thẳng file theo đường dẫn.

- `.claude/skills/verify/SKILL.md`: kiểm tra trước khi commit hoặc báo xong.
- `.claude/skills/handoff/SKILL.md`: cập nhật `docs/status.md` cuối phiên để agent sau làm tiếp.
