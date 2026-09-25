# Phân vai agent

Hai luồng song song trên nhánh `claude/gracious-pasteur-6s8fmk`. Không sửa file của luồng kia. Cần đổi SOT chung thì chỉ sửa đúng dòng trong `docs/status.md`.

## Claude — hình và thế giới 3D

Được sửa: `docs/design/**`, `docs/design/prototypes/**`, `assets/map/**`, `tools/bake-map.mjs`, `data/cities.json`, `data/world.json` chỉ cột `lonlat` của châu *đang vẽ*, `assets/SOURCE.md`, ADR 0004–0006, `docs/product/proposal-all-china.md` phần hình.

Việc: thành Đông Hán, DEM, LOD, canvas duyệt, map toàn quốc (phạm vi / tỉ lệ A-B-C), nướng mặt nạ, 6 thành mới năm 219, Lạc–Trường An không còn phế tích 190, tướng đi đường theo `march.md`.

Không sửa: `src/engine/**`, `tests/engine.test.mjs`, `tests/sim.mjs`, `docs/product/scenario.md`, `docs/product/diplomacy.md`, `docs/product/rules.md`, `data/scenario/**`, `data/personas/**` (trừ khi chủ dự án bảo vẽ chân dung).

## Grok / kịch bản — luật và sim

Được sửa: `docs/product/scenario.md`, `diplomacy.md`, `march.md` (hợp đồng event), `rules.md`, `data/scenario/**`, `src/engine/**`, `tests/engine.test.mjs`, `tests/sim.mjs`, `data/personas/**` (thoại), ADR 0007+ về luật.

Việc: nhập snapshot 219, menu ngoại giao, đình chiến khách, cải cách, gates, chế độ người chơi 1 đế, `npm run sim`.

Không sửa: prototype three.js, `hancity.js`, `bake-map.mjs`, `assets/map`, `data/cities.json` (hình thành). Cần thành mới thì ghi id + `lonlat` vào `scenario.md` / `219.json`, để Claude dựng.

## File chung — sửa tối thiểu

| File | Ai |
| --- | --- |
| `docs/status.md` | Cả hai, chỉ mục của mình |
| `AGENTS.md` | Chỉ khi đổi quy ước repo |
| `data/world.json` | Claude: `lonlat`. Grok: owner / start / rules *khi nhập engine* — báo trước |
| Event `attack` | Grok xuất `from`/`to`/`win`. Claude diễn |
