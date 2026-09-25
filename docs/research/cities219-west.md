# Four western cities in autumn 219 (Jian'an 24): Ký Thành, Cô Tang, Nam Trịnh, Điền Trì

Date: 2026-09-25. Research only: no file in the repo was changed. The format follows `docs/research/cities.md`, and the JSON follows `data/cities.json`: km from the city centre, **x east, z south**.

## How this was checked, and its limits

- **Read in full:**
  - zh.wikipedia raw wikitext: 冀县, 姑臧, 南郑区, 滇池县, 河泊所遗址, 武威锁阳城城址.
  - zh.wikisource: *Shuijing zhu* 卷17 (渭水) and 卷27 (沔水); *Sanguozhi* 卷15 (张既传), 卷23 (杜袭传), 卷32 (先主传), 卷44 (姜维传).
  - The National Cultural Heritage Administration (NCHA) text on Hebosuo for the 2024 Top-Ten, reposted at whyc.lzu.edu.cn, including its plan figures.
  - news.cn 2025-05-01.
  - gansu.gansudaily.com.cn 2024-04-09.
  - m.sohu.com: 孙启祥 on Nanzheng; 武威故城之谜.
  - m.thepaper.cn: 贾小军《五凉都会姑臧城略论》; 武威故事.
- **Blocked or reset:** www.sohu.com (only m.sohu.com works), htq.gov.cn, zx.hanzhong.gov.cn, baike.baidu.com, 360doc, lifeweek.com.cn, gscn.com.cn (bad certificate), chinanews (reset). Facts taken only from a search-engine summary are marked **(snippet)**.
- **Coordinates:**
  - OSM Nominatim, and Overpass through overpass.private.coffee. The main Overpass server kept timing out.
  - Offsets use an equirectangular approximation, km per degree: lat 110.6–111.0; lon 101.1 (24.7°N), 93.3 (33.1°N), 91.6 (34.7°N), 87.8 (37.9°N).
- **Renderer facts** (from `cities.md`):
  - `river`, `avenueEW` and `frontHall` are documentation only. Water comes from the terrain bake.
  - A `que` pair is placed only at the southern gate nearest the axis.

---

## 1. Thiên Thủy → **Ký Thành (冀城)**, not Thượng Khuê

### Which city was the seat in 219

| question | answer | source |
|---|---|---|
| Commandery seat | **冀 (Ji).** In 74 CE Tianshui was renamed **汉阳郡** with its seat at Ji. The name "天水" came back under Wei. In 228 the Wei 天水太守 still sat at Ji: he fled from Ji to 上邽 when Zhuge Liang came | gansudaily 2024-04-09 ; *SGZ* 44 姜维传 ("太守…夜亡保上邽…維等相率還冀") |
| Provincial seat | Liang province moved its seat 陇 → **冀 in 168** (灵帝建宁元年). **In 213 Cao Cao abolished Liangzhou** and merged it into Yongzhou: "是時不置涼州，自三輔拒西域，皆屬雍州". It was re-created only in 220. So in 219 Ji is a **commandery seat inside Yongzhou**, the former provincial capital | gansudaily ; *SGZ* 15 张既传 |
| 上邽 (Shanggui) | A county of Hanyang. It had been the *Western Han* Tianshui seat ("舊天水郡治"). The *Shuijing zhu* says "**五城相接**, 北城中有湖水", with plank-roofed houses (西戎板屋). The 藉水 runs along its S and the 濛水 along its W. Present Tianshui, 秦州 old town ≈ **105.72, 34.58**. It only becomes the Tianshui seat under Jin, so use it as an alternative, not the 219 seat | 水經注 卷17 ; OSM |
| Jiang Wei | "天水冀人". Born 202, so he was 17 in 219. He grew up "少孤，與母居": his father 姜冏, the commandery 功曹, died shielding the governor in a Qiang/Rong rising | *SGZ* 44 |

### Site

| field | value | source |
|---|---|---|
| lonlat | **[105.333, 34.742]**, the Gangu old town (大像山镇, 冀城南/中路). **Uncertain, ±3 km.** No Han wall has been found. zh.wikipedia puts the Han seat "在今甘谷县城关镇附近". Local writers put it E, S or W of the town, one theory at 大沙沟 W of town. The Qin-era Ji seat of 688 BCE is **毛家坪** (105.096, 34.756), 22 km W. That site is 60 ha, with no wall found, and it is not the Han city | zh.wikipedia 冀县 ; people.com.cn 2014 (via wiki) ; search summary of thepaper/xzqh **(snippet)** ; OSM |
| river | **Wei on the N**: "渭水…東過冀縣北". Today the Wei bridges are at 34.759, ~1.9 km N of the old town. Several streams from the S mountains (**冀水**, 濁谷水, 當里溪水 …) "北逕冀城東，而北流注于渭", so they pass **E** of the city. A stream from 朱圉山 "北逕冀縣城北". 朱圉山 lies S of the county | 水經注 卷17 ; OSM |
| walls, size, gates | **No data.** Held out through an 8-month siege (正月–八月 213). During it 别驾 閻溫 (伯儉) "潛出水中" (slipped out through the water: a moat or the stream) to seek help. The city was 隗囂's 西伯 seat (23–33 CE) | 水經注 卷17 ; gansudaily |
| outline | **Guess:** 1.3 × 1.0 km rectangle (provincial-capital scale, like Xiangyang or Pengcheng) | — |

**State, autumn 219.** Held by Cao Cao: Hanyang commandery in Yongzhou. Six years earlier, Ma Chao besieged it from the 1st to the 8th month of 213. 韋康 surrendered and was killed. In 214 杨阜's coup inside the walls killed Ma Chao's family, and Xiahou Yuan retook the region. In 219 Cao Cao moved about 50,000 Di households from Wudu to the Fufeng/Tianshui border (张既传).

```json
"tianshui": {
  "name": "Ký Thành", "rank": "provincial", "state": "intact",
  "era": "Quận trị Hán Dương (Thiên Thủy) của Tào Tháo; châu trị Lương Châu 168–213; bị Mã Siêu vây tám tháng năm 213; quê Khương Duy",
  "outline": [[-0.65, -0.5], [0.65, -0.5], [0.65, 0.5], [-0.65, 0.5]],
  "gates": {"n": 1, "s": 1, "e": 1, "w": 1},
  "passages": 1, "que": "official",
  "moat": {"sides": "nesw", "width": 0.03},
  "palaces": [
    {"name": "Quận phủ Hán Dương", "at": [0, -0.15], "size": [0.4, 0.3], "platform": 1.5}
  ],
  "features": [],
  "river": {"sides": "ne"}
}
```

**Confidence:** Ji as the 219 seat is **high**. Location **medium-low** (±3 km). Geometry is a **guess**, and the moat is optional (inferred from 閻溫's escape "through the water").

---

## 2. **Cô Tang (姑臧)**, Wuwei commandery seat

| field | value | source |
|---|---|---|
| two sites | The Xiongnu **盖臧城 / Western Han Guzang** is identified with the **武威锁阳城城址**, 200 m S of 赵家磨村, 金羊乡. That site is rectangular, 1,000 m E–W, and its N–S length is cut by a sandy river. "**西汉末、东汉初时，姑臧县治迁往今武威城区**". So **in 219 Guzang lies under present Wuwei** | zh.wikipedia 武威锁阳城城址, 姑臧 (Gansu Cultural Relics Bureau) |
| lonlat | **[102.637, 37.927]**: the Wuwei old town. The Ming S gate tower is at 37.923, 102.635 and the 东/西大街 crossing is ≈102.637, 37.928. I nudged the centre ~0.1 km S so that the Leitai tomb (37.9415) stays outside a 2.9 km N–S city. **±1.5 km.** 大清一统志: "姑臧故城，今武威县治". 明一统志: "在凉州卫城东北二里". Li Xian (Tang): NW of Tang Guzang. Sources conflict, and the "present town" view is the most accepted | m.sohu.com/a/271719732_739037 ; OSM |
| size and shape | 王隐《晋书》 (quoted in *Jin shu* 86 and 通鉴 胡注): "**凉州城有龙形，故曰卧龙城，南北七里，东西三里，本匈奴所筑**". In Han–Jin li (~415–435 m) that is **≈ 2.9–3.0 km N–S × 1.25–1.3 km E–W** (perimeter ~20 li). 喻归《西河记》: "**城不方，有头尾两翅，名盖鸟城**" (irregular, with a "head", a "tail" and two "wings") | m.thepaper.cn/newsDetail_forward_4430048 (贾小军) |
| Ming city (proxy only) | Taken from the suburb names in OSM: S gate tower 37.923; 北关中路 begins ≈37.933; 东关 ≈102.649; 西关 ≈102.620. The Ming walls therefore enclosed about **102.627–102.646 E × 37.923–37.932 N (≈1.7 × 1.0 km)**. A Han city 2.9 km long N–S centred at 37.927 would run past it by ~0.8 km N and ~1.0 km S. **No archaeological check exists** | OSM Overpass |
| later growth (not in 219) | Former Liang: 张轨 "大城姑臧" (after 301). 张茂 built the 灵钧台. 张骏 added **four side cities "箱各千步"** (E 讲武场/东苑, W 西苑, N 玄武圃 …), giving "五城", **22 gates**, 谦光殿, 四时宫, and later "小城有七". None of this is 219 | 贾小军 ; thepaper 10269614 |
| economy | Guangwu era, 孔奋 as 姑臧长: "姑臧称为富邑，通货羌胡，**市日四合**" (the market met four times a day) | 贾小军 (后汉书 孔奋传) |
| water | Oasis on the 石羊河 system: a Shiyang branch runs S–N just W and SW of town, and the 杂木河 runs ~6 km E. A Former Liang anecdote: "头前有山，东西两边有河…北边都是石头滩" (mountains S, rivers E and W, stony flats N) | OSM Nominatim ; thepaper 10269614 |
| 雷台 | 106 × 60 × 8.5 m rammed platform, ~1.6 km N of the centre, traditionally 张茂's 灵钧台. The tomb under it is dated "东汉晚期 186–219" by the excavators, but a CASS 2019 paper argues it is a **Former Liang royal tomb**. **Not included**: the platform is post-219 and the tomb's date is disputed | **(snippet)** zh.wikipedia 雷台汉墓 ; cass.cn 2019-10-29 |

**State, autumn 219.** Nominally Cao Cao's (Liangzhou did not exist; the area was part of Yongzhou). In fact the Wuwei magnate **顏雋 (Nhan Tuấn)** had "舉郡反，自號將軍". He fought his neighbours 和鸞 (Zhangye), 黃華 (Jiuquan) and 麴演 (Xiping). Yan Jun sent his mother and son to Cao Cao as hostages, and Cao chose to "let the tigers fight". About a year later 和鸞 killed Yan Jun, and 王祕 of Wuwei killed 和鸞. Liangzhou was re-created in 220 with its seat here (*SGZ* 15).

```json
"wuwei": {
  "name": "Cô Tang", "rank": "provincial", "state": "intact",
  "era": "Quận trị Vũ Uy; hào tộc Nhan Tuấn chiếm quận, tự xưng tướng quân, gửi con tin cho Tào Tháo; thành Ngọa Long, chưa có bốn thành Tiền Lương",
  "outline": [[-0.3, -1.45], [0.3, -1.45], [0.55, -1.1], [0.6, -0.45], [0.72, -0.1], [0.62, 0.35], [0.58, 0.95], [0.35, 1.45], [-0.35, 1.45], [-0.58, 0.95], [-0.62, 0.35], [-0.72, -0.1], [-0.6, -0.45], [-0.55, -1.1]],
  "gates": {"n": 1, "s": 1, "e": 2, "w": 2},
  "passages": 1, "que": "official",
  "palaces": [
    {"name": "Quận phủ Vũ Uy", "at": [0, -0.2], "size": [0.4, 0.3], "platform": 1.5}
  ],
  "features": [
    {"type": "market", "name": "Cô Tang thị", "at": [0.1, 0.45]}
  ],
  "river": {"sides": "ew"}
}
```

**Confidence:**
- Location: **medium** (under the old town, ±1.5 km).
- Size (7 × 3 li): **medium, textual**, with no archaeology.
- Shape (tapering "head/tail" and slight mid "wings"): a **guess** from 卧龙/盖鸟城.
- Gates and palace: **guesses**.

---

## 3. **Nam Trịnh (南郑)**, Hanzhong commandery seat

| field | value | source |
|---|---|---|
| continuity | Walled in 451 BCE (左庶长城南郑). The Hanzhong seat from 30 CE. 孙启祥 argues **"古今汉中城位置变化不大"**: the Han city overlaps the later Hanzhong city, **with its centre of gravity to the E**. 舆地纪胜: "**古汉中郡城，在南郑县东二里**". In the 1950s a folded earth ridge (~4 m high, 6 m wide, ~100 m long) at **新桥, E of the city, S of the 汉白 road** was taken as the old Nanzheng wall. Han well-rings, drains and wells have been dug up inside the city area | m.sohu.com/a/497170438_214535 |
| Han size | 水經注 27: "**大城周四十二里，城內有小城，南憑津流，北結環雉，金墉漆井，皆漢所脩築**". So there was an inner **小城** whose S side rests on the river. The "大城" of 42 li (~17 km) is Chang'an-sized and unverified. In 335–347 司马勋 cut off the E third of the small city for the Jin seat | 水經注 卷27 |
| lonlat | **[107.034, 33.072]**: about 1.1 km ("2 li") E of the Ming city centre (东/西大街 crossing ≈107.022, 33.0725), at the line of the old E moat (北/南团结街, lon 107.032–107.034). **±1 km** | OSM Nominatim ; 舆地纪胜 via sohu |
| Ming city (proxy only) | 洪武三年 (1370): "周九里" ≈ **4.65 km**, 10 m high, 4 gates (朝阳 E, 望江 S, 振武 W, 拱辰 N). Moat 33 m wide (1510/1602). The yamen stood in the SE "因循汉唐以来旧址 (今汉台区委和古汉台一带)" | sohu 孙启祥 ; **(snippet)** baike/htq 汉中古城墙 |
| 古汉台 | Liu Bang's palace platform, later the commandery yamen site. **156 m N–S × 72 m E–W, 7 m high, 3 tiers.** At 33.0713, 107.0290 → **[-0.47, 0.08]** | OSM ; **(snippet)** meet99 / chengshizhijian |
| 饮马池 | Han-era pond, 33.0700, 107.0318 → **[-0.2, 0.22]** | OSM |
| 拜将坛 | Legendary site of Liu Bang making Han Xin general: two platforms (N and S), >3 m, 7,840 m² in all. **Outside the S moat** of the later city. At 33.0663, 107.0268 → **[-0.67, 0.63]** | OSM ; **(snippet)** |
| Han River | Today ~2.2 km S of 古汉台 (the 天汉大道 bridge at 33.05). Tang: "汉水，经县南，去县一百步" (~150 m). In the Han, "南憑津流" put the river **along the S wall**, and it has since moved S. **The terrain bake uses today's course, so the river will look ~2 km too far away.** 公孙述 built 10-storey "赤楼帛船" here c. 28 CE, which points to a river port. S of the river stood 漢陰城 ("呂后所居") | 水經注 27 ; 元和郡县志 via sohu |
| storehouses | Zhang Lu, fleeing in 215, "封藏府库" (sealed the treasuries); Cao Cao praised him for it | *SGZ* 8 张鲁传 (not re-fetched) |

**State, autumn 219.** Cao Cao gave up Hanzhong in the 5th month. Before leaving, 杜袭 "綏懷開導，百姓自樂出徙洛、鄴者，**八萬餘口**", so the city was left half-empty. Liu Bei occupied it. In the 7th month he was acclaimed **King of Hanzhong at 沔陽** ("於沔陽設壇場"), ~40 km W, not at Nanzheng. He then returned to Chengdu and "拔魏延為都督，鎮漢中". No siege of Nanzheng itself is recorded.

```json
"hanzhong": {
  "name": "Nam Trịnh", "rank": "provincial", "state": "intact",
  "era": "Quận trị Hán Trung; Lưu Bị chiếm từ tháng 5/219, xưng Hán Trung vương ở Miện Dương, Ngụy Diên trấn giữ; Tào Tháo đã dời hơn tám vạn dân đi",
  "outline": [[-0.85, -0.53], [0.85, -0.53], [0.85, 0.53], [-0.85, 0.53]],
  "gates": {"n": 1, "s": 1, "e": 1, "w": 1},
  "passages": 1, "que": "official",
  "palaces": [
    {"name": "Quận phủ (Hán Đài)", "at": [-0.47, 0.08], "size": [0.08, 0.16], "platform": 2}
  ],
  "features": [
    {"type": "platform", "name": "Bái Tướng Đàn", "at": [-0.67, 0.63], "size": [0.06, 0.13], "height": 1},
    {"type": "garden", "name": "Ẩm Mã Trì", "at": [-0.2, 0.22], "size": [0.07, 0.05]},
    {"type": "granary", "at": [0.45, -0.3]},
    {"type": "harbour", "side": "s"}
  ],
  "river": {"sides": "s"}
}
```

**Confidence:**
- Location: **medium** (±1 km; the "E of the later city" bias is textual).
- Outline: a **guess**. It models only the Han-built **小城**, at 1.7 × 1.06 km (5.5 km ≈ 13 Han li). The 42-li 大城 is left out: if it existed it would be ~5 × 3.7 km, and it is unverified.
- Platforms: positions **high** (OSM), dimensions **medium** (snippets).
- The granary position is a guess.

---

## 4. **Điền Trì (滇池)**, Yizhou commandery seat (Hebosuo 河泊所遗址)

| field | value | source |
|---|---|---|
| identification | Hebosuo is "一址双城". The **W part** holds the Dian kingdom's capital (settlement, ritual and craft zones; 滇国相印 seal). The **E part, centred on 上蒜第一小学**, has a 12 m road, large official buildings, **Han and Wei–Jin walls and moats**, sealings (益州太守章, 益州刺史, 滇池长印 …) and a 2024 tile-end reading "**益州**". This makes it **the Yizhou commandery seat and Dianchi county town** | NCHA via whyc.lzu.edu.cn (id=367) ; news.cn 2025-05-01 ; zh.wikipedia 河泊所遗址, 滇池县 |
| layout (archaeology) | By coring: "城址核心堆积区，**平面分布呈方形，面积约18万平方米**，堆积区外围发现**周长约1800米的环壕**" (square core ~18 ha, ring moat ~1.8 km round; one summary: moat **~500 m E–W × 400 m N–S**). In the **SW of the core**: superposed **Han and Wei–Jin walls and moats**, with the moat outside the S wall, and a large timber structure under the Han wall. A **main E–W road**; a **building zone N of the road** on yellow-earth platforms (post pits, stone bases, wells; **120 t of tiles**); a **river channel** crossing the NE of the dig; and a N–S side road | NCHA figs. 4 and 8 ; search summary of yndaily **(snippet)** |
| lonlat | **[102.698, 24.711]**. Traced from NCHA fig. 4: the core rectangle's centre lies ~0.2 km N and 0.04 km E of the school (OSM way 上蒜一小, 24.7097, 102.6973). The excavation polygon (OSM "河泊所遗址上蒜一小地点") is 24.7107, 102.6975. Scale was set by the school's 0.18 km width and checked against the 18 ha area. **±0.1 km** | OSM ; NCHA fig. 4 |
| outline | Core traced **0.49 × 0.37 km**, inside a moat ring of ~0.5 × 0.4 km. The map is drawn roughly north-up (its N arrow leans slightly E) | NCHA fig. 4 |
| lake | Dian lake: modern shore **1.45 km W** at the same latitude (OSM). The site "西临滇池", on the fertile SE lake plain cut by channels into terraces. Hills E (梁王, 左卫, 金砂, 龙潭) | NCHA |
| 石寨山 | Dian royal cemetery (the 滇王之印 find), a low ridge ~0.18 × 0.33 km (OSM), ~0.75 km NNW → **[-0.32, -0.74]** | OSM (24.7177, 102.6949) |
| other | *Hou Hanshu* geography via zh.wikipedia: Dianchi "产铁", with 黑水祠 N of the county | zh.wikipedia 滇池县 |
| alternative | **味县** (Qujing, 三岔 area of the development zone). It became the seat of 庲降都督 and 建宁郡 only **after 225**. No wall has been found and the site is unlocated, so it does not suit 219 | 163.com (snippet, 曲靖古城) |

**State, autumn 219.** Yizhou commandery has nominally been Liu Bei's since 214. Local great families, above all **雍闿 (Ung Khải)**, dominated it. Governor 正昂 was killed by them around 221–223. The Nanzhong command (庲降都督 邓方) sat at 南昌/朱提, not here. In 225 Zhuge Liang renamed the commandery 建宁 and moved its seat to 味县.

```json
"dianchi": {
  "name": "Điền Trì", "rank": "provincial", "state": "intact",
  "era": "Quận trị Ích Châu (Nam Trung), danh nghĩa thuộc Lưu Bị từ 214, hào tộc Ung Khải lộng quyền; cạnh đô ấp cũ của Điền quốc; từ 225 quận trị dời về Vị huyện",
  "outline": [[-0.245, -0.185], [0.245, -0.185], [0.245, 0.185], [-0.245, 0.185]],
  "gates": {"n": 1, "s": 1, "e": 1, "w": 1},
  "passages": 1, "que": "official",
  "moat": {"sides": "nesw", "width": 0.025},
  "palaces": [
    {"name": "Phủ thái thú Ích Châu", "at": [-0.08, 0.0], "size": [0.14, 0.1], "platform": 1}
  ],
  "features": [
    {"type": "avenueEW", "z": 0.06},
    {"type": "hill", "name": "Thạch Trại Sơn", "at": [-0.32, -0.74], "size": [0.2, 0.45], "height": 1.2},
    {"type": "harbour", "side": "w"}
  ],
  "river": {"sides": "w"}
}
```

**Confidence:**
- Location and size: **high** (archaeology 2021–2024).
- Moat on all sides: **high**. The width of 25 m is a guess.
- Gates: **unknown**. E and W are implied by the E–W road; N and S are guesses.
- Palace position: **medium** (SW quadrant, N of the road).
- Harbour: plausible but unproven. The lake is ~1–1.5 km W, reached through channels.
- Coordinate rounding shifts the whole plan by ≤50 m.

---

## Summary

| city | name | lonlat | location conf. | geometry conf. |
|---|---|---|---|---|
| Thiên Thủy | Ký Thành | [105.333, 34.742] | medium-low, ±3 km (alternative Thượng Khuê [105.72, 34.58]) | guess |
| Vũ Uy | Cô Tang | [102.637, 37.927] | medium, ±1.5 km | size textual (7 × 3 li), shape guessed |
| Hán Trung | Nam Trịnh | [107.034, 33.072] | medium, ±1 km | guess; platforms from OSM |
| Ích Châu | Điền Trì | [102.698, 24.711] | high, ±0.1 km | high (18 ha core, 1.8 km moat) |

## Sources

- zh.wikipedia.org/wiki/冀县 · /姑臧 · /南郑区 · /滇池县 · /河泊所遗址 · /武威锁阳城城址 (raw wikitext via API)
- zh.wikisource.org/wiki/水經注/17 · /水經注/27 · /三國志/卷15 · /三國志/卷23 · /三國志/卷32 · /三國志/卷44
- https://whyc.lzu.edu.cn/portal/article/index.html?id=367&cid=22 (NCHA text on the 2024 Top-Ten Hebosuo find; figs. 2, 4, 8 were viewed)
- https://www3.xinhuanet.com/politics/20250501/29ce9135e47f425987460e6e7b0d229b/c.html
- https://www.yndaily.com/html/2025/kejiao_0425/134373.html **(snippet)**
- https://gansu.gansudaily.com.cn/system/2024/04/09/030983642.shtml
- https://m.sohu.com/a/497170438_214535 (孙启祥, 南郑城)
- https://m.sohu.com/a/271719732_739037 (武威故城之谜)
- https://m.thepaper.cn/newsDetail_forward_4430048 (贾小军, 姑臧城) · https://m.thepaper.cn/newsDetail_forward_10269614
- http://www.cass.cn/xueshuchengguo/wenzhexuebulishixuebu/201910/t20191029_5022519.shtml (雷台 = 前凉王陵?) **(snippet)**
- https://www.163.com/dy/article/L0SA3Q2R0552M20P.html (味县) **(snippet)**
- OSM Nominatim and Overpass (overpass.private.coffee) for all landmark coordinates

