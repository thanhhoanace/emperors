# Total War: Three Kingdoms campaign map: reference research

For: the Tam Quốc Loạn Nhập team (three.js strategy map of China, 200 CE)
Date: 2026-09-25
Status: reference only. None of the TW3K images or data listed here may be shipped or copied into the product (see AGENTS.md: no assets taken from commercial games, screenshots included).

---

## 0. TL;DR

- **One map for every campaign.** The 182, 190, 194 and 200 starts and the Eight Princes (291) campaign all run on the same map. Only one update changed the extent: the free **patch 1.6.0** that shipped with *The Furious Wild* (Aug/Sep 2020). It added the south-west (Yunnan, Yongchang), Jiuzhen (Thanh Hóa), the north-east (Liaodong) and 9 gate passes. A "northern expansion" (steppe peoples) was promised and then cancelled when support ended in 2021.
- **Playable area ≈ 98.5–124°E × 18–42.5°N.** The westmost point is Yongchang/Baoshan in Yunnan and the eastmost is Liaodong (Xiangping). Taiwan is in the east. The northmost points are Liaoxi/Liaodong and the Ordos loop (Shuofang). The southmost points are Hainan (Zhuya) and Jiuzhen in northern Vietnam. **Tibet, Xinjiang, Mongolia and Korea are not playable.** They appear only as painted backdrop. About **47% of the land drawn in the map frame is non-playable scenery.**
- **Structure (v1.7).** 201 counties ("regions") in 73 commanderies, plus 9 single-county gate-pass commanderies. Counties: 73 capitals, 119 resource counties (farms, mines, ports and so on) and 9 passes. Each commandery has 2–4 counties. Capitals have 11 levels (0–10), and **walls appear from level 4 ("Small City")**.
- **The map is not to scale.** I georeferenced 76 settlements and fitted the map to their real positions:
  - About 0.9 km per pixel of the 3840-px painted map, which is about 3.9 km per game unit (the map is 892 × 702 units).
  - East–west is stretched about **1.25–1.35×** relative to north–south. The map is drawn at about 117 px per degree of longitude and 110 px per degree of latitude, almost like a plain lat/lon grid.
  - The **Central Plain is enlarged about 15–20% in linear scale (about 1.4× in area)** relative to Lingnan, Yunnan and You. The Guanzhong–Luoyang corridor is stretched about 1.4× to fit five passes.
  - CA said publicly that they "expanded" scenic environments and moved regions "from the south to the central plains".
- **Presentation.**
  - Continuous day/night cycle.
  - 5 seasons, one turn each: Spring, Summer, Harvest, Autumn, Winter. Foliage changes colour, with snowflake and cherry-blossom particles and darker winters.
  - Fog and depth of field at distance.
  - Fog of war as a grey cel-shaded haze.
  - At full zoom-out the camera switches to a flat painted "white map", the same ink-and-watercolour painting used for diplomacy, campaign select and the minimap.
  - An army is one giant model of its general, with a banner and a portrait token.
  - Settlements carry plates: owner portrait, commandery name, settlement name or type, population, level.
- **Relevance for us.** Our current box (101–122.5°E × 21–42°N) is already about as large as TW3K's playable China. The owner's full-China box (73–135°E × 18–54°N) is about **4.6× larger on the globe**, about 2,200 × 1,450 world units at 3 km/unit. TW3K never tried this. Five things it does are directly reusable:
  - non-playable painted backdrop for the periphery;
  - sparse, huge regions outside the core and dense ones inside it;
  - choke-point "pass" nodes and impassable terrain that keep a big map legible;
  - a single painted texture for the strategic zoom level;
  - distance fog and depth of field, LOD layering and fog of war.

---

## 1. Map extent

### 1.1 Base game vs DLC

| Version | What changed in extent | Source |
| --- | --- | --- |
| Launch 1.0 (May 2019) | Han China without the far south-west (Yunnan/Yongchang), without Jiuzhen and without Liaodong. Taiwan (Yizhou) and Hainan were already present. Korea, Indochina, the Tibetan edge and the steppe are drawn but not playable. | Launch map image (`tw3k_full_campaign_map_launch_v1.0_fandom_3840x3024.webp`, uploaded to the wiki July 2019) compared with the current map. |
| Patch **1.6.0** (31 Aug 2020, free, with *The Furious Wild*) | "A rework of the entire campaign map … we have also expanded the map in the south … and expanded up into the north-east". 9 gate passes were added as single-region commanderies. New commanderies in the south-west and elsewhere ("for example Xiapi"). "Regions have reduced in the south and increased in the central plains." New mountains were added, "primarily in the south", to reduce pathways. | [Patch 1.6.0 notes (archived)](https://web.archive.org/web/20210225041719/https://www.totalwar.com/blog/total-war-three-kingdoms-patch-1-6-0/); [PCGamesN 2020-08-31](https://www.pcgamesn.com/total-war-three-kingdoms/free-update-160) |
| *The Furious Wild* (paid, 3 Sep 2020) | Nanman factions playable in the new south-west. "First ever extension of the map." | [Steam](https://store.steampowered.com/app/1299591/); [Wikipedia](https://en.wikipedia.org/wiki/Total_War:_Three_Kingdoms) |
| Patch **1.7.1** (May 2021, final) | Moved Mount Song and Hulao Pass to the correct place; "added more impassable areas to the Yellow River". | [1.7.1 notes (archived)](https://web.archive.org/web/20220128184223/https://www.totalwar.com/blog/total-war-three-kingdoms-patch-1-7-1-notes/); [Steam announcement](https://store.steampowered.com/news/app/779340) |
| *Eight Princes* (Aug 2019), *Mandate of Heaven* (182 start, Jan 2020), *A World Betrayed* (194, Mar 2020), *Fates Divided* (**200 CE**, Mar 2021) | **No new map.** Each is a different start position on the same map. TWDB's region file for the Eight Princes start is byte-identical to the main campaign's. | [TWDB maps](https://twdb.io/three-kingdoms/maps/); [Wikipedia DLC table](https://en.wikipedia.org/wiki/Total_War:_Three_Kingdoms); [Fates Divided on Steam](https://store.steampowered.com/app/1493250/) |
| "Northern expansion" (announced July 2020) | "The second Expansion Pack DLC … will focus on building out the North of the map." It was **cancelled** when CA ended support in May 2021. | [July 2020 dev blog (archived)](https://web.archive.org/web/20210116082107/https://www.totalwar.com/blog/dev-blog-july-2020/); [Eurogamer](https://www.eurogamer.net/creative-assembly-faces-backlash-over-decision-to-end-support-for-total-war-three-kingdoms); [PCGamesN](https://www.pcgamesn.com/total-war-three-kingdoms/no-more-dlc) |

There is no separate "Southern expansion" map. The south-west Nanman content *is* the 1.6.0 and Furious Wild extension. A Steam player summed it up as "part of the existing map … only a handful of extra regions are being added to the south" ([Steam thread](https://steamcommunity.com/app/779340/discussions/0/2793874853442858787/)).

### 1.2 Bounding box (current v1.7 map)

Coordinates come from TWDB's settlement and region data plus my georeference (§3). Accuracy is roughly ±50–80 km.

| Extreme | Place | Approx. lon/lat |
| --- | --- | --- |
| West | Yongchang commandery (Buwei ≈ Baoshan, Yunnan). Yunnan commandery (≈ Dali/Xiangyun) is next. North of Sichuan the western edge is Wuwei (Guzang ≈ 102.6°E); the Hexi corridor beyond it (Zhangye, Jiuquan, Dunhuang) is **not** on the map. | ≈ 98.5–99.3°E |
| East | Liaodong (Xiangping ≈ Liaoyang 123.2°E; county "Xuantu"). Taiwan (Yizhou: Danshui, Chiqian) reaches about 121.9°E. | ≈ 123.5–124°E |
| North | Liaoxi/Liaodong (≈ 41.5–42.5°N). Dai (Gaoliu ≈ 40.4°N). Shuofang in the Ordos loop (≈ 40.5–41°N). | ≈ 42.5°N |
| South | Hainan (Zhuya county of Hepu; the island's south tip is ≈ 18.2°N). Jiuzhen (Xupu ≈ Thanh Hóa 19.8°N; county "Rinan"). | ≈ 18°N |

**Playable box ≈ 98.5–124°E × 18–42.5°N.** The painted frame extends to about 96–131°E × 15–45°N (my fit extrapolated to the image corners). It shows the Korean peninsula, the edge of the Tibetan plateau, the Indochina hills and the Inner Mongolian steppe as scenery.

- **Tibet: no.** The eastern plateau edge west of Shu and Yunnan appears as decorative mountain ranges.
- **Mongolia: no.** The Ordos loop (Shuofang) is playable. The steppe north of the Yellow River loop and the Yin Shan is backdrop. The cancelled northern expansion was meant to add it.
- **Xinjiang / Western Regions: no.** The map stops at Wuwei.
- **Korea: no.** It is drawn but not playable. Liaodong is the limit, and Lelang is absent.
- **Vietnam: the north only.** Jiaozhi (Longbien, Red River delta) and Jiuzhen (Thanh Hóa) are in; Rinan appears only as a county name.
- **Taiwan and Hainan: yes.**

### 1.3 How much of the map is "impassable" border

- Measured on the launch map image, which shows the full rectangle: playable polygons cover about **53% of the land drawn**, so about **47% is non-playable scenery**. See `analysis_tw3k_playable_green_vs_decorative_land_tan.png`.
- The current (dlc07) image goes further: TWDB's copy fades everything outside a rounded vignette to transparent, so the periphery is literally dissolved into paper.
- Inside the playable area, CA uses impassable terrain deliberately:
  - 1.6.0 added "new mountainous areas … to reduce the number [of] pathways available … to increase the number of strategic options available to the defenders of larger sections of the map";
  - the July 2020 blog announced "impassable shallows around Chang'an to stop the Yellow river being used to quickly take it";
  - 1.7.1 added "more impassable areas to the Yellow River to prevent moving past some passes".

---

## 2. Structure

### 2.1 Counts (v1.7, from TWDB data `regions.*.js` / `startpos`)

- **201 counties (regions)** in **82 data provinces**: 73 commanderies plus 9 gate-pass commanderies with one region each. A Steam discussion search result also gives "73 commanderies … plus 9 passes".
- County types:

| Type | Count |
| --- | --- |
| Commandery capitals | 73 |
| Gate passes | 9 |
| Farmland | 25 |
| Lumber | 16 |
| Livestock | 11 |
| Iron | 9 |
| Trade ports | 9 |
| Fishing | 8 |
| Tools | 8 |
| Copper | 6 |
| Salt | 6 |
| Horses | 4 |
| Spices | 3 |
| Tea | 3 |
| Silk | 3 |
| Jade | 2 |
| Armour craftsmen | 2 |
| Weapon craftsmen | 2 |
| Mounts (beast tamer) | 1 |
| Temple (Pengcheng/Luxian) | 1 |

- **Counties per commandery:** 2 counties in 37 commanderies, 3 in 26, 4 in 10.
- **Commandery size (map-measured, my conversion):**
  - Central Plain commanderies are the smallest: Liaoxi, Guangyang and Lean are about 12–14k km².
  - The largest are about 100–115k km²: Anding, Jiaozhi, Nanhai, Shuofang.
  - Pass commanderies are tiny, about 1–3k km².
  - The median county is about 16k km².
- **Capital spacing (real distances):**
  - nearest-neighbour median **≈ 145 km** overall;
  - **≈ 92 km in the Central Plain core**;
  - **≈ 166 km in the periphery**.
- **Launch count.** CA gives no official figure. The five commanderies with 1.6.0 (`dlc06`) keys are Xiapi, Liaodong, Yunnan, Yongchang and Jiuzhen, which implies about 68 non-pass commanderies at launch. 1.6.0 also moved counties from the south to the central plains ("Pengcheng was three regions and it's now two").
- **Wiki grouping.** The wiki groups commanderies into North, Central and South, and lists "Areas of Interest": the Great Wall, Dujiangyan, the Lingqu and Zhengguo canals, the Stone Forest, Wulingyuan, the Yangtze, Yellow and Yu rivers, and Mounts Emei, Hua, Longhu, Qingcheng, Qiyun, Song, Tai, Wudang and Wutai ([Locations wiki](https://totalwar.fandom.com/wiki/Locations_(Total_War:_Three_Kingdoms))). The full county list with types and map positions is in `research/tw3k/tw3k_regions_v1.7_twdb_201_regions.tsv`.

Commanderies (73): Anding, Anping, Ba, Badong, Baxi, Beihai, Bohai, Cangwu, Changsha, Chen, Dai, Danyang (Jianye), Dong, Donghai, Donglai, Fuling, Gaoliang, Guangling, Guangyang (Ji), Hanzhong, Hedong, Henei, Hepu, Huainan, Jiangxia, Jiangyang, Jianning, Jiaozhi, Jincheng, Jingzhao (Chang'an), Jiuzhen, Kuaiji, Langya, Lean, Liaodong, Liaoxi, Lingling, Linhai, Lujiang, Luling, Luoyang, Nan (Jiangling), Nanhai (Panyu), Nanyang, Northern Jian'an, Pengcheng, Pingyuan, Poyang, Runan, Shangdang, Shangyong, Shu (Chengdu), Shuofang, Southern Jian'an, Taiyuan (Jinyang), Wei (Ye), Wudu, Wuling, Wuwei, Xiangyang, Xiapi, Xihe, Xindu, Yanmen, Yingchuan (Xuchang), Yizhou (Taiwan), Yongchang, Youbeiping, Yulin, Yunnan, Yuzhang, Zangke, Zhongshan.
Passes (9): Gu, Hangu, Hulao, Jiameng, Kui, Qi, San, Tong, Wu.

### 2.2 Capital vs resource settlements, tiers, walls

- **Two kinds of counties.**
  - The **capital** is the "heart of the faction's infrastructure", with a town centre and building slots.
  - The other counties are **resource settlements** (farms, mines, ports, temples) that produce food and income. Primary food buildings exist only in those resource counties ([official 3K glossary](https://3kglossary.totalwar.com/) data; [Counties wiki](https://totalwar.fandom.com/wiki/Counties); [Commandery wiki](https://totalwar.fandom.com/wiki/Commandery)).
- **Split ownership.** Counties can be owned separately, so one commandery can be split between factions. Selecting any settlement opens the commandery panel.
- **Capital tiers (Settlement Administration chain):**
  - level 0: Abandoned;
  - levels 1–3: Small Town, Town, Large Town;
  - level 4: **Small City, "Settlement has walls"**;
  - levels 5–6: City, Large City;
  - levels 7–9: Small Regional City, Regional City, Large Regional City;
  - level 10: **Imperial City**.

  The level-4 text reads "…now boasts a large stone wall around the perimeter" ([wiki](https://totalwar.fandom.com/wiki/Settlement_Administration_(building_chain))). Walled settlements cannot be attacked at once without artillery. The attacker must besiege for turns to build rams and ladders, and walls weaken each turn ("siege escalation") ([glossary](https://3kglossary.totalwar.com/); [Siege wiki](https://totalwar.fandom.com/wiki/Siege_(Total_War:_Three_Kingdoms))).
- **Gate passes** are a separate settlement type at choke points. Each is "heavily fortified with walls, gatehouses, bastions, and towers" on two sides, and the attacker deploys on the side they approached from ([1.6.0 notes](https://web.archive.org/web/20210225041719/https://www.totalwar.com/blog/total-war-three-kingdoms-patch-1-6-0/)).
- **How walled cities look on the 3D campaign map.** See `tw3k_campaign_walled_city_pengcheng_vs_general_scale_summer215_steam.jpg`.
  - A level-7 city appears as a rectangular walled compound: a gatehouse, dense grey-tiled roofs inside and a straggle of houses outside the walls.
  - It is **hugely over-scaled**. The city is only 2–3× the height of a general's model, and at mid zoom a neighbouring commandery capital and a resource county of the same commandery are on screen together.
  - My rough read from screenshots: the footprint is on the order of 15–25 km of map, about 5× a real Han city.
  - Resource counties are unwalled clusters: farmhouses, a mine, a lumber yard, a port.
  - A razed settlement shows as black ash (`…xiangyang_harvest191…`).
- **Historical layout.** Art director Pawel Wojs said city layouts were researched: "quite specific north-south-east-west orientations … Han period clay models found in burial chambers … one of our layouts is literally the model Han settlement" ([PCGamesN interview, Jan 2019](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-interview-campaign-map-art)).

---

## 3. Scale and distortion

### 3.1 What CA said

- Wojs, art director: "A lot of [other games] are almost just a satellite representation of China's terrain, so we really wanted to push the beauty and natural diversity of China … **We picked some tropey environments present in China that might be isolated to a small area, but expanded them to fill more of the space**, just to celebrate the beauty of those environments." ([PCGamesN](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-interview-campaign-map-art))
- Patch 1.6.0: "**In a general sense, regions have reduced in the south and increased in the central plains**" and "new mountainous areas have been added to reduce the number pathways available." ([1.6.0 notes](https://web.archive.org/web/20210225041719/https://www.totalwar.com/blog/total-war-three-kingdoms-patch-1-6-0/))
- The Hulao Pass incident: "Hulao Pass is positioned North of Mount Song … The issue is that the mountain is in the wrong place … fixing it would break all of our internal saves." It was fixed in 1.7.1. This is evidence that the map is hand-authored rather than generated from a DEM ([July 2020 blog](https://web.archive.org/web/20210116082107/https://www.totalwar.com/blog/dev-blog-july-2020/)).
- Wojs on LOD: "We always layer the details. As you get closer you get more information … if you're pulling out … it can create a lot of visual noise. We try to clear that up … We also have new effects like fog and depth of field to give you that subtle blur at a distance." ([GamesBeat, Aug 2018](https://gamesbeat.com/how-creative-assembly-conceived-the-art-for-total-war-three-kingdoms/))
- **No GDC talk or dedicated map-making article was found.** Searched: totalwar.com news, the Steam news API (259 posts), PCGamesN, PC Gamer, GamesBeat and Chinese sites. A CA forum thread titled "The Production of Campaign Map" exists, but its page is rendered by script and its content could not be fetched.

### 3.2 What the data shows (my measurement)

**Method.**
- TWDB publishes the v1.7 painted map (3840 × 3024 px, the same frame as the 892 × 702 game-unit map), plus every settlement's pixel position and county polygons.
- I matched 73 commandery capitals and 3 well-known counties (Zhuya/Hainan, Linyu/Shanhaiguan, Dianchi/Kunming) to approximate real coordinates of their Han seats.
- I then fitted (a) a global affine transform and (b) a smoothed thin-plate spline, and took local scale from the spline's Jacobian.
- Result: `analysis_tw3k_map_with_warped_lonlat_graticule.jpg`, a 2° graticule warped onto the TW3K map, with our current prototype box drawn in green.
- Seat coordinates are approximate (±20–30 km), so read these as trends. Global residual RMS is ≈ 70 km.

**Results.**
- **Average scale:** about **0.91 km per painted-map pixel**, which is about **3.9 km per game unit**. Playable area is about 3.4 M km² measured on the map.
- **Anisotropy.** A plain lat/lon fit gives **117 px per degree of longitude and 110 px per degree of latitude**, so CA drew degrees almost as squares. At 30–35°N that makes east–west about **1.25–1.35× too wide** relative to north–south.
  - Local Jacobians give east scale 1.2–1.4 px/km against north scale 0.9–1.1 px/km everywhere.
  - Islands confirm it: Taiwan comes out 1.33 px/km east–west against 0.81 north–south. Hainan comes out 1.14 against 0.98.
- **Core enlarged, periphery compressed.** Local areal scale in px/km:

| Place | px/km |
| --- | --- |
| Luoyang | 1.20 |
| Xuchang | 1.20 |
| Pengcheng | 1.20 |
| Xiangyang | 1.18 |
| Ye | 1.16 |
| Jianye | 1.16 |
| Chang'an | 1.13 |
| Chengdu | 1.11 |
| Changsha | 1.09 |
| Liaodong | 1.07 |
| Ji (Beijing) | 1.04 |
| Panyu | 1.03 |
| Jiaozhi | 0.99 |
| Yunnan | 0.98 |

  This means the Central Plain is about **15–20% larger in linear scale (≈1.35–1.45× in area)** than Lingnan, Yunnan and You.
- **Pairwise distances** (px/km; the map-wide mean is 1.10):

| Pair | Real km | Map px | px/km | Effect |
| --- | --- | --- | --- | --- |
| Luoyang–Chang'an | 344 | 522 | **1.52** | Guanzhong corridor stretched about 1.4× to hold the Hangu, Tong, Wu, Qi and Gu passes |
| Xiangyang–Jiangling | 186 | 256 | 1.38 | Stretched |
| Jianye–Xiangyang | 626 | 852 | 1.36 | Middle Yangtze stretched |
| Chang'an–Chengdu | 608 | 723 | 1.19 | — |
| Luoyang–Xuchang | 133 | 144 | 1.09 | — |
| Nanhai–Jianye | 1131 | 1125 | 0.99 | — |
| Ye–Ji | 434 | 355 | **0.82** | Northern North China Plain compressed |
| Chengdu–Jianning | 574 | 473 | **0.82** | Nanzhong compressed |
| Taiyuan–Shuofang | 509 | 462 | 0.91 | Northern frontier compressed |

- **Settlement density** follows the same logic. Core capitals are about 92 km apart; peripheral ones about 166 km.

---

## 4. Terrain representation

### Mountains
- The 3D terrain is heavily sculpted: karst towers (Guilin/Wulingyuan style), loess and red-sandstone pinnacles, terraced hills, snow peaks ([Steam store text](https://store.steampowered.com/app/779340/): "lush subtropics, arid deserts and snow-capped mountains"; screenshots).
- Mountains are exaggerated vertically and horizontally, and "tropey" landscapes are spread wider than in reality (§3.1).
- Mountain ranges and extra mountains act as **impassable walls** channelling movement (1.6.0).
- On the painted map, mountains are drawn as ink hachure ridges with watercolour washes.

### Passes
- Nine gate passes are **settlements**, not just terrain: Hangu, Tong, Wu, Qi, Gu, Hulao, San, Jiameng, Kui.
- Each owns a tiny county (1–3k km²) that blocks a valley, and has a dedicated gate-pass battle map.

### Rivers and fords
- Rivers are wide blue ribbons. **River crossings cost extra action points** ("Difficult terrain such as forests, deserts, mountains and river-crossings will cost more action points … roads swifter still", [glossary](https://3kglossary.totalwar.com/)).
- Fords show as shallow sandbars with rows of posts (`…yellow_river_ford_henei…`).
- The Yellow River was made partly impassable (July 2020 blog; 1.7.1 notes).
- Canals appear as named landmarks (Lingqu, Zhengguo, Dujiangyan).

### Forests, deserts, fields and roads
- Forest canopy and scattered trees, desert and sand in the Ordos/Shuofang, paddy and field patchwork, paved or dirt roads between settlements.
- Terrain type drives movement cost and **ambush chance**: desert low, grassland medium, forest and mountains high, hilly forest best ([glossary](https://3kglossary.totalwar.com/)).

### Seasons
- **Five seasons, one per turn: Spring, Summer, Harvest, Autumn, Winter; 5 turns = 1 year** (official [3K glossary](https://3kglossary.totalwar.com/) data; [Seasons wiki](https://totalwar.fandom.com/wiki/Seasons_(Total_War:_Three_Kingdoms))).
- Screenshots show "HARVEST 191", "SUMMER 191", "SPRING 200", "SUMMER 215".
- Visual effects: "foliage turn[s] from lush green to ruddy brown, while leaves, snowflakes, and cherry blossom drift lazily across the world" ([PCGamesN impressions](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-campaign-map-impressions)).
- Winter is visually dark enough that players asked for a "MAKE WINTER LESS DARK!" mod ([Steam "Most Wanted Mods" thread](https://steamcommunity.com/app/779340/discussions/0/1651045226233579296/)).
- Gameplay effects: Harvest raises peasant income; Winter burns military supplies; reforms land in Spring.

### Day/night and weather
- "We have a night and day cycle on the campaign map, which will be continuously running" (Wojs, [GamesBeat](https://gamesbeat.com/how-creative-assembly-conceived-the-art-for-total-war-three-kingdoms/)).
- At night, "traders light tiny lanterns" ([PCGamesN](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-campaign-map-impressions)).
- Storms and lightning are visible on the campaign map (`…midzoom_central_plain…`).
- Battle weather (rain, fog, heat, snow, wind) follows the season.

### Distance treatment
- LOD layering, fog and **depth-of-field blur** when zoomed in ("Zooming into the map will subtly blur the background").

### Fog of war
- Rendered as "a haze of grey cel-shading" ([PCGamesN](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-campaign-map-impressions)). Terrain stays visible; foreign armies outside your vision are hidden.
- Ambush-stance armies and their zone of control are hidden too.

### Strategic / zoomed-out mode
- At full zoom-out the 3D map gives way to the painted parchment map. Players call it the "white map" ("ZOOM OUT MORE WITHOUT GOING INTO WHITE MAP", [Steam](https://steamcommunity.com/app/779340/discussions/0/1651045226233579296/)).
- The same painted map (3840 × 3024) is used for:
  - the **diplomacy screen**, with faction territories as watercolour washes and ink-splash edges (`tw3k_ui_diplomacy_painted_strategic_map_faction_wash_steam.jpg`);
  - the **campaign-select screen** (`tw3k_ui_campaign_select_painted_map_182_steam.jpg`);
  - the round **minimap**.
- Holding **Space** on the campaign map shows ownership or diplomacy colour overlays ([Steam thread](https://steamcommunity.com/app/779340/discussions/0/1736634553078164666/)).
- Painted-map style: ink hachure mountains, green forest washes, blue rivers with dark banks, black commandery borders. Capital icons are red-roofed halls, resource icons are small blue halls, and pass icons are walled gatehouses (`tw3k_painted_map_crop_guanzhong_luoyang_passes_yellow_river.jpg`). Nanman-held settlements in the south-west switch to yellow thatched-hut icons, so culture is readable at strategic zoom. The playable border there is a heavy black line, and beyond it the painted mountains fade into blank paper (`…southwest_nanzhong_jiaozhi_border.jpg`).

---

## 5. Armies and labels on the campaign map

### Armies
- "An army is represented by the model of the commanding general" ([Army wiki](https://totalwar.fandom.com/wiki/Army_(Total_War:_Three_Kingdoms))). One army holds up to 3 generals, each with up to 6 units, but **only the leading general is shown**.
- The general is a **giant 3D character**, several storeys tall relative to the terrain and about a third to half the width of a city.
- Above the general float a **vertical banner** on a pole, in faction colours with the family character (曹, 董, 袁…), and a **round portrait token** with rank stars and a small strength/supply bar. The token has a red marker when trespassing.
- The **zone of control** is "the black-ink radius that appears … when they are moused over or selected" ([glossary](https://3kglossary.totalwar.com/)). The reachable area appears as a tinted, ink-edged zone (`…nanman_terraced_hills_movement_overlay…`), and the planned route as a green line.
- "Attrition is visually indicated by the shadows of soldiers falling away from the army on the campaign map" (glossary).
- Stances: Normal, March (+50% range), Encamp, Ambush (hidden).
- Players complained that banners of different factions look too alike ([Steam thread](https://steamcommunity.com/app/779340/discussions/0/1642038749317256993/)).

### Settlement plates
- Each plate floats above the settlement and shows:
  - the owner's portrait and faction flag;
  - the **commandery name** in caps (e.g. "XIANGYANG", "HENEI");
  - a **subtitle** with the county name or type: "City", "Jade Mine", "Farmland", "Temple", "Huaixian";
  - a **star** marking the commandery capital;
  - the population (e.g. "2M");
  - a numbered **settlement-level/building icon**;
  - a coloured status badge.
- Plates also show garrison or siege state. They can be toggled (Ctrl+T per the [Feral manual](https://www.feralinteractive.com/en/manuals/threekingdomstw/1.0/steam/?access=zooevrj6xb)).
- Landmarks ("areas of interest", e.g. Great Wall sections) carry map pins with short historical notes (Wojs, PCGamesN; [Steam comment](https://steamcommunity.com/app/779340/discussions/0/2440336228801673915/)).

---

## 6. Reference images saved (reference only, never ship)

Folder: `(scratchpad phiên làm việc, không commit)/research/tw3k/`

| File | What it shows | Source |
| --- | --- | --- |
| `tw3k_full_campaign_map_twdb_3840x3024.webp` | Current (v1.7, post-1.6.0) painted map, full extent, periphery vignetted to transparent | TWDB CDN `cdn.twdb.io/three-kingdoms/campaign_maps/3k_dlc07_main_map/three_kingdoms_china_map.webp` via [twdb.io](https://twdb.io/three-kingdoms/maps/rise-of-the-warlords/) |
| `tw3k_full_campaign_map_launch_v1.0_fandom_3840x3024.webp` | Launch painted map (full rectangle, including Korea and the Tibetan edge; no Yunnan, Jiuzhen or Liaodong) | [Wiki file "TW3K campaign map.png"](https://totalwar.fandom.com/wiki/File:TW3K_campaign_map.png) |
| `tw3k_commanderies_labeled_map_v1.7_fandom_1300x1055.webp` | Fan-made labelled map of all 73 commanderies and 9 passes on the painted map | [Wiki file](https://totalwar.fandom.com/wiki/File:Three_Kingdoms_Commanderies_Map.png) |
| `tw3k_painted_map_crop_guanzhong_luoyang_passes_yellow_river.jpg` | Crop of the TWDB image: passes, Yellow River and icon styles | derived |
| `tw3k_painted_map_crop_southwest_nanzhong_jiaozhi_border.jpg` | Crop: the south-west border fading into decorative mountains | derived |
| `tw3k_campaign_closeup_general_model_city_plates_xiangyang_harvest191_steam.jpg` | Giant general model, city and resource plates, razed settlement, karst, Harvest season | [Steam store](https://store.steampowered.com/app/779340/) |
| `tw3k_campaign_walled_city_pengcheng_vs_general_scale_summer215_steam.jpg` | Walled Small Regional City against general scale; several plates in one view | [Wiki file TW3K screenshot-steam-4](https://totalwar.fandom.com/wiki/File:TW3K_screenshot-steam-4.jpg) (Steam press shot) |
| `tw3k_campaign_yellow_river_ford_henei_generals_spring200_fates_divided_steam.jpg` | Yellow River with ford posts, generals with banners, a 200 CE start | [Fates Divided on Steam](https://store.steampowered.com/app/1493250/) |
| `tw3k_campaign_nanman_terraced_hills_movement_overlay_summer191_steam.jpg` | South-west terrain, terraced hills, movement-range overlay, route line | [Furious Wild on Steam](https://store.steampowered.com/app/1299591/) |
| `tw3k_campaign_midzoom_central_plain_plates_density_summer215_steam.jpg` | Mid-zoom Central Plain: plate density, lightning storm | [Steam store](https://store.steampowered.com/app/779340/) |
| `tw3k_campaign_autumn_generals_karst_awb_steam.jpg` | Autumn palette, generals, karst | [Wiki file](https://totalwar.fandom.com/wiki/File:TW3K_AWB_steam-screenshot07.jpg) |
| `tw3k_ui_diplomacy_painted_strategic_map_faction_wash_steam.jpg` | Painted map as a strategic/diplomacy view with faction washes | [Steam store](https://store.steampowered.com/app/779340/) |
| `tw3k_ui_campaign_select_painted_map_182_steam.jpg` | Painted map on the campaign-select screen (182 start) | [Mandate of Heaven on Steam](https://store.steampowered.com/app/1154760/) |
| `tw3k_seasons_concept_art_fandom.webp` | CA concept art of one valley in three seasons | [Wiki file](https://totalwar.fandom.com/wiki/File:TW3K_Seasons.jpg) |
| `analysis_tw3k_map_with_warped_lonlat_graticule.jpg` | **My analysis**: 2° lon/lat graticule warped onto the TW3K map (thin-plate spline through 76 settlements); green outline = our prototype box 101–122.5°E × 21–42°N; black circles = the 76 matched settlements | derived |
| `analysis_tw3k_playable_green_vs_decorative_land_tan.png` | **My analysis**: playable (green) vs decorative land (tan) vs sea | derived |
| `tw3k_regions_v1.7_twdb_201_regions.tsv` | Data: 201 counties with commandery, name, type, map x/y (pixels, y up) | TWDB `regions.*.js`, names from TWDB i18n |

---

## 7. Comparison with our prototype, and what helps for a full-China map

### 7.1 Side by side

| | TW3K (v1.7) | Our prototype (round 5) | Owner's request |
| --- | --- | --- | --- |
| Extent | ≈ 98.5–124°E × 18–42.5°N playable; painted frame ≈ 96–131°E × 15–45°N | 101–122.5°E × 21–42°N | ≈ 73–135°E × 18–54°N |
| Area on the globe (bounding box) | ≈ 6.6 M km² box (≈ 3.4 M km² playable land) | ≈ 4.7 M km² | **≈ 22 M km²** (≈ 4.6× ours) |
| Scale | Hand-painted, not to scale; ≈ 0.9 km/px, ≈ 3.9 km per game unit; world = 892 × 702 units | Real DEM, 3 km/unit, ≈ 2,000 × 2,300 km (ADR 0006) | At 3 km/unit, an Albers rectangle ≈ 6,600 × 4,300 km, ≈ **2,200 × 1,450 units** |
| Distortion | East–west × 1.25–1.35; Central Plain × 1.15–1.2 linear; Guanzhong × 1.4; north Hebei and Nanzhong × 0.8 | None, except cities enlarged (`2.8·L^0.8`) | — |
| Nodes | 73 capitals + 119 resource counties + 9 passes; capital spacing ≈ 92 km (core) / 166 km (periphery) | 14 provincial seats; median nearest-neighbour ≈ 260 km | — |
| Non-playable periphery | ≈ 47% of drawn land; Tibet, steppe, Korea and Indochina painted only | none; the whole box is terrain | Tibet, Xinjiang, Mongolia, Manchuria, Qinghai: none of it Han-administered in 200 CE |

Our current box is already about the size of TW3K's whole playable China. TW3K covers 3–4° more to the west (Yunnan), south (Jiuzhen, Hainan) and east (Liaodong). Everything the owner now adds is territory TW3K either painted as backdrop or planned and then cancelled (the "north").

### 7.2 TW3K techniques that help with a bigger map

1. **A detailed stage plus a painted backdrop.**
   - TW3K spends its 3D detail on the Han core. The whole periphery (about half the drawn land) is scenery with no settlements, faded into paper at the edge.
   - For full China: keep 3 km/unit and full detail for the Han 13 provinces. Render the Tibetan plateau, Tarim/Dzungaria, the Gobi/Mongolian steppe and the north-east forests from a coarse DEM, e.g. 6–12 km cells, streamed only when looked at. Style them as ink/wash so low detail reads as intentional.
2. **Density that follows importance.**
   - TW3K's rework moved counties from the south to the central plains. Peripheral regions are 5–9× larger than core ones, and capitals are about 2× farther apart.
   - For the new areas, a few huge regions are historically right for 200 CE. Examples: Qiang (Qinghai/Tibet edge), Xianbei/Wuhuan (steppe), the Western Regions (a handful of oasis states along the Tarim rim), Fuyu/Goguryeo (north-east).
3. **Choke-point nodes and impassable terrain instead of open space.**
   - TW3K makes passes into capturable single-county settlements. It adds mountains to cut pathways and makes stretches of the Yellow River impassable.
   - Candidates for a bigger map: the Yumen/Yang passes and the Hexi corridor (Xinjiang); Juyong, Yanmen and Linyu/Shanhai (north); Jiameng/Jianmen and Kuimen (Shu); Hangu/Tong (Guanzhong).
   - Mark plateau, desert and high mountains as impassable. Movement then runs along a few corridors. That keeps a 4.6× larger map legible, and it matches our Dijkstra-based province borders (ADR 0006).
4. **A painted strategic layer for the far zoom.**
   - TW3K's zoomed-out mode, diplomacy view and minimap all use one 3840 × 3024 painted texture with faction watercolour washes.
   - For a web budget (ADR 0005), switching to a baked 2D (or low-poly plus texture) map above a certain camera height is far cheaper than drawing 3D China. It also fits the story-clip focus, since the "who owns what" shots read best there.
5. **Hide distance, don't draw it.**
   - TW3K uses distance fog, depth of field and LOD layering, with grey cel-shaded fog of war over unknown areas.
   - Our AGENTS.md lessons already keep depth blur and distance haze. Fog of war over the periphery would also cut draw cost.
6. **Mild, deliberate distortion (optional; needs the owner's decision).**
   - TW3K enlarges the core about 1.15–1.2× linearly and stretches east–west about 1.3×.
   - With a real DEM we could apply a smooth radial warp that keeps the Han core at 1:1 and squeezes Tibet, Xinjiang and Mongolia 1.5–2.5×. That would cut the world to roughly 1,500 × 1,100 units.
   - The trade-off: the owner already complained the map was "much smaller than reality", and ADR 0006 chose true scale. This is a decision for the owner, not an engineering default.
7. **Landmark pins to fill empty space with story.** TW3K pins "areas of interest" with short historical notes. Dunhuang, the Great Wall, Kunlun, Lake Qinghai and Mount Tai could be narrative anchors in sparse regions.
8. **Cheap season and time cues.**
   - Seasons are a palette shift and particles (leaves, snow, blossom), not new geometry. The day/night cycle is a lighting change.
   - Warning from TW3K players: winter was too dark.
9. **Armies as one oversized general model plus a banner.** One draw item per army, readable at any zoom. Players complained that similar banners were hard to tell apart, so give each faction a clearly distinct colour and shape.
10. **A lesson from the Hulao/Mount Song error.** Hand-placed landmarks drift and players notice. Our DEM-based approach avoids this, but any stylised compression must keep famous landmark relationships intact: Hulao north of Mount Song, Hangu between Luoyang and Tong.

---

## 8. Method notes and caveats

- **Blocked sources.**
  - totalwar.fandom.com returns 403 to curl and WebFetch, but its MediaWiki API (`api.php?action=parse`) works, and so do images on `static.wikia.nocookie.net`.
  - totalwar.com returned 429, so I used archive.org copies of the patch notes and dev blog.
  - Reddit is blocked (403).
  - The CA community forum page for the thread "The Production of Campaign Map" is rendered by script and could not be read.
  - Nexus Mods and the TWC wiki are behind Cloudflare.
- **TWDB data.** From `twdb.io/_astro/*.js` (version string "1.7.x"): the region table (201 entries), start positions, county polygons (201 features) and English names.
- **Georeferencing.** Real seat coordinates are my approximations of the Eastern Han seats; a few are uncertain: Gaoliang/Siping, Shuofang/Heyin, Wuling/Qianling, Jincheng. Scale numbers are robust across smoothing settings (thin-plate spline λ = 0.3–3). Treat any single city's figure as ±10%. The analysis assumes TWDB's image is an undistorted top-down of the game map; its aspect ratio matches the 892 × 702 game bounds exactly.
- **Launch commandery count (~68)** is an inference, not an official number.
- **Seasons: 5 per year, not 4.** Confirmed by the official 3K glossary data (`3kglossary.totalwar.com/assets/data/data.json`: "five turns equal one year") and by the in-game season names in screenshots.

## Sources (main)

- PCGamesN, interview with Pawel Wojs and Attila Mohácsi (Jan 2019): https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-interview-campaign-map-art
- PCGamesN, campaign map impressions (Jan 2019): https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-campaign-map-impressions
- GamesBeat, Wojs art interview (Aug 2018): https://gamesbeat.com/how-creative-assembly-conceived-the-art-for-total-war-three-kingdoms/
- Patch 1.6.0 notes (archived): https://web.archive.org/web/20210225041719/https://www.totalwar.com/blog/total-war-three-kingdoms-patch-1-6-0/
- July 2020 dev blog (archived): https://web.archive.org/web/20210116082107/https://www.totalwar.com/blog/dev-blog-july-2020/
- Patch 1.7.1 notes (archived): https://web.archive.org/web/20220128184223/https://www.totalwar.com/blog/total-war-three-kingdoms-patch-1-7-1-notes/
- PCGamesN, 1.6.0 map rework (Aug 2020): https://www.pcgamesn.com/total-war-three-kingdoms/free-update-160
- Eurogamer, end of support and the northern expansion: https://www.eurogamer.net/creative-assembly-faces-backlash-over-decision-to-end-support-for-total-war-three-kingdoms
- PCGamesN, no more DLC: https://www.pcgamesn.com/total-war-three-kingdoms/no-more-dlc
- Official 3K glossary: https://3kglossary.totalwar.com/ (data: /assets/data/data.json)
- TWDB maps and data: https://twdb.io/three-kingdoms/maps/
- Total War Wiki (via API): Locations, Commandery, Counties, Settlement Administration, Siege, Army, Seasons, Terrain, The Furious Wild, Eight Princes. https://totalwar.fandom.com/wiki/Locations_(Total_War:_Three_Kingdoms)
- Wikipedia: https://en.wikipedia.org/wiki/Total_War:_Three_Kingdoms
- Steam store and screenshots: https://store.steampowered.com/app/779340/ , /app/1299591/ , /app/1493250/ , /app/1154760/
- Steam news (patch 1.7.1 summary): https://store.steampowered.com/news/app/779340
- Feral manual (key bindings): https://www.feralinteractive.com/en/manuals/threekingdomstw/1.0/steam/?access=zooevrj6xb
- Steam discussions:
  - Furious Wild map: https://steamcommunity.com/app/779340/discussions/0/2793874853442858787/
  - Most Wanted Mods ("white map", dark winter): https://steamcommunity.com/app/779340/discussions/0/1651045226233579296/
  - Space-bar overlays: https://steamcommunity.com/app/779340/discussions/0/1736634553078164666/
  - Banners look alike: https://steamcommunity.com/app/779340/discussions/0/1642038749317256993/
