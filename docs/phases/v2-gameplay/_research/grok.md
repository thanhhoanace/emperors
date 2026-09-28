# Grok research — phase v2-gameplay

> **Inbox.** Không phải SOT. Không sửa WORKING.md (đúng AGENTS.md luật 3). Mỗi tool một file; gói sau ghi nối vào đây.
> **Nhánh đọc:** `claude/gracious-pasteur-6s8fmk`.

Gói A (sáng 28/9): cảm nhận cộng đồng ngã rẽ ngắn vs chiến dịch.
Gói B (chiều 28/9): chủ dự án chơi spike 2 — quẹt được nhưng chán; review Claude; swipe vs Civ/TW; trend 2026; RoK; gợi ý.

---

# GÓI B — 2026-09-28 chiều (sau playtest spike 2)

> **Câu hỏi chủ dự án:** quẹt được rồi nhưng chán, trôi, win/thua không sao, không thưởng. Swipe có lượng khách / cộng đồng hào hứng không? Reigns hay Civ/TW3K? Làm mobile + YouTube, không PC. Trend 2026? Quay phase 1 nhưng đổi swipe → ra quyết định như Civ/TW còn ổn trên mobile không? RoK đông vì sao?
> **Nguồn:** Reddit, X, Steam, blog, YouTube creator, review store. Discord chỉ qua số dev công bố (OpenFront 65k), không đọc được log nội bộ.
> **HEAD lúc viết:** `7febf815` (spike 2 canvas).

---

## B0. Phản hồi chủ dự án (nguyên ý)

- Quẹt được.
- Chán. Lối chơi không hấp dẫn.
- Quẹt thẻ = cảm giác trôi tuột.
- Win cũng được, thua cũng không sao.
- Không phần thưởng, không hấp dẫn.
- Muốn dòng mobile / YouTube game, không PC.
- Ý: bỏ swipe làm xương sống, quay phase trước, ra lệnh / ra quyết định kiểu Civ/TW.

Đây là tín hiệu playtest, không phải ý kiến thị trường. Phần dưới đối chiếu với cộng đồng.

---

## B1. Review khó tính — cách xây, engine, gameplay Claude (spike 1–2 + UI v1)

### Cách xây

Trong ~12 giờ Claude: gom research, tự synthesis (lệch luật 4, tự ghi), 12 câu, `DECISION.md`, spike 1, bị chủ chê nhiều nút / không bấm canvas, spike 2 lại trên canvas Design — đúng bề mặt đã chết ở spike 1. DECISION mục 8 đã viết HTML + `npm start`; cùng ngày đổi hình thức.

Hậu quả: luật v2 sống trong `spike2/Main.dc.html` (~80KB, 69 hàm), `sim.js` parse script bằng regex. Không chung một hàm với `src/engine`. Freeze v2 từ spike này là khóa file ném.

Vi phạm tinh thần AGENTS: "có vui không = spike không phải báo cáo" rồi vẫn chồng markdown; "không code luật mới trước freeze v2" rồi nhét luật vào HTML design.

Tối ưu *trông tiến triển*. Không tối ưu *một người chơi được một ván trên máy mình rồi muốn ván nữa*.

### Engine v1 (`src/engine`)

Phần lõi (Grok, trước đó): deterministic, mulberry32, không DOM, envelope lượt — ổn.

Luật combat vẫn hỏng. `defenseOf` chia tổng quân đều số châu. Đo đúng 27/9 (F1, churn 1,6–2,0 châu/đánh), không sửa vì lane. Spike viết đồn theo châu; `engine.js` vẫn chia đều.

Nợ biết mà để: observation mất `code` (“Biến cố trong nước”); stratagem mất `sub`; `observePact` mất `code`. Game nói dối người chơi — đúng triệu chứng "xem chứ không chơi".

`decide()` đọc state thật. Perception chỉ bọc người. Máy biết tỉ lệ; người học bằng chết.

### UI v1 Claude (`player-ui.js`, overlay)

Năm nút lệnh, danh sách đích, checkbox bội minh, sứ giả, nhật ký. Bản đồ `pointer-events: none`. Architecture đúng (lệnh qua controller). Game sai: người muốn bấm đất. `terrain.js` 69KB là screensaver.

### Spike 2 — hướng đúng hình, luật đồ chơi

Có: một quyết định, hai phía, số, bản đồ khoanh chỗ.

Hỏng:

- Generator chọn đích dễ nhất (`p >= 0.2`). Người không chọn *ô*. Gật/lắc trên chỗ máy chọn.
- In `%` thắng trên thẻ = spoiler. Não tắt.
- Xưng bá 6/20 châu; thua khi nhà khác 11. Timer giả, không phải tranh bá.
- Cân bằng 60 ván/đế: Tần gật hết **80%**; Minh gật hết **8%**; Đường cẩn thận **22%**. Gật hết Tần dễ hơn đọc bài.
- 98–209 lần chạm / ván, p90 Đường **570**. Không phải "nghĩ ít như cờ".
- Tri thức đế = hệ số (mộ +50%, lương +50%), không phải nước đi.
- AI đọc sự thật. Lại v1.

Chấm nhanh: kỷ luật yếu; lõi engine khá; combat v1 hỏng; UI v1 sai chỗ; spike 2 cảm giác đúng hướng, luật chưa đáng freeze.

---

## B2. Swipe có người chơi không? Cộng đồng có hào hứng không?

### Số lượng

| Game | Quy mô | Ghi chú |
|---|---|---|
| Reigns gốc (2016) | ~2 triệu bản tới 2019; series **~4 triệu người chơi** (Devolver, 10 năm, 2026) | Tháng đầu ~600k / ~$1tr. ~50% iOS, 30% Android, 20% Steam |
| Reigns Steam | ~170k bản ước; CCU trung bình 10–20 | 87% positive / ~8k review — khen lúc ra |
| Reigns: Three Kingdoms | Steam **Mixed 52%** (~320–360 review); CCU 1–3 | Cùng đề tài spike 2 |
| Reigns: The Witcher (2026) | Steam peak launch **179 CCU**; Android đầu ~1.000 tải | IP lớn không cứu thể loại |
| Lapse: A Forgotten Future | Play **10M+** (ước 16–17tr); 4,7★; ~30–55k tải/tháng | F2P + ads. Lượng vì miễn phí |

Swipe **có** thị trường premium 2016. Không có bằng chứng thể loại đang phình 2026.

### Reddit / Steam / blog / X

Launch 2016: hào hứng. Jacksepticeye ~3tr view/video; series Reigns ~50tr view / ~4.000 video (Let's Play Index). Reddit: "perfect commute", "CK2 pop-up events".

Sau 1–3 giờ, cùng các thread:

- "Bored almost immediately… 24-hour game jam."
- "Grew bored with GoT Reigns within an hour."
- "Coin flip until the card you need."
- Three Kingdoms: swipe to advance, thẻ lặp, không đổi hệ quả.

X 2024–2026: chủ yếu bài phát hành Nerial/Devolver, không có scene meta.

Câu Reddit đúng giá $3: *ba giờ đáng nhớ, có thể không bao giờ mở lại.* Đó là đồ chơi, không phải dòng người ta theo năm.

### Vì sao Reigns gốc hút — spike 2 thiếu đúng các móc

Alliot: quẹt là đồ chơi (Tinder); game sống khi gắn trọng lượng.

1. Bốn thanh **căng hai đầu** — đầy cũng chết. Spike 2: số tăng, gật hết Tần 80%.
2. Hậu quả trễ. Spike 2 in toán trên thẻ.
3. Chết có mặt (thiêu, đảo, treo). Spike 2: "11 châu" / "mất đất lần hai".
4. Mở giữa các mạng (thẻ, quest, nhớ kiếp). Spike 2: đổi đế / chơi lại, không mở gì.
5. Ít thẻ, mỗi thẻ nặng. Spike 2: 200 tap.

Kết luận gói này: **swipe không phải dead market 2016; swipe làm xương sống tranh bá 2026 là dead cho hướng Emperors** — vì cộng đồng không hào hứng, YouTube không sống bằng ngón cái, và chủ dự án đã chơi thấy trôi.

---

## B3. Reigns vs Civ / TW3K — ai làm gamer thích thú

Không cùng cân. Câu hỏi là *nhiệt*, không phải so doanh thu indie vs AAA.

| | Reigns series | Civ VI | TW3K |
|---|---|---|---|
| Quy mô | ~4tr người chơi series | >11tr bản | Steam Spy 2–5tr owner |
| Steam CCU đỉnh | gốc nhỏ (đơn vị nghìn / trăm) | 162k+ launch | **192k** (kỷ lục RTS Steam) |
| CCU còn sống | vài chục | hàng chục nghìn | ~3,5k TB / ~7k peak tháng |
| YouTube | ~50tr view series | Civ VI **~1,13 tỷ view / 181k video** | clip chiến dịch + trận đều |
| Review cảm xúc | cute / lặp / hết bài | một vòng nữa | tướng + bản đồ |

Reigns: Three Kingdoms (cùng đề tài) **52% Mixed** — đề tài không cứu swipe.

Mobile + YouTube cắt đôi:

- **Mobile play:** swipe hợp máy (80% ds Reigns gốc ở điện thoại). Một tay, 3–10 phút.
- **YouTube:** swipe xấu. Hit 2016 là face cam + chết hài, không phải thế cờ. Civ / TW / OpenFront sống vì bản đồ đổi hình.

Muốn cả hai kênh bằng một lối quẹt: mobile nhỏ, YouTube gần như không.

---

## B4. Trend 2026 (Reddit / Steam / creator / wishlist)

Không phải năm của "Civ đầy đủ trên phone". Không phải năm swipe trở lại.

### Đang nóng — hàng xóm cơ chế

**OpenFront** (trình duyệt RTS lãnh thổ, đánh vào đất, minh, phản, nuke):

- Dev: **>200k người/ngày**, 21tr người từng vào, 47tr view YouTube, 5.500 video / 142 creator, **65k Discord**, **240k wishlist** trước khi bán Steam (EA 17/9/2026).
- Tháng 7/25 → 7/26: số ván 1,07tr → 4,98tr.
- Reddit: annex, snowball, phản minh — không nói menu.

**9 Kings / Thronefall / The King is Watching:** run 10–15 phút, combo hiện ra. 9 Kings CCU ổn vài trăm–vài nghìn năm sau. Reddit so ba game: thích độ sâu *trong run ngắn*.

**Polytopia:** còn sống mobile; X vẫn nhắc. Than: hết bài toán, không phải "sao không dài như Civ".

**Roguelite / deck 2026:** StS 2, Hades II, Balatro-dòng nuốt attention. r/roguelites xin "4X-lite + run 20–30 phút".

### Bài học, không phải mẫu

**Civ VII:** Steam Mixed **~47% / 62k review**. Than: Age reset cụt, UI giấu số, không cảm giác Civ. Một thời gian Civ VI già đông CCU hơn bản mới. Cộng đồng không xin thêm quẹt; xin đừng cắt công đã bỏ.

**Civ VI mobile (Aspyr):** một phần khen Civ đủ trên máy; đa số than giá DLC, crash, pin, cloud chết. Written iOS ~3.2, negative >50%. Cái chết của *Civ nguyên bản trên phone*, không phải cái chết của *ra lệnh*.

**House of Legacy:** Very Positive ~83%. Khen mất đếm giờ vì hôn nhân / kế vị. Gần fantasy xuyên không — nhưng PC nhiều buổi, không ván 20 phút.

Steam 2026 nói chung: action/horror/sim (RE Requiem, Timberborn 1.0…). Không đối thủ trực tiếp; chỉ cho thấy PC mua *thấy hệ thống chạy*.

---

## B5. Cơ chế "ra quyết định như Civ/TW" còn phù hợp? Ổn mobile?

**Còn — nếu hiểu là một lệnh có trọng lượng trên bản đồ, không phải port Civ.**

Người chơi (r/civ, r/totalwar, OpenFront, Steam 9 Kings) vẫn muốn:

- Chỉ vào một chỗ, nói đánh / đắp / kết minh.
- Thấy hậu quả mùa sau trên đất.
- Kể được vì sao thua.

Họ **không** muốn trên mobile: năm tab, hàng đợi 8 mùa, World Congress, tooltip bị ngón tay che.

| Ổn trên phone | Chết trên phone |
|---|---|
| Chạm châu / thành = chọn đích | Menu 5 lệnh + 3 lớp submenu |
| Một quyết định chính / mùa, 15–25 phút | 200 tap / ván |
| Số ít, lớn, trên bản đồ | Band chữ + 4 tab tình báo |
| Kết thúc theo cốt | 48 mùa để "đủ Civ" |

OpenFront/Polytopia sống mobile vì thao tác là đất. Aspyr Civ sống lay lắt vì mang cả PC xuống.

YouTube cần châu đổi màu, tướng chết, minh vỡ trong 30 giây nhìn. Phase 1 có hình; thiếu tay trên đất.

Không ổn: nhét lại thuế / hàng đợi / bốn lớp tướng / tin trễ nhiều mùa vào một ván mobile. Đó là wishlist interview 27/9 (“muốn sau khi xem v1”), lệch miệng “vào là chơi”.

---

## B6. RoK đông vì đâu

Không phải vì 4X hay. Lilith bán **mùa giải xã hội + sợ tụt**.

Giữ chân thật (r/RiseofKingdoms, YouTube alliance, kể khi đang chửi):

1. KvK / liên minh — ở vì nhóm.
2. Lịch sự kiện 24/7 — luôn có việc hôm nay.
3. Tướng sưu tầm + P2W tăng tốc — F2P "trang trí núi".
4. YouTube drama kingdom.

Than 2025–2026 lặp:

- P2W, farm-kill, zeroed khi migrate.
- **Piloting** (ca trực 24/7) phá KvK — địch không bao giờ offline.
- Content 2026 half-baked.
- "I quit after 5 years" là genre post.

Một người + agent **không copy RoK**. Học phần bản đồ chung + đánh đất + minh có nghĩa. Đừng học live-ops.

Tam Quốc mobile VN đang đầy clone RoK = chỗ tiền, không phải chỗ anh thắng bằng sống-ops.

---

## B7. Gợi ý (giả thuyết nghiên cứu, không chốt luật)

### Hướng

1. **Bỏ swipe làm xương sống.** Giữ quẹt/Ó-Không chỉ cho sứ giả / phản ứng.
2. **Quay phase 1 về mặt tay:** chạm đất = đích. Một lệnh chính / mùa. Bản đồ không còn `pointer-events: none`.
3. **Nước đi phải đổi bàn ngay.** Đánh, đồn, chiêu hàng, kết minh — thấy châu đổi chủ / lũy / minh. Không bốn thanh Tinder, không sổ sách Civ VII.
4. **Ván có mặt.** Thắng/thua kể được một câu. Không khóa 6/11 châu tùy tiện, không 200 quẹt.
5. **Không freeze v2 từ spike 2.** Artifact luật không ổn định, cân bằng lệch, chủ dự án đã chán.
6. **Không làm RoK.** Không làm Civ đầy đủ trên phone.
7. **Sửa F1 đồn theo châu trong engine** trước khi đẻ prototype thứ ba. Đo đã có từ 27/9.
8. Spike tiếp (nếu cần) = **HTML `npm start`**, bấm đất, một lệnh, 15–25 phút. Không canvas.

### Đo thành công (gắn DECISION đã chốt, đổi thao tác)

Giữ: lựa chọn đầu < 60 giây; ván quen 15–25 phút; kể được một lựa chọn đổi thế; tự bấm ván nữa > 40%; đổi đế ván sau.

Bỏ làm mốc chính: số lần quẹt. Thêm: người chỉ được ô trên bản đồ trước khi xác nhận.

### Việc không làm

- Không viết `GAMEPLAY-FREEZE.md` v2 từ spike 2.
- Không thêm thuế / hàng đợi / 4 lớp tướng vào ván ngắn.
- Không in `%` thắng trên UI người.
- Không đẻ spike canvas thứ ba.

---

## B8. Nguồn gói B (rút)

Swipe / Reigns:
- Devolver / VideoGamer 2026: series 4tr người chơi
- Polygon / PocketGamer 2016: 600k / $1tr tháng đầu; 50/30/20 nền
- Wikipedia Reigns: 2tr bản tới 2019
- Steam Reigns: Three Kingdoms Mixed 52%
- Raijin / Steam charts Reigns CCU thấp
- Business Insider PL: Witcher launch 179 CCU
- AppBrain / Play: Lapse 10M+
- Let's Play Index: Reigns ~50tr view; Civ VI ~1,13 tỷ
- r/AndroidGaming, r/Games, r/iosgaming threads Reigns bored / commute
- Alliot GDC / Gamedeveloper / PC Gamer: Tinder + 4 meters
- RPS, Indie Corner, Hooked Gamers: Three Kingdoms lặp

Trend / map strategy:
- Steam news OpenFront 2026-08 / 2026-09: 200k DAU, 240k wishlist, 65k Discord, 47tr YT
- r/Openfront, r/9Kings, r/Polytopia
- Tracker 9 Kings CCU
- Steambase Civ VII ~47% / 62k review
- Digra / PC Gamer / PCZ: Age reset, Test of Time
- AppHunter Civ VI iOS review sentiment
- Steambase House of Legacy ~83% VP

RoK:
- r/RiseofKingdoms quit / zeroed / piloting 2025–2026
- YouTube alliance: KvK piloting, content drought 2026

Nội bộ:
- `docs/phases/v2-gameplay/DECISION.md`, `WORKING.md`, `spike2/`
- `src/engine/engine.js` `defenseOf`
- `src/world/player-ui.js`

---

## B9. GAP gói B

- Discord OpenFront / RoK không đọc được log; dùng số dev công bố + Reddit/YouTube.
- Chưa có số phút thật chủ dự án chơi spike 2 (chỉ cảm nhận).
- Câu "có vui không" vẫn chờ spike bấm đất, không chờ thêm swipe.

---
---

# GÓI A — 2026-09-28 sáng (ngã rẽ ngắn vs chiến dịch)

> **Câu hỏi (WORKING.md → Next research):** cảm nhận cộng đồng về strategy ngắn và chiến dịch dài (Reddit, X, diễn đàn Việt); lời than ván ngắn "cụt" và chiến dịch "bỏ dở". Bổ sung bằng chứng thị trường + DNA Loạn 12 Sứ Quân / xuyên không mà chủ dự án nêu 28/9.
> **HEAD đọc:** `claude/gracious-pasteur-6s8fmk` @ 4042ce23 (2026-09-28).

---

## 0. Phạm vi và cách đọc

GAP mà WORKING.md giao Grok là *cảm nhận cộng đồng*, không phải tổng hợp lại toàn bộ thị trường. Phần 1–2 trả lời đúng GAP. Phần 3–5 là bằng chứng để không lắp Claude. Phần 6 là hệ quả *nếu* chấp nhận bằng chứng — đó là giả thuyết nghiên cứu, không phải quyết định.

Hai ngã rẽ chủ dự án đặt 28/9:

1. Vào là chơi: join, nghĩ ít, kết quả nhanh, kích thích chơi liên tục như cờ.
2. Chiến dịch: tính toán, chi tiết, căng thẳng, mất nhiều thời gian.

WORKING.md đã ghi mâu thuẫn Claude vs ChatGPT: Claude nghiêng ngã 1; ChatGPT nói bằng chứng *không* chứng minh nhóm thích ngắn đông hơn. Grok không phân xử tranh chấp đó bằng doanh thu. Grok phân xử bằng *lời người chơi nói về cảm giác cụt / bỏ dở*.

---

## 1. Lời than chiến dịch "bỏ dở" — dày, lặp, đồng nhất nguyên nhân

Cộng đồng strategy dài không bào chữa việc bỏ dở. Họ coi đó là *bình thường*.

r/civ, 2025-02, "Hundreds of Civ hours — have never finished a game": đầu game (khai phá, đất, đề phòng sớm) hấp dẫn; vào đời hiện đại thì "biết trước kết quả, chỉ còn vi việc". Trả lời đầu: "That's normal, only a minority of players finished their games before VII." [r/civ 1ipxh2m]

r/civ, thread cũ đã đi vào huyền thoại (2013, 100 giờ chưa xong một ván): comment 220 giờ / 4 ván xong; 135 giờ / 0 ván; người 700 giờ vẫn restart khi "không ra như ý". Lý do lặp: đời sau chậm, AI yếu, muốn thử civ khác. [r/civ 1ri6t6]

r/civ, 2025-05, "Age System Because People Don't Finish The Game" (214 upvote): Firaxis cắt Civ VII thành ba kỷ nguyên *vì* tỉ lệ hoàn thành thấp. Phản ứng cộng đồng không phải "cảm ơn đã ngắn hơn". Nhiều người chơi xong Antiquity rồi tắt, hoặc gỡ game, vì *điểm cắt kỷ nguyên* làm mất thành-bang / cảm giác xây dựng. Đây là lời than "cụt" *trên* sản phẩm đã cố tình làm ngắn. [r/civ 1kukapn]

r/CrusaderKings, 2024-04, "Never finished a campaign in 600+ hours": một campaign CK3 = nhiều tuần đến tháng; DLC/mod phá save. Comment 2k+ giờ: chinh phục cả Old World, "never even get to 1350". Cộng đồng tái định nghĩa "xong" = đạt mục tiêu tự đặt, không phải end date. [r/CK 1c660kp]

r/StrategyGames + comment Total War: "1000 hours in TW Rome 2 yet I never finished a campaign." Nguyên nhân hay gặp: điều kiện thắng chậm hơn lúc người chơi *biết* mình đã thắng; endgame không thách. [r/StrategyGames ig0xr2]

**Tóm cộng đồng — chiến dịch:**

- Bỏ dở là hành vi đa số, không phải thất bại cá nhân.
- Phần được yêu = *mở ván / khám phá / bất định*. Phần bỏ = *quản lý cuối, micro, đã biết kết quả*.
- Cắt ngắn bằng điểm reset (Civ VII ages) tạo than phiền *cụt* và *mất công đầu tư*. Không phải cắt nào cũng được.
- Người chơi chiến dịch vẫn chơi hàng trăm giờ. Họ mua *quá trình*, không mua *hồi kết*. Đo bằng "% thắng một ván" sẽ đánh giá thấp nhóm này.

Hàm ý cho Emperors: nếu v2 là chiến dịch 48 lượt / 20–40 phút mà *cuối ván vẫn là cùng một menu 5 lệnh + bản đồ nhấp nháy*, sẽ dính đúng hội chứng Civ đời sau mà không có đầu game Civ (vì v1 đang cho sẵn 1 châu + quân).

---

## 2. Lời than ván ngắn "cụt" / "nông" — có, nhưng khác loại

Polytopia là đối chứng gần nhất với ngã 1 (Civ cô đọng, ~30 lượt, điện thoại / web).

Lời khen lặp trên r/AndroidGaming và r/Polytopia từ 2016: "scratches that Civilization itch without taking 20 hours"; "finished my first match on the toilet"; "no grindiness". [r/AndroidGaming 5fy5yy]

Lời chê "nông": review kiểu "quicker, less complicated Civilization for impatient people"; "over in 45 minutes". Đây là giọng *người đang so với Civ*, không phải giọng người đã chọn ván ngắn rồi thất vọng.

Bên trong cộng đồng Polytopia, than "cụt" ít hơn than "đừng bảo tôi đi chơi Civ". Thread 2020 "Please stop saying if you want complexity go play civ": người chơi muốn *thêm chiều sâu trong cùng khuôn 30 lượt* (mastery, tribe matchup, map), không muốn kéo dài thành campaign. [r/Polytopia kheftj]

2025, người 1650 ELO / 900 ván: game là bài toán "achieve X with given conditions", không phải xây đế chế. Replay đến từ *đối thủ + tribe + map*, không từ meta ngoài ván. [r/Polytopia 1kn9xfv]

Perfection mode (điểm trong 30 lượt) bị một số người chơi cao cấp mô tả "almost like a chore" — đó là cụt *của lốp điểm số*, không phải cụt của *độ dài ván*. [r/Polytopia 17q72ek]

**Tóm cộng đồng — ván ngắn:**

- "Cụt" xuất hiện khi người chơi đo bằng thước Civ (thiếu cây kỷ nguyên, thiếu đời). Không xuất hiện khi họ đo bằng thước cờ (thắng/thua rõ, ván sau khác).
- Than thật bên trong thể loại ngắn là: *lặp recipe*, *mất đối xứng tribe*, *hết bài toán* — không phải "giá mà dài thêm 20 lượt".
- Chiều sâu được chấp nhận = mastery trong cùng khuôn khổ, không = thêm hệ thống sổ sách.

Hàm ý: nếu Emperors làm ván 8–16 lượt mà bốn đế cùng menu, hết surprise ở ván 3, cộng đồng sẽ gọi là nông. Nếu cùng độ dài nhưng mỗi đế / seed / tướng là một bài toán khác, lời than "cụt" giảm.

---

## 3. Thị trường (bổ sung, không để thắng tranh luận "ngắn đông hơn")

Số này *không* chứng minh người thích ngắn đông hơn người thích dài. Chứng minh hai thị trường đều lớn, và *cửa vào* đang dịch về thấp.

- Quantic Foundry, 2015→2024, >1,5 triệu profile: điểm hấp dẫn "strategy and planning" 50 → ~33. Diễn giải của họ: 67% người 2024 coi trọng lập kế *ít hơn* người trung bình 2015. Không phải "không ai chơi strategy". Là "ít người muốn *nghĩ nặng* hơn xưa". Nguồn: quanticfoundry.com/2024/05/21/strategy-decline/
- H1 2025 mobile: strategy ~$10,6 tỷ, ~24% chi tiêu, +26% YoY (AppMagic / PocketGamer).
- 4X mobile 2024 ~$6,8 tỷ; H1 2025 ~$3,9 tỷ (+~28%). Tiền nằm ở hybrid casual 4X (Whiteout Survival, Last War, Kingshot): *30 giây đầu dễ*, hệ thống dày ở ngày 7. Không phải Civ cổ điển, không phải puzzle thuần.
- Việt Nam 2025 (Gamota): ~54 triệu người chơi mobile, chi ~$825 triệu, ~2,5 giờ/ngày; tiền chảy MMORPG + 4X/SLG. Fantasy ~22% install / 31% revenue top 50. Tam Quốc nửa cuối 2025 dịch SLG / quốc chiến.
- TW3K: ~3,3 triệu bản; năm đầu 2,1 triệu; kỷ lục franchise. Sega / CA dừng support sớm; fan vẫn chơi (Steam ~3k CCU 2026). Bán *Romance + IP*, không bán độ dày Records. ROTK 8 Remake: ~100k bản, review ~50% — cùng IP, lốp sâu hơn, audience hẹp hơn nhiều.

Đồng ý với ChatGPT ở điểm: doanh thu 4X/SLG *không* chứng minh người thích ván 15 phút. Đồng ý với Claude ở điểm: *cửa vào* đang thắng là thấp, và completion campaign là thiểu số.

---

## 4. DNA gốc — Loạn 12 Sứ Quân + xuyên không

Không trộn hai "12 Sứ Quân".

- Bản Ola / MGM mà game thủ Việt nhớ (Java/Android, match-3 + lượt): xếp 3 kiếm = đánh, 3 tim = hồi, máu + lương. Vào là đánh. Mỗi lượt có kết quả. Sử Việt là áo. Lời khen đường thời: dễ hiểu, gây nghiện vòng lặp ngắn.
- 12 Warlords (VGV 2025, HoMM-like) là sản phẩm *khác*: khám phá + xây thành + trận. Không phải ký ức gốc của chủ dự án.

Xuyên không (web Việt + IP đấu tướng 2025 kiểu Soul Land: Time Reversed): fantasy là *một người rơi vào thế giới quen, dùng thứ mình biết, đổi một cục diện*. Không phải fantasy Bộ Chính trị. Claude đã ghi: độc giả phạt "quá bá / harem", thưởng "có lương, có quân, logic". Grok đồng ý.

Ghép hai nguồn: sản phẩm trong đầu gốc là **ván có mặt nạ lịch sử + ego xuyên không**, không phải Civ VI mặc áo Tam Quốc. Owner inputs 27/9 (thuế, hậu cần, hàng đợi 2–3 lượt, tướng 4 lớp) là *danh sách muốn sau khi chơi v1*, có thể lệch DNA gốc. Đây là mâu thuẫn cần chủ dự án nhìn lại, không phải Grok quyết.

---

## 5. Cảm giác "xem chứ không chơi" khớp ngã nào

Chủ dự án 27/9: đang xem; tấn công chỉ xem quân chạy; không bấm đất; không tương tác quân/tướng.

Đó không phải triệu chứng "thiếu chiến dịch". Đó là triệu chứng **thiếu nước cờ**. Cờ tướng / cờ vua: mỗi nước đổi hình bàn ngay. V1 đổi hình bàn chậm (châu đổi chủ 1,6–2,0 / lượt nhưng người chơi không *ra lệnh* lên đất), và kết quả lệnh là cutscene.

Thêm thuế / hàng đợi / tình báo trễ *trước khi* mỗi lệnh đổi bàn cờ sẽ làm "xem" nặng hơn (thêm UI), không làm "chơi" rõ hơn.

Số đo 27/9 (giữ để đối chiếu, nguồn Claude B.4): ván đã dài 38–41 lượt, 15–25 phút ở 2× — về *thời lượng* đã ở ngã 1; thiếu chiều sâu *của một lệnh*. Grok đồng ý đoạn này.

---

## 6. Giả thuyết nghiên cứu gói A (không chốt)

1. **Hai ngã rẽ là hai sản phẩm.** Không phải hai độ khó của một game. Cộng đồng than khác loại ở mỗi ngã.
2. **GAP "cụt vs bỏ dở" không đối xứng.** Bỏ dở campaign là đa số và được chấp nhận. Cụt ở ván ngắn là lời của người đo nhầm thước, hoặc của game hết bài toán. Không suy ra "thị trường thích ngắn hơn". Suy ra: *nếu chọn ngã 1, đo replay và độ rõ của nước đi, đừng đo bằng fantasy đế chế*. *Nếu chọn ngã 2, chấp nhận đa số không xong ván và phải làm đầu game đáng chơi*.
3. **Lai dễ yếu hai nửa** nếu nhét hệ thống campaign vào ván 20 phút (Civ VII ages là case). Lai *có thể* được nếu lớp sâu nằm *giữa các ván* (meta đế / seed / xếp hạng) chứ không nằm trong một lượt.
4. **Thứ test trước vẫn là ván ngắn có răng** — khớp WORKING.md current hypothesis và luật 8 AGENTS.md (câu "có vui không" = spike). Grok không đòi kết luận thị trường trước spike.
5. **Giữ / nén owner input (góp ý nghiên cứu, bảng A.5 Claude):**
   - Giữ trong ván mặc định nếu chọn ngã 1: 4 kit đế khác nhau ở nước hợp lệ; đồn trú theo châu (sửa F1); ước lượng chữ; phá ước hiện trước khi bấm; một át chủ bài xuyên không / ván; lưu vong 1 lần.
   - Để lớp meta / campaign: thuế, hậu cần chi tiết, loại lính, hàng đợi dài, tướng 4 lớp đầy đủ, buôn vùng rìa, tình báo trễ nhiều tầng.
   - Không nhét vào tutorial.

---

## 7. Nguồn gói A (rút)

Cộng đồng:
- https://www.reddit.com/r/civ/comments/1ipxh2m/
- https://www.reddit.com/r/civ/comments/1ri6t6/
- https://www.reddit.com/r/civ/comments/1kukapn/
- https://www.reddit.com/r/CrusaderKings/comments/1c660kp/
- https://www.reddit.com/r/StrategyGames/comments/ig0xr2/
- https://www.reddit.com/r/AndroidGaming/comments/5fy5yy/
- https://www.reddit.com/r/Polytopia/comments/kheftj/
- https://www.reddit.com/r/Polytopia/comments/1kn9xfv/
- https://www.reddit.com/r/Polytopia/comments/17q72ek/

Thị trường:
- https://quanticfoundry.com/2024/05/21/strategy-decline/
- https://www.pocketgamer.biz/strategy-games-surge-as-rpg-revenue-tumbles-h1-2025s-top-genres-revealed/
- https://gamesbeat.com/two-paths-to-success-in-4x-strategy-games-as-monetization-models-divide-the-genre/
- https://www.pocketgamer.biz/over-50-of-vietnam-population-plays-mobile-games/
- Sega / CA sales TW3K qua báo 2026 (~3,3 triệu)

Nội bộ:
- `docs/phases/v2-gameplay/WORKING.md`
- `_research/claude.md` (B.4 số đo, D gốc ý tưởng)
- `docs/status.md` 2026-09-28

---

## 8. GAP gói A (không mở vòng 3)

- Diễn đàn Việt (Vozer / Tinhte / group Tam Quốc mobile) không lấy được quote sạch ở lượt đầu; tựa Tam Quốc VN nói nhiều về pay-to-win / auto hơn là độ dài ván.
- Câu "có vui không" đã có câu trả lời playtest ở gói B.
