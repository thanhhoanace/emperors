# 14 cities around 200 CE: verification report

Date: 2026-09-25. Checked against `data/cities.json`, `docs/design/history.md` and `data/world.json`. None of these files was modified.

## How this was checked, and its limits

- **Could read in full:** zh/en Wikipedia (raw wikitext), Wikidata, Wikimedia Commons (API and thumbnails), OSM Nominatim, news.qq.com, jianan.gov.cn, shandong-chorography.org, dfz.nanjing.gov.cn, chinanews.com.cn, gzmuseum.com, eeo.com.cn, lsdlyj.com.cn, heze.dzwww.com, the *Shuijing zhu* on zh.wikisource.org and gj.zdic.net.
- **Blocked by the egress proxy, or only a captcha/connection reset:** kaogu.cssn.cn, hrczh.cass.cn, silkroads.org.cn, Baidu Baike, thepaper.cn, gmw.cn, cuhk.edu.hk, js-skl.org.cn, xzmuseum.com, the Hubei/Xiangyang/Beijing gov sites. Anything taken only from a search-engine snippet of one of these pages is marked **(snippet)**.
- **Coordinates:** "Ours" is `world.json` → `lonlat`. Distances were computed with an equirectangular approximation. `x` is east and `z` is south, in km from the city centre, which is the convention `cities.json` uses.
- **Renderer facts that shape the proposals** (`docs/design/prototypes/hancity.js`):
  - `rotation` turns local north to `(sin r, −cos r)`, so **+30 means the city axis points N30°E**. The current Chengdu value of −15 points N15°W.
  - `river`, `avenueEW/NS`, `canalRing` and `frontHall` are not read by the renderer. Water comes from the terrain bake, so the `river` edits below only correct the documentation.
  - The feature types the renderer knows are `platform`, `coveredWay`, `granary`, `garden`, `market`, `mound`, `hill`, `twinTown`, `hillFort`, `watchtower`, `blockade`, `harbour`, `ironworks` and `bridges`. A que pair is only ever placed at the southern gate nearest the axis.

---

## 1. Lạc Dương (Han–Wei Luoyang, 汉魏洛阳城)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 112.623, 34.729 | OK: the Han–Wei city centre is about 112.625, 34.725. Wikidata gives 112.6183, 34.7195, 1.1 km away. The site is 15 km east of modern Luoyang | zh.wikipedia.org/wiki/汉魏洛阳故城 ; wikidata Q11133430 |
| wall lengths | 2.6 × 3.9 km box | W wall 3,700 m surviving, N wall 2,800 m, E wall 3,895 m surviving, S wall ~2,460 m (the Luo washed it away). Perimeter ≈ 12.90 km. Our outline measures 12.92 km, **OK** | Qian Guoxiang, 华夏考古 2022(3), reprinted at news.qq.com/rain/a/20220806A026NA00 |
| wall thickness (history.md 14–30 m) | 14–30 m | **14–25 m** | same |
| moat | 18–40 m | OK: 18–40 m wide, 4–10+ m deep | same |
| gates | N2 S4 E3 W3 | OK. S (E→W): 开阳门, 平城门 (main, leads into the South Palace), 小苑门, 津门. E (S→N): 耗门, 中东门, 上东门. W (S→N): 广阳门, 雍门, 上西门. N: 谷门 (E), 夏门 (W) | Qian 2022 |
| gate form | flat lintel, 3 passages | **Confirmed.** The excavated 上东门 is 30 m wide and 12.5 m deep, with 3 passages carried on 排叉柱 posts under a 过梁 flat-lintel ("大过梁式城门") | Qian 2022 |
| South Palace | at [0, 1.05], 1.0 × 1.55 | ~1.0 (E–W) × 1.6 (N–S) km, **built against the south wall**, between the 小苑门 street (W) and the 开阳门 street (E) → **[0.15, 1.15], size [1.0, 1.6]** | Qian 2022 ; File:东汉洛阳城.png |
| North Palace | at [0, -1.1], 1.0 × 1.55 | ~1.0 × 1.6 km, built against the north wall, between the 夏门 street and the 谷门 street, slightly west of the axis → **[-0.15, -1.05], size [1.0, 1.6]** | Qian 2022 |
| covered way (复道) | 0.28 → -0.33 | OK. It crossed between 玄武阙 (South Palace) and 朱雀阙 (North Palace) over the 中东门 street and ran as three lanes. New ends: [0, 0.35] → [0, -0.25] | Qian 2022 (蔡质《汉典职仪》) |
| granary (太仓/武库) | [0.9, -1.3] | NE corner, inside 上东门 → [1.0, -1.6] | File:东汉洛阳城.png |
| garden [-0.85, -1.1] | 濯龙园 | OK per the older plan: 濯龙园 lies NW of the North Palace. Qian 2022 puts it inside the North Palace instead | File:东汉洛阳城.png ; Qian 2022 |
| missing: 金市 | — | Main market, inside 上西门, W of the North Palace and NW of the South Palace, about [-1.05, -0.1] | Qian 2022 |
| missing: 永安宫 | — | Small detached palace NE of the North Palace, about 1 li square, about [0.75, -1.1] | Qian 2022 ; File:东汉洛阳城.png |
| ritual platforms | 灵台, 明堂, 辟雍 at z=2.9 | OK: about 1,000 m south of the south wall, in the order 灵台, 明堂, 辟雍, **太学** (W→E). 太学 is missing from ours | Qian 2022 |
| Luo River | "south" | In 200 it ran **south of the ritual zone**, more than about 1.5 km from the wall. It later moved north and destroyed the south wall | Qian 2022 (南市 "南面临近洛水") ; museum plan photo |
| state 200 | ruined | OK: burnt by Dong Zhuo in 190. In 196 the emperor camped in 杨安殿 among the ruins | zh.wikipedia 北宫/南宫 (东汉) |

**Proposed cities.json edits (si_li)**
```
palaces[0] "Nam cung": at [0, 1.05] -> [0.15, 1.15]; size [1.0,1.55] -> [1.0, 1.6]
palaces[1] "Bắc cung": at [0,-1.1] -> [-0.15,-1.05]; size [1.0,1.55] -> [1.0, 1.6]
features coveredWay: from [0,0.28] -> [0,0.35]; to [0,-0.33] -> [0,-0.25]
features granary: at [0.9,-1.3] -> [1.0,-1.6]
+ { "type": "market", "name": "Kim thị", "at": [-1.05, -0.1] }
+ { "type": "garden", "name": "Vĩnh An cung", "at": [0.75, -1.0], "size": [0.4, 0.6] }   (or a small ruined palace)
+ { "type": "platform", "name": "Thái Học", "at": [1.25, 2.8], "size": [0.3, 0.2], "height": 1 }
```

---

## 2. Trường An (Han Chang'an, 汉长安城)

| field | ours | correct | source |
|---|---|---|---|
| **lonlat** | 108.857, 34.304 | This is the **Weiyang Palace park centre**, not the city centre. The OSM park bbox is 34.290–34.315 N, 108.844–108.871 E. City centre ≈ **108.879, 34.322** (2.8 km NE of ours). The east wall then falls on the 汉城湖 moat lake (E edge 108.915 E) | OSM Nominatim "汉长安城未央宫国家考古遗址公园", "汉城湖" ; wikidata Q3051521 (未央宫 108.8572, 34.3044) |
| wall lengths | 5.8 × 6.1 km box | E 6,000, S 7,600, W 4,900, N 7,200 m (25.7 km), area ~36 km². E and W walls straight. The N wall steps NE along the Wei. The S wall **bulges south in the middle** at 安门, between 长乐宫/高庙 and 未央宫. Its **SE section (覆盎门) is the northernmost part of the S wall**; ours has it the other way round | news.qq.com/rain/a/20220908A047V300 (Xu Longguo 2022) ; eeo.com.cn/2025/0124/708181.shtml ; File:汉长安城图.jpg |
| wall | ~12 m | OK: 12 m high, base 12–16 m. Base 19–20 m on the E wall south of 长乐宫 | Xu 2022 ; zh.wikipedia 汉长安城 |
| moat | 35–45 m | **40–45 m wide**, ~3 m deep, 20–30 m outside the wall (zh.wikipedia's "8 m" is the 1950s figure) | eeo.com.cn **(snippet** of 张建锋, hrczh.cass.cn PDF) |
| gates | 3 per side, 3 passages | OK. E (N→S): 宣平, 清明, 霸城. S (E→W): 覆盎, 安, 西安. W (N→S): 雍, 直城, 章城. N (W→E): 横, 厨城, 洛城. Each passage 8 m wide (≈6 m clear), dividers 4 m, gate 32 m wide. **西安门 and 霸城门 (facing the palaces) have 14 m dividers and are 52 m wide.** The three E gates have que-like earthen walls projecting outward on both sides. After 25 CE most gates used only 1–2 passages | Xu 2022 |
| que | "imperial" at the main S gate | Historically the que stood at **Weiyang's E and N palace gates** (东阙, 北阙), plus que-like wings on the E city gates. None at 安门. The renderer's single que at the S gate is therefore misplaced | Xu 2022 ; zh.wikipedia 汉长安城 |
| Weiyang | at [-1.75, 1.5], 2.1 × 2.2 | **2,250 (E–W) × 2,150 m**, in the SW, touching the S wall → **[-2.0, 2.15], size [2.25, 2.15]**. Front hall platform about 200 × 350–400 m, up to 15 m high | Xu 2022 |
| Changle | at [1.45, 1.45], 2.6 × 2.3 | **~3,000 × 2,044 m**, SE → **[1.6, 1.2], size [2.9, 2.05]** | Xu 2022 |
| "granary" [-0.1, 1.3] | granary | Between the palaces stood the **武库 arsenal** (710 × 322 m). The 太仓 site is unknown (Tang texts put it SE outside the city) | Xu 2022 |
| markets | — | 东市/西市 in the NW, off the 横门 avenue | zh.wikipedia 汉长安城 |
| state 200 | ruined | OK: palaces burnt in 195 (Li Jue/Guo Si). In 200 it was held by Cao Cao's 司隶校尉 钟繇 | — |

**Proposed cities.json edits (liang).** The outline below was traced from File:汉长安城图.jpg, scaled so that the E wall is 6.0 km. It reproduces N 7.16 / E 6.0 / S 7.7 / W 5.05 km (the published lengths are 7.2 / 6.0 / 7.6 / 4.9).
```
outline -> [[-3.0,-1.5],[-2.15,-2.1],[-1.0,-2.1],[-1.0,-2.45],[-0.3,-2.45],[0.85,-3.2],[1.0,-3.45],[3.25,-3.5],
            [3.25,2.5],[0.65,2.5],[0.65,3.5],[-0.35,3.5],[-0.35,3.3],[-3.25,3.3],[-3.25,0.95],[-3.0,0.95]]
palaces[0] Vị Ương: at -> [-2.0, 2.15]; size -> [2.25, 2.15]   (keep frontHall)
palaces[1] Trường Lạc: at -> [1.6, 1.2]; size -> [2.9, 2.05]
features granary -> rename "Vũ khố" (arsenal), at [-0.1, 1.45]
+ { "type": "market", "name": "Đông thị · Tây thị", "at": [-1.9, -1.3] }
que: keep "imperial" only if the renderer can put the pair at Weiyang's E/N gates; otherwise "none"
world.json liang.lonlat: [108.857, 34.304] -> [108.879, 34.322]
```

---

## 3. Nghiệp Thành (Ye, 邺北城)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 114.4, 36.275 | This is the **Three Terraces park** (36.2769, 114.4001), i.e. the **NW corner / W wall**. City centre ≈ **114.413, 36.271** (1.2 km ESE) | OSM Nominatim "铜雀三台遗址公园" ; zh.wikipedia 邺城遗址 |
| size | 2.4 × 1.7 km | OK for **Cao Cao's city (built from 204, 213 on)**: E–W 2,400, N–S 1,700 m (texts: 7 × 5 li). Walls: S base 16.35 m, E 15–18 m. What Yuan Shao's Han city looked like in 200 is unknown. It had an **inner city (内城), destroyed in the 204 siege** | mfxtd.com/page138?article_id=36028 (survey summary) ; zh.wikipedia 邺城遗址 ; en.wikipedia Ye_(Hebei) |
| gates | N2 S3 E1 W1 | OK. S (W→E): 凤阳, 中阳, 广阳. E: 建春. W: 金明. N: 广德 (passage 20 m) and 厩门 | mfxtd survey |
| E–W avenue | z = -0.05 | The single 建春–金明 avenue (2,100 × 13 m) splits the city into a **larger north part**. The 中阳门 avenue is 17 m × 730 m long, so the E–W avenue is ~730 m north of the S wall → **z ≈ +0.12** | mfxtd survey |
| **Zhang River** | history.md: "west" | **North.** In Cao Wei times the Zhang flowed outside the **north** wall ("北临漳水"). The modern Zhang cuts through the site and follows the Yebei S wall. Cao's canal 长明沟 entered from the W | zh.wikipedia 邺城遗址 ; **(snippet** eeo.com.cn 2024/1108) |
| terraces | not built | OK: 铜雀 210, 金虎 213, 冰井 214, on the W wall, NW | zh.wikipedia 铜雀台 |
| state 200 | Yuan Shao | OK | — |

**Proposed edits (ji)**
```
features avenueEW: z -0.05 -> 0.12
+ "river": { "sides": "n" }   (documentation only)
palaces[0]: keep [0,-0.42] (north half) but note it is Yuan Shao's office, not Cao's 文昌殿
world.json ji.lonlat: [114.4, 36.275] -> [114.413, 36.271]   (optional, 1.2 km)
```

---

## 4. Hứa Xương (Xudu, 汉魏许都故城)

| field | ours | correct | source |
|---|---|---|---|
| **lonlat** | 113.93, 34.0 | Site = 张潘镇 古城村, 18 km SE of Xuchang centre → **114.019, 33.989** (**8.3 km off**) | zh.wikipedia 汉魏许都故城 ; wikidata Q15924011 ; OSM 张潘镇 33.993, 113.990 |
| inner city | 1.15 × 1.15 at SE | OK: **1,220 (E–W) × 1,180 m**, 1.44 km², at the SE of the outer city, 3 m above the plain. 1 gate per side, each ~6 m wide. Moat ~8 m | zh.wikipedia ; **(snippet** Baidu 汉魏许都故城) |
| outer city | 1.9 km square | **Uncertain.** It is described as "宛如游龙" (a winding, irregular line), about 5× the inner city's area, and **traditionally credited to Cao Wei's later expansion**. It may not have existed in 200. Local gazetteers disagree: "围九里一百二十九步" vs "周围十五里" | jianan.gov.cn page (许都城池) |
| 毓秀台 | [0.05, 0.7], 0.2 × 0.2 | At the **SW corner of the inner city (皇城西南隅)**, **15 m high**, footprint ~4,000 m² (≈ 65 m square) → [-0.17, 0.85], size [0.07, 0.07]. Ours is about 10× too large in area | jianan.gov.cn |
| canal | canalRing | Docks (码头) were found; a ring canal is plausible | **(snippet)** 2022 survey news |
| role 200 | capital | OK (emperor there since 196). Note the Eastern Han **Yuzhou seat was 谯 (Qiao)**, not Xu | — |

**Proposed edits (yu)**
```
sub[0].outline -> [[-0.27,-0.23],[0.95,-0.23],[0.95,0.95],[-0.27,0.95]]   (1.22 x 1.18)
features platform "Dục Tú Đài": at -> [-0.17, 0.85]; size -> [0.07, 0.07]
(optional) keep the outer wall but mark "era": "vòng ngoài có thể là Tào Ngụy"
world.json yu.lonlat: [113.93, 34.0] -> [114.019, 33.989]
```

---

## 5. Lâm Truy (Linzi, 临淄齐国故城)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 118.355, 36.883 | OK. The large-city centre is ≈ 118.355, 36.873 (NE corner at 河崖头 36.885, 118.373; 刘家寨 in the S-centre at 36.864, 118.346) | en.wikipedia Ancient_Linzi ; OSM |
| large city | 3.05 × 4.5 km | N–S max 4.5 km, E–W ~3.5 km. **E wall follows the Zi River in many bends.** Walls 20–30 m (max 43 m) | shandong-chorography.org/database/a/section/70/article/75/ ; en.wikipedia |
| small city | 1.4 × 2.2 at x -1.9..-0.5, z 0.9..3.1 | ~1.4–1.5 × 2.2 km, perimeter ~7 km, walls up to 60 m. **Its NE part is embedded in the large city's SW corner** and it extends ~0.75 km south of the large city. Traced position: x -2.5..-0.9, z 0.65..2.75 (ours is ~0.4 km too far east) | chorography ; File:Linzi Zhanguo.svg (traced) |
| gates | L: N2 S2 E1 W1 ; S: N1 S2 E1 W1 | OK (11 gates, ~10 m wide). The small city's E and N gates open into the large city, and their mouths are flanked by walls projecting outward | chorography |
| 桓公台 | [-1.5, 1.35], 0.2 × 0.3 | NW of the small city, **~86 × 70 m, 14 m high**, oval, 3 tiers → [-1.85, 1.3], size [0.07, 0.09] | en.wikipedia ; chorography |
| palace | [-1.2, 1.9] | The palace zone is the **NW of the small city**. Western Han halls were excavated ~100 m NE of 桓公台. A 20 m canal ran E and N of the platform to the 系水 → [-1.8, 1.05] | chorography |
| rivers | none given | Zi (淄河) along the E wall; 系水 (Xi, old course) along the W of the large city and the small city | chorography ; en.wikipedia |
| Han industry | — | Iron smelting in the W-centre and S of the large city; bronze casting and mint SE of 阚家庄 (centre); large rammed-earth foundations around 刘家寨 (S-centre) | chorography |
| "24 góc" (history.md) | — | Not verified | — |

**Proposed edits (qing).** Traced from File:Linzi Zhanguo.svg at ~12 m/px. The large perimeter comes out at 15.2 km and the small at 6.8 km.
```
outline -> [[-1.55,-1.95],[-0.7,-1.95],[-0.7,-2.3],[1.4,-1.75],[1.4,-1.45],[1.6,-1.4],[1.6,0.05],[1.75,0.15],[1.75,0.55],
            [1.4,0.8],[1.4,1.4],[1.55,1.45],[1.55,2.3],[-1.05,1.9],[-0.95,0.65],[-1.75,0.65],[-1.75,-0.8],[-1.6,-1.8]]
sub[0].outline -> [[-2.2,0.65],[-0.9,0.65],[-1.05,1.9],[-1.15,2.75],[-2.3,2.55],[-2.5,2.5],[-2.5,1.7],[-2.35,1.45],[-2.2,1.4]]
palaces[0]: at [-1.2,1.9] -> [-1.8, 1.05]; size [0.6,0.6] -> [0.35, 0.3]
features platform "Hoàn Công Đài": at -> [-1.85, 1.3]; size -> [0.07, 0.09]
+ { "type": "ironworks", "at": [-0.3, 0.9] }
+ "river": { "sides": "ew" }
```

---

## 6. Tương Dương (Xiangyang) + Phàn Thành

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 112.141, 32.025 | OK (Wikidata 襄阳城 112.1416, 32.0251). The Han city lay in the **west** part, so it is at most ~1 km west | wikidata Q15920362 |
| Han city | 1.5 × 1.24 | Plausible, no survey found. The *Shuijing zhu* says the old county city "城北枕沔水 … 今大城西壘是也" (it is the **western rampart** of the later great city). zh.wikipedia adds that Liu Biao built a new city to the E around 190 | zh.wikisource 水經注/28 ; zh.wikipedia 襄阳城 |
| rivers | "ne" | OK: the Han (沔) runs along the N, then turns S past 鱼梁洲 on the E. **Add the 檀溪 creek about 1 li W of the city, flowing N into the Han** (where Liu Bei's horse 的卢 leapt) | 水經注/28 |
| moat | W+S, 0.14 km | The Ming moat is on **E, S and W** and up to 250 m wide; its width in 200 is unknown | zh.wikipedia 襄阳城 |
| Phàn Thành | [0.15,-1.55], 0.45 × 0.4 | OK: "城周四里" (~1.7 km perimeter), on the N bank | 水經注/28 |
| **岘山** | history.md: "~1 km SW" | **岘首山 is SE–S on the river bank**; the Han flows **east of** it, ~3 km from the city. 万山 (汉皋) is upstream to the **W/NW** | 水經注/28 ("沔水…又逕峴山東"; "沔水又東逕萬山北") |
| 景升台 | — | A terrace Liu Biao built on the S bank east of the city, near 白沙/鱼梁洲 | 水經注/28 |
| Liu Biao's tomb | — | 200 bu outside the E gate, but only after 208 | 水經注/28 |

**Proposed edits (jing)**
```
moat.sides "ws" -> "ews" (Ming evidence; the Han width stays unknown)
+ { "type": "platform", "name": "Cảnh Thăng đài", "at": [1.2, -0.5], "size": [0.08, 0.08], "height": 2 }
+ note: Tan creek (檀溪) 0.4 km west of the W wall; the terrain bake should add it
```

---

## 7. Kiến Nghiệp (Jianye / Stone City, 石头城)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 118.76, 32.05 | This is **Stone City itself** (清凉山 32.0525, 118.7558). Our layout puts the city at the centre and Stone City 2.1 km W. Sun Quan's seat (将军府, later 太初宫) was **S of Xinjiekou, W of 洪武路** ≈ **118.783, 32.034**. Relative to that point Stone City is at **[-3.1, -2.0]** | chinanews.com.cn/cul/2014/06-19/6296787.shtml (Wang Zhigao) ; zh.wikipedia 石头城 ; OSM |
| dates | "Stone City 212; Taichu from 212" | 211: seat moved from 京口 to 秣陵. 212: renamed 建业 and Stone City built. The 211 **将军府** became **太初宫 only in 229**, and was rebuilt in 247: perimeter 300 zhang (~0.7 km), ~9 ha | dfz.nanjing.gov.cn/gzdt/202403/t20240315_4186987.html ; chinanews 2014 |
| palace | "Thái Sơ cung", 0.75 × 0.6 km | In 212 it was a general's mansion. Even the 247 palace was only ~0.3 × 0.3 km | same |
| city wall | palisade 2.2 × 1.9 km | The Wu capital was later given as "周二十里一十九步". Wang Zhigao says Wu Jianye **had no well-formed city wall**, so a palisade is fine. In 212 there was only the Moling county town plus the mansion | chinanews 2014 ; dfz.nanjing |
| Stone City | "perimeter ~3 km" | "七里一百步" is the **Eastern Jin 石头大城**. Sun Wu's fort is the smaller **石头小城** on 清凉山 (walls 10 m base, 6 m surviving; Wu-era brick-paved road along the wall). Gates (Jin record): 2 on the S, 1 on the E, none on the river (NW) side. Beacon tower at the SW corner and on the ridge; granary enclosure NE inside | zh.wikipedia 石头城 |
| setting | river W | OK: the Yangtze ran along the W/NW foot of 石头山. Chen Yi's "东吴建邺图" shows the 秦淮 to the S, 钟山 E, 覆舟山/鸡笼山 N | File:The Eastern Wu Dynasty map of Nanjing,by Chen Yi.jpg |
| state 200 | not yet built | OK: in 200 Sun Quan was at 吴 (Suzhou) | — |

**Proposed edits (yang)**
```
palaces[0]: name "Thái Sơ cung" -> "Phủ tướng quân (sau là Thái Sơ cung)"; size [0.75,0.6] -> [0.3, 0.3]
features hillFort "Thạch Đầu Thành": at [-2.1,-0.3] -> [-3.1, -2.0]; size [0.9,0.7] -> [0.6, 0.5]
+ { "type": "watchtower", "at": [-3.4, -1.8] }   (beacon at the SW corner)
world.json yang.lonlat: [118.76, 32.05] -> [118.783, 32.034]
```

---

## 8. Hạ Khẩu (Xiakou / 却月城, Huang Zu)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 114.28, 30.565 | OK: the Han mouth by 龟山 (Guishan). Local histories place 却月城 at Hanyang's 梅子山/龟山 area (about 114.26–114.27, 30.55), within 2 km | *Shuijing zhu* 卷35 ; szfzg.wuhan.gov.cn **(snippet)** |
| description | crescent fort | *Shuijing zhu*: "沔左有郤月城，亦曰偃月垒，戴監軍築，故曲陵縣也。後乃沙羨縣治。昔…黃祖所守". So it was **built earlier by a 戴 supervising general**, held by Huang Zu, later the 沙羡 county seat. One gazetteer places it "在今汉口城区西南" (N bank) while Wuhan histories say Hanyang (S bank): **disputed** | gj.zdic.net/shibu/160/7379.html ; guoxuedashi **(snippet)** |
| perimeter "~250 m" | — | **No source found**; keep it as [?] | — |
| Sun Quan's 夏口城 | history.md: 223 | The *Shuijing zhu* says **黄初二年 (221)**, "黄鹄山东北对夏口城 … 依山傍江". Sanguozhi gives 黄武二年 (223). Cite both | 水經注 卷35 |
| river | "nw", harbour "w" | With the fort beside the Han mouth, the **Han is N** and the **Yangtze E**. Suggest `river.sides "ne"` and harbour "n". The Han's mouth may have shifted before the Ming (debated) | wuhan.gov.cn 2023 articles **(snippet)** |
| blockade | 2 ships | The two moored 蒙冲 and the rope barrier are from **208**, not 200. In late 199 Sun Ce routed Huang Zu at 沙羡 | en.wikipedia Battle_of_Jiangxia |

**Proposed edits (jiang)**
```
river.sides "nw" -> "ne"; features harbour side "w" -> "n"
blockade: add "era": "năm 208" or drop it for the 200 scene
```

---

## 9. Thành Đô (Chengdu)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 104.06, 30.66 | OK (天府广场 area; 石犀 finds put the 蜀郡 office here) | lsdlyj.com.cn article (below) |
| **rotation** | -15 | City and streets are turned **N30°E (北偏东30度)**, and that skew survived into the Ming–Qing streets. In our convention this is **+30** (−15 turns it N15°W) | lsdlyj.com.cn/CN/abstract/article/2096-6822/70654 (历史地理研究, "顺江山之形") ; zh.wikipedia 成都城墙 |
| size | outer perimeter ≈ 7.2 km | 周回十二里 → reconstructed **~5.8 km**. Scale both outlines by **~0.85** | lsdlyj |
| gates | 14 (7 + 7) | Recorded **18** (二九之通门, after Wudi's enlargement). The reconstruction gives **16**, with the big city having **no gate on its W (middle) wall**, as ours already has. history.md's "9 + 9" split has no source | lsdlyj ; **(snippet)** 18 gates |
| rivers | S | OK: the 郫江 ran close along the **S** wall and farther off to the **W**. The 检江 ran further S. Both were spanned by Li Bing's **seven bridges (七桥)** | lsdlyj ; 华阳国志 |
| market | 少城 | OK: the 少城 was the market quarter; the 大城 held the offices | **(snippet)** sohu 成都别名 |
| state 200 | Liu Zhang | OK: Liu Yan moved the Yizhou seat to Chengdu in 194 | — |

**Proposed edits (yi)**
```
rotation -15 -> 30
outline -> [[0,-0.72],[0.64,-0.81],[0.85,-0.34],[0.81,0.3],[0.6,0.68],[0,0.64]]
sub[0].outline -> [[-0.68,-0.6],[0,-0.72],[0,0.64],[-0.72,0.6],[-0.81,0]]
gates -> { "n": 2, "s": 3, "e": 3, "w": 0 }; sub[0].gates -> { "n": 2, "s": 3, "e": 0, "w": 3 }   (16)
features bridges count 5 -> 7
```

---

## 10. Phiên Ngung (Panyu / Guangzhou)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 113.27, 23.128 | OK (Nanyue palace site 113.2647, 23.1289; 0.6 km) | wikidata Q99575674 |
| size | 0.5 × 0.8 km | OK: an irregular quadrilateral about 500 × 800 m (0.4 km²), between 越华路 (N) and 西湖路 (S), bounded by the **W and E branches of the 文溪** | **(snippet)** 陳澤泓, cuhk.edu.hk v49p319 |
| palace | [0, -0.08], 0.3 × 0.3 | The Nanyue palace precinct (≥15 ha) filled the **N half**: 越华路–中山路, 吉祥路–旧仓巷. After 111 BCE the 南海郡 office stood on this site | gzmuseum.com/gbjt/202302/535.html ; **(snippet)** |
| Pearl River | "> 2 km wide just S" | **> 1.5 km** wide (Tang–Song), S of the city. The Nanyue timber water gate lies 500 m SW of the palace | gzmuseum |
| **role 200** | "Giao Châu" capital | **Not the Jiaozhou seat in 200.** It was the seat of Nanhai commandery (太守 **士武**, brother of 士燮). The Jiaozhou seat moved 龙编 → 广信 in 203 and → Panyu in **217 under Bu Zhi, who built walls then**. history.md's "210–217 [?]" should read **217** | **(snippet)** search on 步骘 217 ; 三国志·士燮传 |
| walls 200 | "unknown" | Still unknown. The Han army burnt the city in 111 BCE | gzmuseum |

**Proposed edits (jiao)**
```
palaces[0]: at [0,-0.08] -> [0, -0.2]; size [0.3,0.3] -> [0.35, 0.3]
+ "river": { "sides": "ews" }   (the Wenxi branches E and W, the Pearl River S)
+ era: "Quận trị Nam Hải (Sĩ Vũ); châu trị Giao Châu từ 217"
```

---

## 11. Tấn Dương (Jinyang)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 112.475, 37.735 | OK (Wikidata 112.4711, 37.7432; OSM site bbox 112.458–112.526 E) | wikidata Q11089408 |
| size | 2.7 km square [suy luận] | No Han survey. The **West City (西城)** is the old Jinyang: in its Tang–Five Dynasties form it measures **4,750 × 3,750 m at an orientation of 18°**, with a 16 m base, 12 m height and a **40 m moat on the S, W and N**. The main W-wall fill contains **Han–Jin sherds**, and there is an earlier Eastern Zhou core. The large circuit is usually credited to **Liu Kun (304)**, so the Han city was smaller. Keep 2.7 km [?] | news.qq.com/rain/a/20240204A003OQ00 ; **(snippet** 2002–2010 brief: 4750 × 3750 m, 方向18°) |
| orientation | 0 | Probably about 18° (the direction sign is not verified) | same |
| setting | Fen to the E | OK. The 西山 (悬瓮山, 晋祠) lies W; the 晋水 comes from 晋祠 (SW) into the moat | news.qq.com 2024 |
| state 200 | Bingzhou seat | OK. In 200 its 刺史 was **高干**, Yuan Shao's nephew | — |

**Proposed edits (bing)**
```
(optional) "rotation": 18 once the sign is confirmed
+ "moat": { "sides": "swn", "width": 0.04 }   (Tang evidence)
```

---

## 12. Kế Thành (Ji / Beijing)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 116.35, 39.88 | OK. The Tang Youzhou walls ran E ≈ 烂漫胡同, W ≈ 会城门, N ≈ 白云观 line, S ≈ 白纸坊, giving a centre ≈ 116.345, 39.886. Wikidata 116.382, 39.894 is 3.2 km E and less precise | zh.wikipedia 蓟城 |
| size | 2.9 × 3.7 (9 × 7 li) | "南北九里，东西七里" describes **Tang** Youzhou. The Han size is unknown. A wall dug in 1972 near 白云观 **overlies three Eastern Han tombs**, so it is post-Han | **(snippet)** beijing.gov.cn 蓟城考古拾零 |
| 蓟丘 | NW corner | OK ("城内西北隅有蓟丘", *Shuijing zhu*) | zh.wikipedia 蓟城 |
| state 200 | "Gongsun Zan vs Yuan Shao" | **Wrong for 200.** Gongsun Zan died at 易京 in 199; Youzhou was under Yuan Shao's son **袁熙** | — |

No geometry edits. Fix the history.md wording, and flag the size as Tang-derived.

---

## 13. Xương Ấp (Changyi, Juye)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 116.15, 35.15 | Site at 前/后昌邑村, 大谢集镇 → **116.115, 35.140** (3.4 km) | wikidata Q11087649 ; OSM 大谢集镇 35.179, 116.124 |
| walls | E1.29 N1.45 W1.42 S1.62 | 2017 survey: **E 1.27, S 1.71, W 1.41, N 1.45 km**, ~31 m wide, 4–6 m surviving, base 6.3 m below ground. Another report gives E 1,215 / W 1,377 / N 1,585 / S 1,720 m. Our S wall is slightly short | news.qq.com/rain/a/20241126A0854S00 ; **(snippet)** |
| moat | 0.03 | OK: ~30 m | same |
| **bastion** | — | A **马面** (projecting bastion) at the **S end of the W wall**, now a 28 × 15 × 3 m mound (西堌堆) | news.qq.com 2024 |
| inner/outer | — | 太平寰宇记: "中城周十余里，外城周三十余里". The surveyed circuit is the inner one | heze.dzwww.com/qx/jy/202312/t20231205_13263422.htm |
| platforms | châu phủ [-0.05,-0.15] | 2019 survey: **two large rammed-earth platforms in the N part**, one **N-centre-W** and one in the **E** (inside 后昌邑村) | heze.dzwww.com |
| ironworks | [0.35, 0.3] (SE) | Iron-working debris **in the NE, near the wall** | heze.dzwww.com |
| gates "6 [?]" | N1 S2 E2 W1 | No source found | — |
| canal "Hà Thủy" | — | Not verified; the 济水 ran nearby | — |
| role 200 | Yanzhou seat | OK: the Eastern Han Yanzhou seat was 昌邑. Cao Cao's own base was 鄄城 | zh.wikipedia 兖州 (古代) |

**Proposed edits (yan)**
```
outline[3] [-0.98,0.7] -> [-1.05, 0.72]   (S wall ≈ 1.69 km)
palaces[0]: at [-0.05,-0.15] -> [-0.2, -0.35]
+ { "type": "platform", "name": "Nền điện đông", "at": [0.4, -0.35], "size": [0.12, 0.1], "height": 1 }
features ironworks: at [0.35,0.3] -> [0.5, -0.55]
+ { "type": "watchtower", "name": "Mã diện", "at": [-1.12, 0.55] }   (stand-in for the SW bastion)
world.json yan.lonlat: [116.15, 35.15] -> [116.115, 35.140]   (optional)
```

---

## 14. Bành Thành (Pengcheng / Xuzhou)

| field | ours | correct | source |
|---|---|---|---|
| lonlat | 117.19, 34.26 | OK (Ming–Qing axis; 户部山 at 34.258, 117.182) | OSM |
| **role 200** | "Xuzhou seat" | **Wrong.** The Eastern Han Xuzhou seat was **郯 (Tan, 东海郡)**. In 196–200 the real centre was **下邳**. Pengcheng was the capital of the **Pengcheng kingdom** (彭城国). It became the Xuzhou seat only later (Wei–Jin) | zh.wikipedia 徐州 (古代) |
| walls | 1.8 × 1.5 box | Only the **E wall** is located (found 2013 under 苏宁广场, along today's 彭城路, next to the old 泗水): 9.7 m deep, 190 m exposed, base ~30 m. The other sides are unknown | **(snippet)** cnxz.com.cn 2024 "城下城" |
| rivers | "ne" | OK: "汴泗交流，东、北两面环水" (water on the E and N; the Si runs along the E wall) | news.qq.com/rain/a/20250926A057KI00 |
| axis | — | Xiang Yu's palace foundations sit at the N end of the 府署 → 南门 axis. 戏马台 on 户部山 is just S | news.qq.com 2025 |
| stone gate 3.2 m | — | Not re-verified (the thepaper.cn source is blocked) | — |

No geometry edits. Fix the role in history.md.

---

## Eastern Han architecture vs the history.md rules table (item 4)

Nothing contradicts the table. The additions and refinements:

1. **Flat-lintel gates: confirmed.** Luoyang's 上东门 is a "大排叉柱支撑的大过梁式城门" (Qian 2022). Chang'an passages are **8 m** wide (≈6 m clear), and gates facing palaces were 52 m wide (Xu 2022).
2. **Brick arches did exist under gates, but only as drains.** Chang'an 直城门 and 西安门 have **brick-vaulted culverts (砖券涵洞)** under them. Gate passages were still timber lintels.
3. **Que-like gate wings are Han, but they are not barbicans.** Both Chang'an's three E gates and Linzi's small-city E/N gates have walls projecting outward on both sides of the gate mouth. The rule "no 瓮城" stands. Add "flanking wall wings" as allowed.
4. **Bastions (马面) occur on a Han provincial wall:** Changyi has one at the SW of its W wall (28 × 15 m today). history.md does not mention them.
5. **Ramps (马道) and guardrooms** are built against the inner face of the walls at Chang'an gates (Xu 2022).
6. **Three-lane streets:** Luoyang's 夏门 street (24–25 m) is split into 3 lanes by rammed-earth kerbs ~1 m high and 1 m wide. Chang'an's central 驰道 is 20 m.
7. **Wall dimensions to add:**
   - Luoyang 14–25 m thick.
   - Ye 15–18 m.
   - Changyi 31 m.
   - Pengcheng ~30 m.
   - Xudu inner-city gates ~6 m and moat ~8 m, which supports small provincial gates.
8. **Palaces on high platforms: confirmed.**
   - 德阳殿 platform 2 zhang high, 37 zhang E–W (~100 m).
   - 桓公台 14 m.
   - 毓秀台 15 m.
9. **Roofs, que, courtyard houses:** no contrary evidence found.
10. **Commons images.** The Linzi museum diorama (File:Linzi model 2010 06 06.jpg) shows thatched commoners' roofs, but it is a modern reconstruction, so do not treat it as evidence. Han pottery models mostly show tiled roofs.

---

## Consolidated proposed edits

### world.json `lonlat`

| id | ours | proposed | Δ | why |
|---|---|---|---|---|
| **yu** | 113.93, 34.0 | **114.019, 33.989** | **8.3 km** | Xudu site is at 张潘镇 古城村 |
| **liang** | 108.857, 34.304 | **108.879, 34.322** | 2.8 km | ours is the Weiyang Palace, not the city centre |
| **yang** | 118.76, 32.05 | **118.783, 32.034** | 2.8 km | ours is Stone City; the seat/palace lay 3 km ESE |
| yan | 116.15, 35.15 | 116.115, 35.140 | 3.4 km | Wikidata site point (optional) |
| ji | 114.4, 36.275 | 114.413, 36.271 | 1.2 km | ours is the NW-corner terraces (optional) |

All others are within ~1 km of the Han site centre (you: 3.2 km from Wikidata, but ours matches the Tang wall lines better).

### cities.json
The edit blocks are in each section above. By priority:
- **Chang'an:** outline, palaces, arsenal.
- **Chengdu:** `rotation` +30, scale ×0.85, 16 gates.
- **Linzi:** outlines, platform size.
- **Xudu:** 毓秀台 position and size.
- **Luoyang:** palaces against the walls, plus 金市, 永安宫, 太学.
- **Jianye:** Stone City offset; the palace becomes the general's mansion.
- **Ye:** avenue z.
- **Changyi:** platforms, ironworks.
- **Xiakou:** river sides; the blockade is from 208.

### history.md corrections
- **Ye:** the Zhang River is **north**, not west. The 2.4 × 1.7 km plan is Cao's rebuild; Yuan Shao's city had an inner city.
- **Xiangyang:** 岘山 is ~3 km **SE–S** by the river, not 1 km SW. Add the 檀溪 creek W of the city.
- **Jianye:** 212 had the **general's mansion**, which became 太初宫 only in 229 (rebuilt 247). The ~3 km perimeter belongs to the Eastern Jin enlargement.
- **Xiakou:** Sun Quan's city is dated 221 in the *Shuijing zhu* (223 in Sanguozhi). The 250 m perimeter is unsourced. The fort's bank is disputed.
- **Chengdu:** add the N30°E orientation. "9 + 9" gates is unsourced (18 recorded, 16 reconstructed).
- **Panyu:** Bu Zhi built the walls in **217**. Panyu was **not** the Jiaozhou seat in 200 (Nanhai commandery under 士武). The river was >1.5 km wide.
- **Jinyang:** the Tang West City is 4.75 × 3.75 km at 18°. The Han size stays conjecture.
- **Ji:** 9 × 7 li is a Tang figure. In 200 Youzhou was under **Yuan Xi**; Gongsun Zan died in 199.
- **Changyi:** add the SW bastion and the platform/iron locations. The 6 gates are unsourced.
- **Pengcheng:** it was **not the Xuzhou seat** (that was 郯). Add the E wall found in 2013.
- **Chang'an:** the moat is 40–45 m (the "8 m" figure is outdated). Walls are E6.0 / S7.6 / W4.9 / N7.2 km. Gates are 32 m wide, or 52 m for 西安门 and 霸城门.
- **Luoyang:** walls are 14–25 m thick. Add 太学. In 200 the Luo ran south of the ritual zone.

---

## Downloaded reference images

Saved in `research/cities/`, for reference only.

| file | Commons title | licence / author | notes |
|---|---|---|---|
| luoyang-donghan-plan-ccbysa4.png | File:东汉洛阳城.png | CC BY-SA 4.0 (uploader-labelled "东汉洛阳城") | best schematic: gates, palaces, 永安宫, 太仓, ritual zone |
| luoyang-hanwei-museum-plan-cc0.jpg | File:Plan of Ancient Luoyang City during Han & Wei Dynasties (10341139146).jpg | CC0 (Gary Todd), photo of a Henan Museum panel | survey plan (includes Wei–N. Wei additions such as 金墉城) |
| luoyang-han-map-sy-ccbysa4.gif | File:Luoyang in Han Dynasty.gif | CC BY-SA 4.0 (SY) | 500 px thumbnail |
| luoyang-changan-herrmann1935-pd.jpg | File:Lo-yang and Ch'ang-an Ancient and Modern.jpg | Public domain (A. Herrmann atlas) | Han Chang'an shape is pre-archaeology: **do not use for geometry** |
| changan-han-plan-ccbysa4.jpg | File:汉长安城图.jpg | CC BY-SA 4.0 (Legolas1024) | source of the traced outline; wall lengths check out |
| changan-xian-han-tang-sy-ccbysa4.jpg | File:Xi'an, Han to Tang period.jpg | CC BY-SA 4.0 (SY) | regional placement with the Wei |
| changan-changle-weiyang-biyuan-pd.jpg | File:Chang Le Gong and Wei Yang Gong by Bi Yuan.jpg | Public domain (Bi Yuan, Qing) | traditional depiction |
| ye-museum-model-ccbysa4.jpg | File:20250913 Model of Ye.jpg | CC BY-SA 4.0 (Windmemories) | Yebei (top) + Yenan; three terraces NW |
| xuchang-xudu-site-photo-ccbysa4.jpg | File:20240826 Site of Xuchang City in the Eastern Han and Cao Wei Dynasty 01.jpg | CC BY-SA 4.0 (Windmemories) | site photo, no plan |
| linzi-zhanguo-plan-ccbysa4.svg / .png | File:Linzi Zhanguo.svg | CC BY-SA 4.0 (Zunkir, after the Cambridge History of Ancient China) | source of the traced Linzi outlines |
| linzi-museum-model-ccbysa3.jpg | File:Linzi model 2010 06 06.jpg | CC BY-SA 3.0 (Rolfmueller) | museum diorama |
| xiangyang-fancheng-1874-pd.png | File:The Town of Fancheng, on the Bank of the Han Jiang (Han River). Hubei Province, China, 1874 WDL2101.png | Public domain (A. N. Boyarsky 1874, WDL) | Qing-era view |
| jianye-eastern-wu-chenyi-pd.jpg | File:The Eastern Wu Dynasty map of Nanjing,by Chen Yi.jpg | Public domain (Chen Yi, Ming, 金陵古今图考) | schematic Wu Jianye with 石头城 |
| jianye-jiankang-plan-zunkir-ccbysa4.png | File:Jiankang plan dynasties du Sud.svg | CC BY-SA 4.0 (Zunkir) | Southern Dynasties (later than 212) |
| jinyang-corona-1968-pd.jpg | File:Taiyuan and Jinyang Old City Satellite Image in 1968.jpg | Public domain (CIA/NRO/USGS CORONA) | site traces N of the Ming county town |
| panyu-guangzhou-gate-map-pd.jpg | File:Guangzhou gate map.JPG | Public domain (PD-self, Tlp30908) | Qing city gates only |

- **No free plan found on Commons** for Chengdu, Xiakou, Ji, Changyi or Pengcheng.
- Commons originals are rate-limited (HTTP 429), so the larger images were fetched as standard-size thumbnails (≤1280 px).
- `research/tw3k.md` and `research/tw3k_work/` in the same scratchpad folder were not created by this task.
