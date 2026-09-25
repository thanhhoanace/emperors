# Changes to the 12 non-capital cities between 200 and autumn 219 (Jian'an 24)

Date: 2026-09-25. Read-only check against `data/cities.json` (200 CE layouts), `docs/design/history.md`, `docs/research/cities.md` and `docs/product/scenario.md`. No repo file was modified.

**Scope:** Ye, Xuchang, Linzi, Xiangyang + Fancheng, Jianye, Xiakou, Chengdu, Panyu, Jinyang, Ji, Changyi and Pengcheng. Luoyang and Chang'an are out of scope.

**Method:**
- Primary texts were read in full from zh.wikisource via the API:
  - *Sanguozhi* chapters 1, 9, 17, 18, 32, 36, 47, 51, 52, 54 and 55.
  - *Shuijing zhu* chapters 10, 28, 35 and 37.
- Also read in full: zh and en Wikipedia (raw wikitext), OSM Nominatim, news.qq.com, gdmc.snnu.edu.cn and sohu.com.
- **Blocked** (403 or reset): eeo.com.cn, cul.china.com.cn, lw.news.cn, news.sina.cn, and the ycwb.com article body (it came back empty).
- Facts seen only in a search-engine summary are marked **(snippet)**.
- Coordinates use the `cities.json` convention: km from the `world.json` lonlat, x east, z south.

**Renderer facts used** (`docs/design/prototypes/hancity.js`):
- `platform.height` gives 0.05·h world units. The existing data uses h = 3 for a 14–15 m terrace (Dục Tú, Hoàn Công), so h ≈ metres / 5, capped at 4.
- `blockade` spawns war ships at `at`, with `ships` = count.
- `rank: "capital"` gives taller walls (H 0.30 vs 0.22) and two-storey gate towers.
- There is **no** feature type for a pond/lake, a siege camp or a flood. Water comes only from the terrain bake.

---

## Summary table

| key | city | changed? | what a viewer would notice | confidence |
|---|---|---|---|---|
| ji | Ye (Nghiệp) | **YES, big** | Three Terraces on the NW wall (210, 213, 214); single Wei palace-city in the north-centre; Bronze Bird Garden in the NW quadrant; now the Wei kingdom capital | high (terraces), medium (palace size) |
| yu | Xuchang | no (era wording only) | — | high |
| qing | Linzi | no | — | high |
| jing | Xiangyang + Fancheng | **YES (event)** | Guan Yu's siege of Fancheng and Xiangyang; Han river flood (8th month 219); Guan Yu's war boats around Fancheng; Liu Biao's tomb mound outside the E gate | high (events), low (camp positions) |
| yang | Jianye | no (confirm 212 layout) | Sun Quan's seat since 211/212; he was still here in autumn 219 | high |
| jiang | Xiakou | no geometry; era/owner fix | Wu garrison (Sun Jiao "督夏口"); the Huanghu-shan Xiakou city is not built until 221/223 | medium |
| yi | Chengdu | no geometry; era/palace name | Liu Bei's seat since 214; King of Hanzhong from autumn 219 | high |
| jiao | Panyu | **YES (walls/role)** | Jiaozhou seat moved here in 217; Bu Zhi rebuilt the old Zhao Tuo walls (步骘城) | high (fact), medium (footprint unchanged) |
| bing | Jinyang | no (optional era) | Bingzhou abolished into Jizhou in 213 | medium |
| you | Ji (Kế) | no (optional era) | Youzhou abolished into Jizhou in 213 | medium |
| yan | Changyi | no | — | medium |
| xu | Pengcheng | no | — | medium |

---

## 1. Ye 邺 (`ji`): YES, the largest change

### Evidence

- ***Sanguozhi* 1 (Wudi ji):**
  - 208: "十三年春正月，公還鄴，作玄武池以肄舟師".
  - 210: "冬，作銅爵臺".
  - 213 (9th month): "作金虎臺，鑿渠引漳水入白溝以通河". 213 (5th month): Cao Cao becomes 魏公. 213 (7th month): "始建魏社稷宗廟".
  - 216 (5th month): 魏王.
  - 217: "夏四月，天子命王設天子旌旗，出入稱警蹕。五月，作泮宮".
- ***Shuijing zhu* 10 (濁漳水):**
  - "魏武封于鄴爲北宮，宮有文昌殿". The 長明溝 enters from the W, "逕銅雀臺下，伏流入城東注".
  - "城之西北有三臺，皆因城爲之基，巍然崇舉，其高若山".
  - "中曰銅雀臺，高十丈，有屋百一間 … 南則金虎臺，高八丈，有屋百九間。北曰冰井臺，亦高八丈，有屋百四十五間，上有冰室".
  - The brick facing ("飾表以塼") and the five-storey tower on Tongque are **Later Zhao (Shi Hu)**, not 219. Do not model them.
- **Ice Well terrace date:** en.wikipedia *Bronze Sparrow Terrace* says 213, with a tradition of 214 (de Crespigny 2010). zh.wikipedia 铜雀台 gives 214.
  - The same article says: "Modern observers measure the bases … at 122 m N–S and 70 m E–W".
  - Also: "The terraces were linked to each other and the palace by raised walkways". The Bronze Bird Garden (銅雀園 / 西園) "took up the whole northwestern quadrant of the city" (Tsao 2020).
- **Layout** (People's Daily repost on news.qq.com, 2026-09-14, quoting the director of the Ye museum):
  - "單一宮城坐落於北區中央。宮城東為官署及王公貴族所居戚里，西為皇家園林".
  - The axis runs 中陽門 → avenue → palace S gate → 文昌殿.
  - A pre-existing research note says the E–W avenue is at z ≈ +0.12.
- **Palace-city size** "東西620米、南北近1000米" **(snippet**, source page not opened; probably the ygx.sxu.edu.cn thesis *北朝邺城城市地理研究*). Treat it as medium–low confidence.
- **Terrace positions from OSM**, relative to `world.json` ji = [114.413, 36.271]:

  | OSM object | lat, lon | → [x, z] km | OSM bbox (N–S × E–W) |
  |---|---|---|---|
  | 冰井台址 | 36.27862, 114.40044 | [-1.13, -0.85] | ~124 × 90 m |
  | 铜雀台址 | 36.27687, 114.40031 | [-1.14, -0.65] | ~155 × 110 m |
  | 金凤台址 (= 金虎台) | 36.27545, 114.40030 | [-1.14, -0.49] | ~113 × 90 m |

  The W wall in the entry is x = -1.2, so the terraces sit on and just inside it ("因城爲之基"). This fits.

  Ice Well falls right on our N wall (z = -0.85), so the proposal moves it 0.06 km inside. The `world.json` centre is itself an estimate.
- **玄武池** (208): the location is **unresolved**.
  - Search summaries **(snippet)** place it "NW of Ye", "outside the W gate" or "8 km S of Tongque": they contradict each other.
  - The renderer has no pond type anyway.
  - Recommend: skip it, or bake it as a small lake NW of the city if a later source pins it down.
- **泮宮** (217): location unknown. Skip it.

### Proposed JSON (full replacement of `cities.ji`)

```json
"ji": {
  "name": "Nghiệp Thành", "rank": "capital", "state": "intact",
  "era": "Kinh đô nước Ngụy của Tào Tháo (Ngụy công 213, Ngụy vương 216); Tam Đài dựng 210–214",
  "outline": [[-1.2, -0.85], [1.2, -0.85], [1.2, 0.85], [-1.2, 0.85]],
  "gates": {"n": 2, "s": 3, "e": 1, "w": 1},
  "passages": 1, "que": "official",
  "palaces": [
    {"name": "Cung Ngụy vương (Văn Xương điện)", "at": [0, -0.37], "size": [0.62, 0.95], "platform": 2}
  ],
  "features": [
    {"type": "avenueEW", "z": 0.12},
    {"type": "garden", "name": "Đồng Tước viên", "at": [-0.7, -0.4], "size": [0.7, 0.8]},
    {"type": "platform", "name": "Băng Tỉnh Đài", "at": [-1.13, -0.79], "size": [0.07, 0.11], "height": 3.5},
    {"type": "platform", "name": "Đồng Tước Đài", "at": [-1.14, -0.65], "size": [0.07, 0.12], "height": 4},
    {"type": "platform", "name": "Kim Hổ Đài", "at": [-1.14, -0.49], "size": [0.07, 0.12], "height": 3.5}
  ],
  "river": {"sides": "n"}
}
```

Notes and options:
- **Heights:** Tongque is 10 zhang (≈23 m), which maps to 4 (the cap). Jinhu and Bingjing are 8 zhang (≈18.5 m), which maps to 3.5.
- **Sizes:** 70 m E–W × 110–120 m N–S, taken from the 122 × 70 m measurement and the OSM outlines.
- **`rank: "capital"`** is optional. It is a visual signal for "capital of the Wei kingdom". The surveyed walls, however, are *not* thicker than a provincial seat's (S wall base 16 m). If rank should follow wall size, keep `"provincial"`.
- **`que`:** keep `"official"`.
  - Cao Zhi's 登臺賦 mentions "浮雙闕乎太清", so the palace gate had a que pair.
  - Cao Cao was a king with imperial banners from 217, but not an emperor, so `"imperial"` (三出阙) would overstate it.
  - For the que pair at the palace gate instead of the city gate, add `"queAt": [{"at": [0, 0.1], "face": "s"}]` **[suy luận]**.
- **Flying bridges (飛閣)** between the terraces: `coveredWay` could stand in, e.g. `{"type": "coveredWay", "from": [-1.13, -0.735], "to": [-1.14, -0.71]}`. The gaps are only 25–40 m (≈0.06–0.09 world units) and the deck renders at 0.1 units, lower than the terrace tops (0.175–0.2). **Not recommended** without a renderer tweak.
- **Palace size:** if the 620 × 1000 m snippet is not trusted, keep the old footprint but rename it: `{"name": "Cung Ngụy vương (Văn Xương điện)", "at": [0, -0.42], "size": [0.7, 0.55], "platform": 2}`.

### Sources

- https://zh.wikisource.org/wiki/三國志/卷01
- https://zh.wikisource.org/wiki/水經注/10
- https://en.wikipedia.org/wiki/Bronze_Sparrow_Terrace
- https://zh.wikipedia.org/wiki/铜雀台
- https://zh.wikipedia.org/wiki/邺城遗址
- https://news.qq.com/rain/a/20260914A04H4V00
- https://gdmc.snnu.edu.cn/info/1005/1162.htm (Hebei Daily 2008: "三台建在邺城西城墙北，金凤台在南、冰井台在北、铜雀台居中")
- OSM Nominatim: 铜雀台址, 金凤台址, 冰井台址

---

## 2. Xuchang 许 (`yu`): no change

- It was Emperor Xian's capital since 196, and the palaces and ancestral temples were set up then ("立宗廟社稷制度", Sgz 1).
- Nothing new and visible is recorded for 200–219. In 218 Ji Ben's revolt burnt Wang Bi's camp at Xu ("攻許，燒丞相長史王必營", Sgz 1), but that left no lasting structure.
- 毓秀台 (Emperor Xian's altar terrace, SW of the inner city) is already in the entry (zh.wikipedia 汉魏许都故城).
- In autumn 219 Cao Cao even "議徙許都以避其銳" (Sgz 36). That is narrative only.
- **Era** (optional rewording): `"Kinh đô của Hán Hiến Đế từ 196, dưới quyền Tào Tháo; vòng thành ngoài có thể do Tào Ngụy đắp sau"`.
- Sources: https://zh.wikisource.org/wiki/三國志/卷01 ; https://zh.wikisource.org/wiki/三國志/卷36 ; https://zh.wikipedia.org/wiki/汉魏许都故城

## 3. Linzi 临淄 (`qing`): no change

No construction recorded for 200–219. It was under Cao's governors from 205–206.

---

## 4. Xiangyang 襄阳 + Fancheng 樊城 (`jing`): YES, as an event scene

### Evidence (autumn 219 is exactly the siege)

- **Guan Yu attacks.** Sgz 36: "二十四年 … 羽率眾攻曹仁於樊 … 秋，大霖雨，漢水汎溢，禁所督七軍皆沒". Sgz 17 (Xu Huang): "羽 … 圍仁於樊，又圍將軍呂常於襄陽". So **both** cities were besieged: Cao Ren in Fancheng, Lü Chang in Xiangyang.
- **The flood.** Sgz 1: "八月，漢水溢，灌禁軍，軍沒，羽獲禁，遂圍仁".
  - Sgz 17 (Yu Jin): "平地水數丈".
  - Sgz 18 (Pang De): "德屯樊北十里 … 漢水暴溢，樊下平地五六丈，德與諸將避水上堤。羽乘船攻之，以大船四面射堤上".
  - *Shuijing zhu* 28: "會沔水泛溢，三丈有餘".
- **Fancheng under siege.** Sgz 9 (Cao Ren): "仁人馬數千人守城，城不沒者數板。羽乘船臨城，圍數重，外內斷絕". The water reached to a few boards below the top of Fancheng's wall, and Guan Yu's boats ringed the city.
- **Siege works.** Sgz 17: "賊圍頭有屯，又別屯四冢 … 賊圍塹鹿角十重". Guan Yu had two camps (圍頭 and 四冢) and **ten rings of trench and abatis**.
  - Relief came only in the 10th / intercalary month ("水亦稍減", Sgz 9), which is after autumn.
- **Liu Biao's tomb (died 208), new since 200.** *Shuijing zhu* 28: "城東門外二百步劉表墓 … 今墳冢及祠堂猶高顯整頓". 200 bu ≈ 280 m.
- **Ownership:** Xiangyang has been Cao's since 208. The seat is the Xiangyang commandery, not Liu Biao's provincial office.

### Proposed JSON edits (`cities.jing`)

```json
"era": "Quận trị Tương Dương của Tào (Lã Thường giữ); thu 219 Quan Vũ vây Phàn Thành và Tương Dương, sông Hán tràn bờ",
"palaces": [
  {"name": "Phủ quận Tương Dương (phủ cũ của Lưu Biểu)", "at": [0, -0.1], "size": [0.5, 0.4], "platform": 1.5}
],
"features": [
  {"type": "twinTown", "name": "Phàn Thành", "at": [0.15, -1.55], "size": [0.45, 0.4]},
  {"type": "harbour", "side": "n"},
  {"type": "platform", "name": "Cảnh Thăng đài", "at": [1.2, -0.5], "size": [0.08, 0.08], "height": 2},
  {"type": "mound", "name": "Mộ Lưu Biểu", "at": [1.03, 0.05], "size": [0.08, 0.08], "height": 0.6},
  {"type": "blockade", "name": "Thuyền Quan Vũ", "at": [0.15, -1.0], "ships": 8}
]
```

- **Mound:** position is medium confidence (direction and distance from the *Shuijing zhu*); size and height are a guess. The E gate is at x = 0.75, and +280 m gives x ≈ 1.03.
- **Blockade:** high confidence that there was a fleet. The position (the Han between the two cities) is **[suy luận]**; the boats circled Fancheng "圍數重".

### Not expressible in the current schema

Recommend new features or a scene overlay:

1. **Flood.**
   - The Han stood ~7 m above normal ("三丈有餘") and spread over the low plain north of the river around Fancheng. Pang De's dike was 10 li N.
   - Fancheng's walls showed only "數板" above the water.
   - This needs a seasonal water-level override in the terrain/water pass (a lowland mask north of the Han, around 0–5 km from Fancheng). It does not belong in `cities.json`.
2. **Siege lines.**
   - "Ten rings of trench and abatis" around Fancheng, plus camps at 圍頭 and 四冢. Their exact positions are unknown; 四冢 was reachable by Xu Huang advancing from 偃城 in the N.
   - Suggest a new `siegeCamp` feature: an earth rampart, a moat and a palisade with 鹿角, as history.md's rules table already describes camps.
   - Stand-in until then: two `watchtower`s N of Fancheng, e.g. `[-0.5, -2.1]` and `[0.8, -2.1]` (**[suy luận]**, positions invented).
3. *Shuijing zhu* says Fancheng "南半淪水". That describes the 6th century, **not** 219. Do not cut Fancheng.

### Sources

- https://zh.wikisource.org/wiki/三國志/卷01
- https://zh.wikisource.org/wiki/三國志/卷09
- https://zh.wikisource.org/wiki/三國志/卷17
- https://zh.wikisource.org/wiki/三國志/卷18
- https://zh.wikisource.org/wiki/三國志/卷36
- https://zh.wikisource.org/wiki/水經注/28

---

## 5. Jianye 建业 (`yang`): no change; the 212 layout is confirmed

- **211–212.** Sgz 47: "十六年，權徙治秣陵。明年，城石頭，改秣陵爲建業". The entry's 212 layout (general's mansion, palisade, Stone City on the hill 3 km NW) is right for 219.
- **Still the seat in 219.** Lü Meng in 219 asked "乞分士眾還建業，以治疾為名" (Sgz 54), so Jianye was still the Wu base.
- **Sun Quan's move west.** He went west only in the intercalary 10th month of 219 ("閏月，權征羽", Sgz 47). He sat at Gong'an until 221 ("權自公安都鄂，改名武昌", Sgz 47, Huangchu 2). **In autumn 219 Sun Quan was still based at Jianye.**
- **No new works 212–219 in the city.** 濡須塢 (212) is 200 km away.
- **Era** (replaces "Dáng năm 212 (năm 200 chưa có)"): `"Trị sở của Tôn Quyền từ 211; đổi tên Kiến Nghiệp và đắp Thạch Đầu năm 212"`.
- Sources: https://zh.wikisource.org/wiki/三國志/卷47 ; https://zh.wikisource.org/wiki/三國志/卷54

## 6. Xiakou 夏口 (`jiang`): no geometry change; fix era and owner

- **Sun Quan's Xiakou city on 黃鵠山 is not yet built.** *Shuijing zhu* 35 dates it to "魏黃初二年 (221)"; Sgz gives 223.
- **The fort that does exist.** Still the crescent fort "沔左有郤月城，亦曰偃月壘，戴監軍築 … 後乃沙羨縣治". The bank is disputed, as the research doc already notes.
- **Also on the Han mouth.** 魯山 (Guishan, Hanyang) had "吳江夏太守陸渙所治城". Lu Huan is later than 219, so it is not in the scene.
- **Owner.** Wu since 209: Cheng Pu "領江夏太守，治沙羨" (Sgz 55). The 215 partition gave "江夏、長沙、桂陽東屬" to Sun Quan (Sgz 32).
- **Garrison commander.** Sun Jiao 孫皎 "代程普督夏口" (Sgz 51); he took part in the 219 campaign against Guan Yu.
- **Nothing new is recorded in 200–219.** The 208 blockade ships are gone, which is correct for 219.
- **Era** (replaces "Đồn Khước Nguyệt của Hoàng Tổ"): `"Đồn Khước Nguyệt ở cửa sông Hán; Ngô giữ, Tôn Kiểu đốc Hạ Khẩu (thành trên núi Hoàng Hộc chưa xây)"`.
- Confidence: medium. That Wu held it is certain; that the crescent fort was still the main work in 219 is inferred.
- Sources:
  - https://zh.wikisource.org/wiki/水經注/35
  - https://zh.wikisource.org/wiki/三國志/卷51
  - https://zh.wikisource.org/wiki/三國志/卷55
  - https://zh.wikisource.org/wiki/三國志/卷32

## 7. Chengdu 成都 (`yi`): no geometry change

- **Status in 219.** Sgz 32: after being proclaimed King of Hanzhong in autumn 219 (at Mianyang), "於是還治成都". Chengdu has been Liu Bei's seat since 214.
- **New works were along the road, not in the city.** The 典略 note says "備於是起館舍，築亭障，從成都至白水關，四百餘區". That means post stations and watch posts on the road north. Optionally, one `watchtower` outside the N gate could hint at it.
- No new palace is recorded before 221.
- **Era:** `"Trị sở của Lưu Bị từ 214; Hán Trung vương từ thu 219"`.
- **Optional palace rename:** `"Phủ Hán Trung vương (châu phủ cũ)"` **[suy luận]**.
- Source: https://zh.wikisource.org/wiki/三國志/卷32

## 8. Panyu 番禺 (`jiao`): YES (role and walls); confirmed

- ***Shuijing zhu* 37 (泿水):**
  - "建安中，吳遣步騭爲交州。騭到南海，見土地形勢，觀尉佗舊治處 … 乃曰：斯誠海島膏腴之地，宜爲都邑。**建安二十二年，遷州番禺，築立城郭**，綏和百越，遂用寧集".
  - This quotes 王範《交廣春秋》. The date is **217**, and walls (城郭) were built.
- **Modern local histories** (news.qq.com 2022 = sohu, from Guangzhou Daily):
  - "利用赵佗的旧都，将原城墙重新构筑加固，后人称之为'步骘城'".
  - The site core is at today's 中山四路 **(snippet)**.
  - So the footprint is **the same as the Zhao Tuo / Nanyue city** that the entry already draws.
- **Bu Zhi's tenure.** He governed until 220, when Lü Dai replaced him (Sgz 52).
- **Scenario conflict.** `scenario.md` makes `jiao` neutral ("nhà Sĩ"). Historically, Panyu in 219 was the seat of Sun Quan's governor Bu Zhi, while Shi Xie sat at Jiaozhi and paid homage to Wu. The era string below stays neutral.
- **Edits:**
  ```json
  "era": "Châu trị Giao Châu từ 217: Bộ Chất dời châu về và đắp lại tường thành cũ của Triệu Đà",
  "palaces": [{"name": "Châu phủ Giao Châu", "at": [0, -0.2], "size": [0.35, 0.3], "platform": 1.5}]
  ```
  - Outline, gates and harbour stay as they are.
  - The 朝臺 (Zhao Tuo's terrace) is 30 li NE, outside city scale.
- Confidence: high for the date and the rebuild; medium for "footprint unchanged".
- Sources:
  - https://zh.wikisource.org/wiki/水經注/37
  - https://zh.wikisource.org/wiki/三國志/卷52
  - https://news.qq.com/rain/a/20221218A01PY400
  - https://www.sohu.com/a/617264916_615815

## 9. Jinyang 晋阳 (`bing`): no geometry change

- **Bingzhou was abolished.** In the 3rd month of 213 the Han court restored the Nine Provinces: "詔書并十四州，復爲九州" (Sgz 1). Youzhou and Bingzhou were folded into Jizhou (献帝起居注, **(snippet)** via zh.wikipedia 九州 and Baidu 并州). Bingzhou was restored only in 220.
- In 219 Jinyang was the Taiyuan commandery seat. No new works are recorded.
- **Optional era:** `"Quận trị Thái Nguyên; Tịnh Châu đã nhập vào Ký Châu năm 213"`.
- Sources: https://zh.wikisource.org/wiki/三國志/卷01 ; https://zh.wikipedia.org/wiki/九州_(中国)

## 10. Ji 蓟 (`you`): no geometry change

- Same 213 merger: Youzhou was folded into Jizhou, and Ji remained the Guangyang commandery seat.
- **Optional era:** `"Quận trị Quảng Dương; U Châu đã nhập vào Ký Châu năm 213"`. Confidence is medium on the commandery name.

## 11. Changyi 昌邑 (`yan`): no change

No new works are recorded for 200–219.

## 12. Pengcheng 彭城 (`xu`): no change

No new works are recorded for 200–219. The Xuzhou seat moved here under Wei, but I could not pin down the date, and nothing visible changed.

---

## Things the schema cannot yet show (for the renderer lane)

1. **Seasonal flood** around Fancheng: a water level about 7 m up on the north-bank plain. This is the defining image of autumn 219.
2. **Siege camp** feature: a ring of trench and abatis with camp enclosures. Needed for Fancheng/Xiangyang, and useful for any `attack` event.
3. **Pond/lake** feature, e.g. Ye's 玄武池. Its location is unresolved, so low priority.
4. **Terrace-top halls:** Tongque had 101 rooms and a large pavilion. The `platform` feature renders a single small hall. A `terraceHall: "large"` flag would read better at map scale.
