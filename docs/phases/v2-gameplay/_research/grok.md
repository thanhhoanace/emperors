# Grok research — phase v2-gameplay

> **Ngày:** 2026-09-28
> **Câu hỏi (WORKING.md → Next research):** cảm nhận cộng đồng về strategy ngắn và chiến dịch dài (Reddit, X, diễn đàn Việt); lời than ván ngắn "cụt" và chiến dịch "bỏ dở". Bổ sung bằng chứng thị trường + DNA Loạn 12 Sứ Quân / xuyên không mà chủ dự án nêu 28/9.
> **Vai trò:** inbox. Không phải SOT. Không sửa WORKING.md ở lượt này (AGENTS.md luật 3). Không chốt luật.
> **HEAD đọc:** `claude/gracious-pasteur-6s8fmk` @ 4042ce23 (2026-09-28).

---

## 0. Phạm vi và cách đọc

GAP mà WORKING.md giao Grok là *cảm nhận cộng đồng*, không phải tổng hợp lại toàn bộ thị trường. Phần 1–2 trả lời đúng GAP. Phần 3–5 là bằng chứng để không lắp Claude. Phần 6 là hệ quả *nếu* chấp nhận bằng chứng — đó là giả thuyết nghiên cứu, không phải quyết định.

Hai ngã rẽ chủ dự án đặt 28/9:

1. Vào là chơi: join, nghĩ ít, kết quả nhanh, kích thích chơi liên tục như cờ.
2. Chiến dịch: tính toán, chi tiết, căng thẳng, mất nhiều thời gian.

WORKING.md đã ghi mâu thuẫn Claude vs ChatGPT: Claude nghiêng ngã 1; ChatGPT (chưa có file trong repo) nói bằng chứng *không* chứng minh nhóm thích ngắn đông hơn. Grok không phân xử tranh chấp đó bằng doanh thu. Grok phân xử bằng *lời người chơi nói về cảm giác cụt / bỏ dở*.

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

Lời chê "nông": review kiểu "quicker, less complicated Civilization for impatient people"; "over in 45 minutes". Đây là giọng *người đang so với Civ*, không phải giọng người đã chọn ván ngắn rồi thất vọng. [r/EnoughMuskSpam + Substack Karpf]

Bên trong cộng đồng Polytopia, than "cụt" ít hơn than "đừng bảo tôi đi chơi Civ". Thread 2020 "Please stop saying if you want complexity go play civ": người chơi muốn *thêm chiều sâu trong cùng khuôn 30 lượt* (mastery, tribe matchup, map), không muốn kéo dài thành campaign. Comment: "Polytopia has WAY more to it than meets the eye" / "hard to master". [r/Polytopia kheftj]

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

## 6. Giả thuyết nghiên cứu (không chốt)

1. **Hai ngã rẽ là hai sản phẩm.** Không phải hai độ khó của một game. Cộng đồng than khác loại ở mỗi ngã.
2. **GAP "cụt vs bỏ dở" không đối xứng.** Bỏ dở campaign là đa số và được chấp nhận. Cụt ở ván ngắn là lời của người đo nhầm thước, hoặc của game hết bài toán. Không suy ra "thị trường thích ngắn hơn". Suy ra: *nếu chọn ngã 1, đo replay và độ rõ của nước đi, đừng đo bằng fantasy đế chế*. *Nếu chọn ngã 2, chấp nhận đa số không xong ván và phải làm đầu game đáng chơi*.
3. **Lai dễ yếu hai nửa** nếu nhét hệ thống campaign vào ván 20 phút (Civ VII ages là case). Lai *có thể* được nếu lớp sâu nằm *giữa các ván* (meta đế / seed / xếp hạng) chứ không nằm trong một lượt.
4. **Thứ test trước vẫn là ván ngắn có răng** — khớp WORKING.md current hypothesis và luật 8 AGENTS.md (câu "có vui không" = spike). Grok không đòi kết luận thị trường trước spike.
5. **Giữ / nén owner input (góp ý nghiên cứu, bảng A.5 Claude):**
   - Giữ trong ván mặc định nếu chọn ngã 1: 4 kit đế khác nhau ở nước hợp lệ; đồn trú theo châu (sửa F1); ước lượng chữ; phá ước hiện trước khi bấm; một át chủ bài xuyên không / ván; lưu vong 1 lần.
   - Để lớp meta / campaign: thuế, hậu cần chi tiết, loại lính, hàng đợi dài, tướng 4 lớp đầy đủ, buôn vùng rìa, tình báo trễ nhiều tầng.
   - Không nhét vào tutorial.

---

## 7. Nguồn (rút)

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

## 8. GAP còn lại (không mở vòng 3)

- `_research/chatgpt.md` vẫn thiếu — WORKING.md đòi dán nguyên văn.
- Diễn đàn Việt (Vozer / Tinhte / group Tam Quốc mobile) không lấy được quote sạch ở lượt này; tựa Tam Quốc VN nói nhiều về pay-to-win / auto hơn là độ dài ván. Đừng suy từ slop quảng cáo.
- Câu "có vui không" vẫn chờ spike Claude, không chờ thêm báo cáo.
