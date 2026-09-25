# Four eastern cities in autumn 219 CE (Jian'an 24): research report

Date: 2026-09-25. Written for `data/cities.json` and `docs/design/history.md`. Nothing in the repo was modified.
Scope: Chung Ly (钟离), Giang Lăng (江陵), Lạc Dương in 219, Trường An in 219.

## How this was checked, and its limits

- **Read in full:**
  - zh.wikisource via the API: *Shuijing zhu* 卷34, *Dushi fangyu jiyao* 卷78, *Houhanshu* 卷9 and 卷72, and *Sanguozhi* 卷1, 2, 13, 15, 16, 21, 36, 47 and 54.
  - zh.wikipedia wikitext.
  - OpenStreetMap through Overpass (wall traces, gates, rivers).
  - Jingzhou city-wall articles on whb.cn, cdstm.cn, kepuchina.cn and hbda.gov.cn.
  - news.qq.com (Xu Longguo 2022 on Han Chang'an).
  - The Sina blog of a Fengyang local historian.
  - The abstract of Li Bujia 1997 (journal.ccnu.edu.cn).
- **Blocked by the egress proxy:** szbk.chuzhou.cn, sohu.com, Baidu Baike, wlt.hubei.gov.cn, jzmsm.org, cnhubei.com, jingzhou.gov.cn, hrczh.cass.cn (Zhang Jianfeng's paper on post-Han Chang'an), zhihu, bytravel. Anything taken only from a search-engine summary of one of these pages is marked **(snippet)**.
- **Nominatim and Wikidata** were rate-limited (HTTP 429), so coordinates come from OSM geometry fetched through Overpass.
- **Conventions:** as in `docs/research/cities.md`, x is east and z is **south**, in km from the proposed centre, with an equirectangular approximation. `[suy luận]` marks my own inference.
- **Renderer facts that shape the proposals.** These come from `docs/design/prototypes/hancity.js`, including the uncommitted working copy.
  - Gates go on the **longest edge facing each side**.
  - A `sub` polygon is walled on all of its edges, so a shared edge becomes a partition wall.
  - The moat follows only the main `outline`.
  - `state: "ruined"` burns every gate tower and every palace.
  - The working copy adds **`houses`** (fraction of house lots in use, applied when the state is not `ruined`). Occupied lots cluster round intact palaces, markets and gates, and 35% of the rest become groves. The 219 proposals below use this field.
  - `platform` features always draw an intact hall on top. There is no ruined-platform or construction-site option yet.
- **Scale:** the renderer enlarges each city about 2–3.4× relative to the terrain (`2.8 × km^0.8` units for the longest side, against 1 unit = 3 km of terrain). Features placed several km outside the walls therefore land far from their real terrain position. Keep outside features within about 1 km of the wall.

---

## 1. Chung Ly (钟离城遗址, Linhuai, Fengyang, Anhui)

### Which site applies in 219

- **The walled town 1.5–3 km east of 临淮关镇 is the only candidate, and it is the Han county seat.**
  - It is the Spring-and-Autumn 钟离 city: in 538 BCE the Chu official 箴尹宜咎 "城钟离以备吴" (*Zuozhuan*, Zhao 4).
  - It was then the Qin–Han 钟离 county town, until the Sui moved the seat west to today's 临淮关 as 濠州 and the old town was abandoned.
  - Han finds include a pottery sealing **"钟离丞印"** (seal of the county assistant), bronze spear heads and mirrors.
- **卞庄 is a tomb site, not a separate city.**
  - The 2007 bell-hoard tomb (钟离君康, 卞庄一号墓) was found on a construction site **north of this city**.
  - The larger 双墩一号墓 (钟离君柏) is ~20 km W at Bengbu.
  - No separate 卞庄 walled city was found, so the "older city at 卞庄" in the brief should be dropped.
- **Administrative status:**
  - Western Han 钟离县, first under 淮南国 and from Wudi under 九江郡.
  - Eastern Han **钟离侯国** (a marquisate) in 九江郡.
  - Jin 钟离县 in 淮南郡.
  - It was never a commandery seat before the Eastern Jin.
  - Source: *Gujin tushu jicheng*, 職方典 第0827卷, 鳳陽府沿革.

### Geometry

| field | value | source |
|---|---|---|
| **lonlat** | **[117.674, 32.909]**, centre of the OSM wall trace. The current placeholder `[117.66, 32.93]` is **2.7 km NW**, probably on the Huai or its north bank | OSM way 1023248424 "钟离古城遗址" (historic=citywalls) |
| size | Square, **~380 m N–S × 360 m E–W**. The OSM trace measures 0.36 × 0.37 km, perimeter 1.34 km (≈1.4–1.5 km published) | Fengyang local historian (Sina blog); Chuzhou Daily 2024 **(snippet)**; Baidu 钟离城遗址 **(snippet)** |
| walls | Rammed earth, base **18 m**, top 6 m, surviving 3–5 m high. **Corners stand 5 m**, higher than the curtain, so they were probably corner platforms or towers | **(snippet)** Baidu / Chuzhou Daily |
| gates | **4**, one in the middle of each side, each ~5 m wide | **(snippet)** chuzhou.cn / sohu |
| moat | "部分护城河依稀可辨": traces survive on parts of the circuit | **(snippet)** |
| rivers | "南接丘陵、北凭淮河、左依濠水、右拂花园湖支流". The Huai lies to the **N**: its modern centreline is ~1.35 km NW, and the bank polygon ~1.0 km N. The 濠河 joins the Huai ~2.8 km **W** at 临淮关. A creek of 花园湖 lies to the **E**. The town sits on the 王城岗 terrace | **(snippet)** sohu/Chuzhou; OSM waterways (淮河, 濠河) |
| inside | Most surface finds (tiles, 云纹 eaves) come from the **southern part**. A Neolithic-to-Qin-Han settlement of ~30 ha lies **south** of the walls | Sina blog; **(snippet)** |

Outline (km, x east, z south), a slightly regularised OSM trace:

```
[[-0.13,-0.2],[0.17,-0.16],[0.18,0.18],[-0.18,0.18]]
```

### State in autumn 219

- Zhongli was a Cao-held county (marquisate) on the Huai, in the belt Cao Cao emptied in 213.
  - *Sanguozhi* 吳主傳: "曹公恐江濱郡縣爲權所略，徵令內移。民轉相驚，自廬江、**九江**、蘄春、廣陵戶十餘萬皆東渡江。江西遂虛，合肥以南惟有皖城".
- It lay behind the Hefei front (Zhang Liao), downstream of Shouchun, on the Huai water route.
- No 219 event is recorded for Zhongli. Show it as a small, half-empty garrison town `[suy luận]`.
- It had no siege or sack after the 190s.

### Proposed `cities.json` entry (`huai`)

```json
"huai": {
  "name": "Chung Ly", "rank": "provincial", "state": "intact",
  "era": "Huyện (hầu quốc) Chung Ly của Tào; đất Giang–Hoài bỏ trống từ năm 213, đồn nhỏ canh sông Hoài",
  "lonlat": [117.674, 32.909],
  "outline": [[-0.13, -0.2], [0.17, -0.16], [0.18, 0.18], [-0.18, 0.18]],
  "gates": {"n": 1, "s": 1, "e": 1, "w": 1},
  "passages": 1, "que": "none",
  "moat": {"sides": "nesw", "width": 0.02},
  "houses": 0.35,
  "palaces": [
    {"name": "Huyện nha Chung Ly", "at": [0, -0.03], "size": [0.1, 0.08], "platform": 1}
  ],
  "features": [
    {"type": "watchtower", "at": [-0.15, -0.17]},
    {"type": "harbour", "side": "n"}
  ],
  "river": {"sides": "n"}
}
```

Notes on the entry:
- **`rank`:** kept at "provincial" because it is the `huai` seat in the game and a county town had gate towers. "fort" would drop the gate towers and make it read as a fort, which it was not.
- **`que: "none"`:** a county magistrate or marquis did not rate a 2,000-shi que pair.
- **The watchtower** stands for the raised NW corner facing the Huai.
- **`houses` 0.35 is a judgment** `[suy luận]`.
- **The yamen position is unknown** `[suy luận]`. Finds concentrate in the south half, so it could also go at `[0, 0.05]`.
- **Confidence:**
  - Location and size: **high**. The OSM trace and three independent local descriptions agree.
  - Han-period use: **medium-high** (the 钟离丞印 sealing and gazetteer continuity).
  - The 219 look: **medium** (inferred from the regional depopulation).

---

## 2. Giang Lăng (江陵, the Jingzhou old city, Hubei)

### What the sources say

- **Where the walls were.** The 1997–98 section cuts through the wall found rammed-earth walls of the **Three Kingdoms and Jin**, then Five Dynasties and Song brick. The excavators state: "自三国时代起，荆州古城墙就没有发生过大的变迁，城址几乎没有离开现城墙的范围。城墙从早期到晚期，由内向外推进的距离在50米之内" (王明钦, head of the Jingzhou Museum, quoted by whb.cn 2017; the same finding is on kepuchina.cn). The Ming–Qing circuit is therefore a good envelope for Guan Yu's city.
- **Old city plus Guan Yu's addition.**
  - *Yuanhe junxian tuzhi* (Tang), quoted by whb.cn: "**州城本有中隔，以北旧城也；以南，关羽所筑**". The city had a partition, with the old city north of it and Guan Yu's work south of it.
  - *Shuijing zhu* 卷34: "舊城，關羽所築。羽北圍曹仁，呂蒙襲而據之。羽曰：此城吾所築，不可攻也，乃引而退".
  - Li Bujia (1997) argues that Guan Yu **enlarged** an existing Han city and did not found it.
  - cdstm.cn (中国数字科技馆, 2018):
    - The Qin–Han city was "规模并不大，其位置大致在今古城偏西北处。该城东西宽、南北窄，临江而建".
    - Guan Yu "在汉代旧城以南，长江北岸的空地上，又建起一座新城以驻扎军队，其旧址在今荆州城东南隅". Local place names 九天琢 (NW) and 张飞一担土 (SE) are taken to mark the two cities.
    - Huan Wen (from 352) merged them, "可能在两城中保留城垣相隔".
    - The same article cites *Tongdian* 卷183 as "关羽筑城偏在西南". That contradicts "SE" and is unverified.
- **Later structure** (*Dushi fangyu jiyao* 卷78):
  - The city had an inner 金城 (citadel), attested for the Jin–Song.
  - It later had "three cities" and an east and a west city.
  - Under Liang (6th century) the outer city had 12 gates.
  - The Ming city had 6 gates on a circuit of 18 li, with a moat.
- **Han detail from the *Shuijing zhu*.** After Prince Liu Rong's axle broke at the **north gate** (148 BCE), "自後北門不開": one north gate was kept shut.
- **Guan Yu's residence.** Local tradition puts it inside the **old South Gate (南纪门)**, where the Ming 关帝庙 was founded in 1396 on the "关府遗址". This is tradition, not archaeology. Sources: jzgcly.com / zwgk.jingzhouqu.gov.cn **(snippet)**.
- **Watch posts.** *Sanguozhi* 呂蒙傳 records "羽所置江邊屯候，盡收縛之". Yu Fan's letter says the Wu attack came so fast that "烽火不及舉". A Qing gazetteer adds "烟墩，關羽守荊州時所立。今江隄上每數里猶有一墩如阜者" (*Gujin tushu jicheng*, 職方典 第1195卷). So there was a chain of beacon mounds along the river dyke.
- **Setting.**
  - *Shuijing zhu*: the Yangtze runs **south** of the city. The 江津 crossing and the 江津戍 on 枚迴洲 face 馬頭岸. A moat linked to the river (通隍) is attested for the Jin.
  - The modern Yangtze centreline is ~4.5 km S of the centre (OSM).
  - 郢城 (Chu, then the Han 郢县, **abolished in the Eastern Han**, so a ruin in 219) is 2.1–3.7 km NE: OSM way 266787751 spans x 2.1…3.7, z −3.7…−2.3.
  - 纪南城 (Chu Ying, a ruin) has its south gate 5.8 km N.
  - The modern moat is 30 m wide and 4 m deep (hbda.gov.cn).

### Geometry

- **lonlat [112.190, 30.354]:** the bbox centre of the Ming–Qing wall, OSM way 87316208.
  - This is the old city, not modern downtown (Shashi lies 7 km E).
  - The placeholder `[112.19, 30.35]` is only 0.4 km off.
- **Full circuit:** simplified from OSM (Douglas–Peucker, 60 m). It measures 3.9 × up to 2.1 km, with a perimeter of 10.4 km and an area of 4.8 km². The published figures are 3.75 × 1.2 km, 10.5–11.3 km and 4.5 km².
- **The partition is conjecture** `[suy luận]`. It is placed so that:
  - the old city lies N and NW;
  - Guan Yu's new city is the SE block, including the south-gate area where tradition puts his residence and the SE lobe of the present wall;
  - the whole matches the circuit that archaeology says has not moved since the Three Kingdoms.
- **Gates in 219 are unknown.** The counts below follow the Ming gate positions:
  - 拱极门 at [−0.81, −1.04]
  - 远安门 at [0.83, −0.57]
  - 安澜门 at [−1.91, −0.16]
  - 南纪门 at [0.21, 0.39]
  - 寅宾门 at [1.95, 0.40]
  - 公安门 at [1.91, 0.85]

### State in autumn 219

- It was **the Jingzhou base of Liu Bei's general Guan Yu** (前將軍, 董督荊州事), who was away besieging Cao Ren at Fancheng.
- **南郡太守 Mi Fang** held the city, and Shi Ren held Gong'an across the river.
- After the August flood, "羽以舟兵盡生虜禁等步騎三萬**送江陵**" (吳主傳). The city was crowded with prisoners, and Guan Yu seized Wu's grain at 湘關 to feed them.
- No siege or damage in 219. In the intercalary 10th month (≈ Nov–Dec 219) Lü Meng arrived disguised as merchants. Mi Fang **surrendered the city intact**, and Lü Meng "撫其老弱，釋於禁之囚".

### Proposed `cities.json` entry (`jing_nan`)

```json
"jing_nan": {
  "name": "Giang Lăng", "rank": "provincial", "state": "intact",
  "era": "Nam quận của Quan Vũ, thu 219: Vũ vây Phàn Thành, Mi Phương giữ thành, 3 vạn hàng binh Vu Cấm bị giải về đây; cựu thành Hán ở bắc, nam thành do Quan Vũ đắp thêm",
  "lonlat": [112.190, 30.354],
  "outline": [[-1.97, 0.08], [-1.76, -0.55], [-0.8, -1.05], [-0.33, -0.81], [0.5, -0.86], [0.8, -0.69], [0.93, -0.37], [1.97, -0.23], [1.92, 0.83], [1.83, 1.05], [0.94, 0.56], [-1.92, 0.43]],
  "gates": {"n": 2, "s": 1, "e": 2, "w": 1},
  "passages": 1, "que": "official",
  "sub": [
    {"type": "smallCity", "name": "Nam thành (Quan Vũ đắp)",
     "outline": [[-0.3, 0.1], [0.93, 0.1], [0.93, -0.37], [1.97, -0.23], [1.92, 0.83], [1.83, 1.05], [0.94, 0.56], [-0.3, 0.5]],
     "gates": {"n": 1, "s": 1, "e": 0, "w": 1}}
  ],
  "moat": {"sides": "nesw", "width": 0.03},
  "palaces": [
    {"name": "Phủ Quan Vũ", "at": [0.2, 0.3], "size": [0.25, 0.16], "platform": 1.5},
    {"name": "Phủ Nam quận (Mi Phương)", "at": [-0.8, -0.35], "size": [0.35, 0.3], "platform": 1.5}
  ],
  "features": [
    {"type": "granary", "at": [1.35, 0.25]},
    {"type": "harbour", "side": "s"},
    {"type": "watchtower", "at": [-1.3, 0.9]},
    {"type": "watchtower", "at": [1.3, 1.5]}
  ],
  "river": {"sides": "s"}
}
```

How the renderer lays this out:
- **Main ring:**
  - N gates on the NW diagonal wall (where 拱极门 is).
  - W gate on the west wall (安澜门).
  - S gate on the long south wall at about x −0.5 (old city).
  - Two E gates on the east wall (寅宾门 and 公安门).
- **Sub ring:**
  - N gate in the partition at about x 0.3.
  - W gate on the x 0.93 partition, which links the NE block.
  - S gate at about [0.32, 0.53], near 南纪门. Being the southern gate nearest the axis, it gets the **que**.
- **Double walls.** The sub ring redraws the shared SE outer walls on top of the main ring, exactly as Hứa Xương's inner city already does.

Notes and confidence:
- **Envelope and centre: high.** The excavators give the 50 m statement, and the OSM trace is used.
- **Old north / new south: medium.** Two textual sources support it.
- **Exact partition line: low** `[suy luận]`.
- **Gates: low.**
- **Palace positions: low.**
  - Guan Yu's residence follows the 关帝庙 tradition.
  - The commandery office position is invented.
- **The granary is a stand-in** for his supply base `[suy luận]`.
- **Beacon towers:** the two watchtowers stand for the river-dyke beacon chain. They are placed just outside the south wall because the real dyke is ~4 km away, too far at city scale.
- **Optional extras** (renderer support needed):
  - The **郢城 ruin** (1.6 × 1.4 km, NE).
  - A **prisoner stockade** for Yu Jin's 30,000.
  - The 纪南城 ruin belongs on the terrain (5.8 km N), not in the city plan.
- **Moat width:** 0.03 is the Ming figure; the 219 width is unknown.

---

## 3. Lạc Dương in 219 (`si_li`)

### What was rebuilt, and when (primary texts)

| date | fact | source |
|---|---|---|
| 190 | Dong Zhuo "悉燒宮廟官府居家，二百里內無復孑遺" | 後漢書 卷72 |
| 196, spring–summer | Zhang Yang had Dong Cheng "先繕修洛宮". In the 7th month the emperor arrived and lodged in **the former eunuch Zhao Zhong's house**. In the 8th month (辛丑) he moved to "**南宮楊安殿**", named after Zhang Yang | 後漢書 卷9, 卷72 |
| 196 | 獻帝起居注: "舊時宮殿悉壞，倉卒之際，拾摭故瓦材木，工匠無法度之制，所作並無足觀也". It was one **crude hall** patched from salvaged tiles and timber. "是時，宮室燒盡，百官披荊棘，依牆壁閒" | 後漢書 卷72 注, 卷9 |
| 196, 9th month | Cao Cao moved the court to Xu. Luoyang stopped being the seat of government | 後漢書 卷9 |
| c. 200–210 | Zhong Yao, 司隸校尉: "自天子西遷，洛陽人民單盡，繇徙關中民，又招納亡叛以充之，數年間民戶稍實" | 三國志 卷13 |
| c. 200 | Wei Ji's reform made the 司隸校尉 sit at **弘農**, not Luoyang | 三國志 卷21 |
| 219, 10th month | "軍還洛陽". 曹瞞傳: "王更脩治**北部尉廨**，令過於舊". Cao Cao rebuilt the office of his first post, the Luoyang north-district captaincy, grander than before | 三國志 卷1 |
| winter 219–220 | 世語: "太祖自漢中至洛陽，**起建始殿**，伐濯龍祠而樹血出". The trees of the Zhuolong garden shrine were felled for timber. Cao Cao died in Luoyang on 庚子 of the 1st month of 220 | 三國志 卷1 注 |
| 220, 12th month | Cao Pi "初營洛陽宮". Pei Songzhi: "是時帝**居北宮**，以建始殿朝羣臣，門曰承明". So the Jianshi Hall stood in the **North Palace** | 三國志 卷2 注 |
| 221 | "京師宗廟未成", so the emperor sacrificed to Cao Cao in the Jianshi Hall. In the 1st month of 221 the 明堂 was used for sacrifice | 三國志 卷2 |
| 222–226 | 靈芝池 (222), **太學 re-founded (224)**, 九華臺 (226). Mingdi (227–239) built 太極殿 and 昭陽殿 "於漢南宮崇德殿處" (Pei), and later 金墉城 and 凌雲臺 | 三國志 卷2 |

### What the city should look like in autumn 219

- **Walls:** the rammed earth survived the fire and still stands, all 12 gate openings intact. The timber gate towers burnt in 190. After 23 years of Cao rule, with a garrison and the Henan governor's seat, most gates were probably patched `[suy luận]`. With `state` no longer `ruined`, the renderer draws intact towers, which is acceptable.
- **South Palace:** burnt ruin, plus the single crude **楊安殿** of 196, 23 years old and unused since the court left.
- **North Palace:** burnt ruin. The **建始殿 was not started until the 10th month of 219 at the earliest**, so at an autumn-219 turn 0 it is a cleared site with timber stacked, and by 220 a finished hall. The Zhuolong garden (濯龍) still has large old trees.
- **Houses:** Luoyang was repopulated from about 200. In 219 it was a governor's town and Cao Cao's winter headquarters, and in 220 it became the Wei capital. **About 30% of the wards in use** is a reasonable guess `[suy luận]`, clustered round the market, the governor's office and the gates. The rest is orchards and fields, following "披荊棘".
- **Market:** the 金市 was probably working, on a small scale `[suy luận]`.
- **Ritual zone:**
  - The earthen platforms (灵台, 明堂, 辟雍) are still standing.
  - Their halls are burnt. The 明堂 was usable again by early 221.
  - The 太學 lay empty until 224.
- **Covered way (复道):** it was timber on posts and burnt in 190, so remove it.

### Proposed edits (`si_li`)

```
state "ruined" -> "intact"
+ "houses": 0.3
+ "era": "Năm 219: hồi sinh một phần; tường, cổng đã vá; Tào Tháo về đóng từ tháng 10, khởi công điện Kiến Thủy trong Bắc cung"
palaces[0] Nam cung: keep "ruined": true
palaces[1] Bắc cung: keep "ruined": true
+ palaces: {"name": "Phủ Hà Nam doãn", "at": [0.75, -0.3], "size": [0.3, 0.25], "platform": 1.5}      [suy luận: position]
features:
  - remove {"type": "coveredWay", ...}                       (the timber gallery burnt in 190)
  + {"type": "platform", "name": "Dương An điện (196)", "at": [0.15, 0.75], "size": [0.12, 0.1], "height": 1}
  + {"type": "platform", "name": "Kiến Thủy điện (khởi công đông 219)", "at": [-0.15, -0.75], "size": [0.2, 0.12], "height": 1.5}
  garden [-0.85,-1.1]: add "name": "Trạc Long viên"           (big trees; felled winter 219)
  granary [1.0,-1.6]: keep (army granary; Cao's army wintered here)
  market "Kim thị": keep (it is a hub for the new houses logic)
  "Vĩnh An cung" garden: keep
  Minh Đường, Tích Ung, Thái Học: add "ruined": true once the renderer supports ruined platforms; until then lower "height" to 0.6–0.8
  Linh Đài: keep as is
optional + {"type": "watchtower", "name": "Bắc bộ úy giải", "at": [0.3, -1.7]}   (Cao rebuilt it winter 219; position [suy luận])
outline, gates, passages, que: unchanged
```

**Confidence:**
- The dated facts: **high** (primary texts).
- Palace and yamen positions inside the precincts: **low** (the texts name the precinct, not the spot).
- `houses` 0.3: a judgment.

---

## 4. Trường An in 219 (`liang`; the 219 scenario renames it `guan`)

### What happened, and what was in use

| date | fact | source |
|---|---|---|
| 23–25 CE | Weiyang was burnt by the Red Eyebrows. By 190 "宮室營寺焚滅無餘，是時唯有高廟、**京兆府舍**". The emperor lodged in the **Jingzhao governor's office**, then moved into a patched **未央宮** ("後移未央宮"; "幸未央宮") | 後漢書 卷72, 卷9 |
| 192 | Li Jue besieged the city: "城峻不可攻，守之八日", taken only through treachery. Wang Yun held the **宣平門 gate tower**, and a bridge crossed the moat there | 後漢書 卷72 |
| 195 | Li Jue took the emperor and "放火燒宮殿官府居人悉盡". Then "長安城空四十餘日，強者四散，羸者相食，**二三年閒，關中無復人跡**" | 後漢書 卷72 |
| c. 196–200 | Zhong Yao at Chang'an (持節督關中諸軍). Wei Ji: "關中膏腴之地…人民流入荊州者十萬餘家，聞本土安寧，皆企望思歸". The salt monopoly bought ploughing oxen for returnees; the 司隸 moved to 弘農 | 三國志 卷13, 卷21 |
| 211–213 | Cao Cao crushed Ma Chao and Han Sui. **張既 as 京兆尹**: "招懷流民，興復縣邑". Xiahou Yuan was left garrisoning Chang'an (212) | 三國志 卷15, 卷1 |
| 215 | After Zhang Lu surrendered, Zhang Ji "說太祖拔漢中民數萬戶以**實長安及三輔**" | 三國志 卷15 |
| 218, 9th month – 219, 3rd month | Cao Cao at **Chang'an** (西征劉備) | 三國志 卷1 |
| 219, 5th–10th month | "夏五月，引軍還長安" … "冬十月，軍還洛陽". **Throughout autumn 219 Cao Cao and the Hanzhong army were at Chang'an.** Zhang Ji moved "氐五萬餘落" out of Wudu into 扶風 and 天水 | 三國志 卷1, 卷15 |
| archaeology | "我們在**未央宮**中的發掘均**未見漢代以後的地層**". Changle's Western Han halls are cut by Northern-Dynasty kilns. The city gates burnt at the end of Wang Mang, and "至东汉、魏晋、十六国北朝时期，多数只启用一个或二个门道". **宣平門** (the northernmost E gate) was rebuilt at least three times and used until the Sui. From the Former Zhao (4th century) the palace city moved to a **new small city in the NE**, on the old ward area | Xu Longguo 2022 (news.qq.com); Zhang Jianfeng **(snippet)** |

### What the city should look like in autumn 219

- **Weiyang and Changle:** burnt ruins (195), with no reoccupation layer. The Weiyang front-hall terrace still towers at up to 15 m, bare.
- **Arsenal (武庫):** ruin.
- **Que:** the que at Weiyang's E and N gates are burnt stumps. Remove them from the 219 look.
- **Walls:** the walls stand, and the city resisted assault in 192. Gates were used with **1–2 passages**, the others blocked; 宣平門 was kept in good repair.
- **Where people lived:** in the **north and north-east** wards, near 宣平門, the 橫門 avenue and the NW markets. This is inferred from where later occupation concentrates and from 宣平門's repairs `[suy luận]`.
  - Put the Jingzhao commandery office, which doubled as Cao Cao's 219 field headquarters, near 宣平門.
  - The actual Han 京兆府舍 site is unknown.
- **Houses:** repopulation is well documented (returnees c. 200, Zhang Ji after 211, Hanzhong transfers in 215), but so is how empty the city had been. **About 20% of the wards in use** `[suy luận]`, on the NE and N side. Camps of the returning Hanzhong army would stand outside the walls.

### Proposed edits (`liang` → `guan`)

```
state "ruined" -> "intact"
+ "houses": 0.2
+ "era": "Năm 219: hành dinh của Tào Tháo (9/218 – 10/219) sau trận Hán Trung; cung Hán vẫn là phế tích từ năm 195, dân ở phía bắc và đông bắc"
palaces[0] Vị Ương: keep "ruined": true (the front-hall terrace stays; no post-Han reoccupation)
palaces[1] Trường Lạc: keep "ruined": true
+ palaces: {"name": "Phủ Kinh Triệu (hành dinh Tào Tháo)", "at": [2.4, -2.1], "size": [0.4, 0.35], "platform": 1.5}   [suy luận: near 宣平門]
features:
  granary "Vũ khố" [-0.1,1.45]: remove (the arsenal is a ruin), or replace with
      {"type": "granary", "name": "Kho quân lương", "at": [1.9, -2.5]}      (supply base for the Hanzhong army) [suy luận]
  market "Đông thị · Tây thị": keep (a hub for houses; the markets were in the NW)
queAt: remove, and set "que": "none" for 219 (the que stood at Weiyang's burnt gates)
passages: 3 may stay. Optionally 2, since most gates were used with 1–2 passages after 25 CE
outline, gates, moat: unchanged
world/scenario: the id changes liang -> guan (docs/product/scenario.md)
```

**Confidence:**
- Palaces ruined, walls standing, Cao Cao's HQ in autumn 219: **high**.
- Where people lived and the yamen spot: **low–medium**.
- `houses` 0.2: a judgment.

---

## Sources

**Chung Ly**
- OSM way 1023248424 (钟离古城遗址): https://www.openstreetmap.org/way/1023248424. Rivers 淮河 and 濠河 via the Overpass API.
- Fengyang local historian, 临淮关镇名胜古迹: https://blog.sina.com.cn/s/blog_a29346a80101avv1.html
- 滁州日报 2024-05-23, 钟离城遗址: http://szbk.chuzhou.cn/czrb/pc/content/202405/23/content_113506.html **(snippet)**
- sohu 千古兴亡说凤阳：钟离城的历史: https://www.sohu.com/a/190720247_366840 **(snippet)**
- Baidu 钟离城遗址: https://baike.baidu.com/item/钟离城遗址/10054498 **(snippet)**
- zh.wikipedia 凤阳县各级文物保护单位列表 (钟离城遗址 1-84, 临淮镇), 鍾離國
- 欽定古今圖書集成/方輿彙編/職方典/第0827卷 (zh.wikisource)
- 三國志/卷47 吳主傳 (zh.wikisource)

**Giang Lăng**
- 水經注/34 (zh.wikisource)
- 讀史方輿紀要/卷七十八 (zh.wikisource)
- 三國志/卷36, 卷47, 卷54 (zh.wikisource)
- 欽定古今圖書集成/方輿彙編/職方典/第1195卷 (烟墩) and 第1189卷
- 文汇报 2017, 荆州古城墙："完璧"申遗进行时: https://www.whb.cn/zhuzhan/jiaodian/20170705/96707.html
- 中国数字科技馆 2018, 荆州古城丨南国有完璧: https://www.cdstm.cn/gallery/media/mkjx/sjyc/art/2018/art_26eab28dad0c4034a36f86d568281fce.html
- 科普中国 荆州古城: https://www.kepuchina.cn/wiki/ct/201903/t20190323_1029572.shtml
- 湖北档案 荆州古城: https://www.hbda.gov.cn/info/537.jspx
- 李步嘉 1997, 关羽始筑江陵城说辩误 (abstract): https://journal.ccnu.edu.cn/sk/CN/abstract/abstract2612.shtml
- zh.wikipedia 荆州城墙
- OSM way 87316208 (荆州古城 wall); gate nodes 12005890380–85; way 266787751 (郢城遗址); node 12032999948 (纪南城南门遗址)
- 关帝庙 at the old South Gate: http://jzgcly.com/tourismWeb/page/mobile/moblie_gdm.html and http://zwgk.jingzhouqu.gov.cn/26968/112220233/t106220233124/439937.shtml **(snippet)**

**Lạc Dương**
- 後漢書/卷9 (獻帝紀) and 卷72 (董卓傳) (zh.wikisource)
- 三國志/卷01 (武帝紀 and Pei notes: 曹瞞傳, 世語), 卷02 (文帝紀 and Pei note on 建始殿 / 北宮), 卷13 (鍾繇傳), 卷21 (衞覬傳) (zh.wikisource)

**Trường An**
- 後漢書/卷9, 卷72 (zh.wikisource)
- 三國志/卷01, 卷13, 卷15 (張既傳), 卷21 (zh.wikisource)
- 徐龙国 2022, 汉长安城考古的收获、进展与思考: https://news.qq.com/rain/a/20220908A047V300
- 张建锋, 西汉至北朝时期长安城城郭布局的变化: http://hrczh.cass.cn/sxqy/kgx/202502/W020250228398527721202.pdf **(blocked; snippet)**
