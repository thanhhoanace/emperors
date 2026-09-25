# Nguyên liệu để chạy được

Cảm giác "chưa đủ" đúng: **docs 219 đã dày, máy vẫn chạy năm 200**.

## Đang chạy hôm nay

`npm start` → engine + `data/world.json` năm 200, 14 châu, 7 phe, 5 hành động, MOCK, không tướng phụ.
`world.html` (Claude) đã vẽ 20 thủ phủ 219 nhưng **không nối** `resolveTurn`.

## Thiếu để *chơi* bản 219 — xếp theo chặn

### P0 — không có thì không có ván 219

1. `data/scenario/219.json` **đủ graph**: 20 châu (neighbors, fertility, population, defense, terrain, lonlat), 7 start, neutral garrison. Hiện là bản rút.
2. Engine đọc file đó (hoặc thay `world.json`) + test replay.
3. Một UI lượt: bấm 5 nút hoặc xem MOCK — `index.html` vẫn Phase 1.

Xong P0 = chơi được 219 **không** deal 8 điều, không cải cách, không đời 2. Đủ biết map đúng.

### P1 — đủ đúng kịch bản đã khóa

4. `guestTruce` 8 mùa.
5. Cải cách 3 tầng.
6. Gates predicate.
7. Menu deal (`diplomacy.md`).
8. Governor + `actor`/`defender` trên event (`characters.md`).
9. Thừa kế + chia đất.
10. Người chơi = 1 đế.
11. `npm run sim -- 500` đạt mốc cân bằng.

### P2 — clip đẹp, không chặn luật

12. Chỉ số tướng (`stats.md`) — có thể để sau P1.
13. Persona thoại cửa / deal.
14. Claude: tướng đi đường, portrait, bake Albers toàn quốc.

## Không thiếu (hay lầm là thiếu)

- 200 tướng TW3K, skill, đồ, duel.
- 30–35 châu có chủ.
- File startpos TW3K.
- District Civ6.

## Nguồn tướng đã dùng

Không crawl web, không đọc pack CA. Chỗ đứng = sử Kiến An 24 + lệch đã ghi trong `characters.md`.
Đủ cho 20 ô + 3 kế vị + 3 trung lập. Thiếu bio/tuổi/ảnh — P2.
