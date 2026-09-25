# Asset Sources

> Trạng thái (2026-09-25): các asset Kenney dưới đây thuộc bản đồ cũ (v1). Frontend mới chưa dùng. Prototype vòng 4–5 (`docs/design/prototypes/map.html`, `world.html`) dựng hình và sinh mọi texture bằng code; vòng 5 chỉ tải thêm dữ liệu địa hình trong `assets/map/` (mục dưới). Riêng `real.html` cũ (vòng 2–3) còn tải hai texture từ thư mục ví dụ của repo three.js (MIT). Asset nào đưa vào bản phát hành đều phải ghi ở đây kèm giấy phép.

This project uses local CC0 assets only for the v1 map restyle.

## Địa hình thật (`assets/map/`, vòng 5)

Sinh bởi `tools/bake-map.mjs` từ hai nguồn dữ liệu mở; file gốc tải vào `.cache/map/` (không commit).

- **Độ cao:** Terrain Tiles trên AWS Open Data (Mapzen/Tilezen, định dạng terrarium, zoom 7), https://registry.opendata.aws/terrain-tiles/ . Dữ liệu gốc cho vùng này: SRTM (NASA), GMTED2010 (USGS), ETOPO1 (NOAA). Ghi công theo https://github.com/tilezen/joerd/blob/master/docs/attribution.md . Khi phát hành phải hiện dòng ghi công này trong app.
- **Sông, hồ:** Natural Earth 10 m (`ne_10m_rivers_lake_centerlines`, `ne_10m_lakes`), phạm vi công cộng, https://www.naturalearthdata.com/ (tải qua github.com/nvkelso/natural-earth-vector).
- Các sông, hồ, đường bờ thêm tay hoặc sửa cho đúng năm 200 được ghi trong `tools/bake-map.mjs` và `docs/design/history.md`.

## Kenney Nature Kit

- Source: https://kenney.nl/assets/nature-kit
- License: CC0 1.0 Universal
- Local license copy: `assets/licenses/kenney_nature-kit-license.txt`
- Used for trees, brush, bamboo, rock/cliff fallback candidates, and terrain dressing.

## Kenney City Kit Roads

- Source: https://kenney.nl/assets/city-kit-roads
- License: CC0 1.0 Universal
- Local license copy: `assets/licenses/kenney_city-kit-roads-license.txt`
- Used for road/bridge candidates and future route dressing.

## Candidate Future CC0 Sources

These sources are candidates for the next visual pass. Evaluate the exact downloaded pack, keep a local license/source note, and prefer `.glb`/`.gltf` files before importing.

- Quaternius Ultimate Stylized Nature Pack: https://quaternius.com/packs/ultimatestylizednature.html
- Quaternius Ultimate Fantasy RTS: https://quaternius.com/packs/ultimatefantasyrts.html
- Quaternius Low Poly Nature: https://quaternius.com/

Do not add assets extracted from Civilization or other commercial games.
Commercial game screenshots in `docs/design/references/` are art-direction references only, not asset sources.
