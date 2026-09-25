# Tướng — khung dài hạn

> Chưa wire engine. V1 vẫn: mặt đứng ô + `actorChar` / `defenderChar`.
> Đây là phase sau: 5 trục kiểu TW3K, nâng/xuống, khắc chế, affinity theo 7 phe.
> Không copy bảng số / skill / ảnh TW3K. Lấy *cấu trúc* 5 trục + tên sử công khai.

## Vì sao 5 trục, không 3

3 số (Võ/Trí/Chính) đủ V1. Dài hạn cần 5 để:
- công thành ≠ đánh đồng
- giữ tướng ≠ giữ thành
- chiêu tướng ≠ chiêu quân
- chết tướng mất một *cấu hình* đã nâng, không chỉ mất +8% công

Map 5 trục TW3K → việc trên bàn 20 châu (không có battle realtime):

| Trục TW3K | Làm gì ở đây |
| --- | --- |
| Instinct (Dũng) | `attackOf` |
| Expertise (Nghề / thủ) | `defenseOf` + `fortify` |
| Cunning (Mưu) | `stratagem`, hạ `fort` khi công thành, annex, đồn |
| Resolve (Chí) | Lòng ô, chống nổi dậy, “cứu rỗi” khi thua |
| Authority (Uy) | Giữ tướng không phản, chiêu tướng, pact |

Mỗi tướng một **hệ** (một trục là chủ). Đó là class: Vanguard / Sentinel / Strategist / Champion / Commander — chỉ để *chọn việc*, không để 5 skill tree.

Khoảng số: 20–100, mở ~35–65. Không dùng 1–5 khi vào phase này (quá thô để nâng/xuống).

## Scale — lên

Không XP giết quái. Lên vì *việc đúng hệ*:

| Việc | Ai lên |
| --- | --- |
| Thắng đánh / công thành | Instinct hoặc Expertise (thủ) |
| Mưu / annex / hạ lũy | Cunning |
| Đứng ô 4 mùa, lòng không tụt | Resolve + Authority |
| Đứng trong đai nhớ đế *khớp affinity* | +nhanh hơn |
| Cải cách tầng 2–3 của đế chủ | +trục khớp (Tần→Expertise, Lý→Instinct, Vũ→Resolve, Chu→Cunning) |

Trần: +1–2 đểm / mùa thành công. Trần cứng ~80. Không nông dân lên 100.

## Scale — xuống

| Việc | Xuống |
| --- | --- |
| Thua đánh / mất ô đang đứng | Instinct / Authority |
| Đứng sai hệ 4+ mùa (Strategist đi đánh đồng) | Trục chủ không lên, trục phụ −1 |
| Chủ Uy thấp / không có ô cho đủ tướng | Authority, nguy cơ phản |
| Affinity âm với chủ hiện tại | Mọi lần lên bị cắt |
| Chết đời 1 Tam Quốc (kế vị) | Tướng cũ giữ số; lòng ô − |

Xuống chậm hơn lên. Không reset về 35 mỗi thua.

## Khắc chế (để chết có lý)

Không cần ngũ hành đầy đủ. 3 quan hệ đủ V2:

1. **Mưu ăn Dũng** — Cunning công vs Instinct thủ: hạ `fort` / đồn / chiêu. Lã Mông vs Quan Vũ.
2. **Dũng ăn Chí** — Instinct công vs Resolve thủ ở đồng / ô không thành cao. Trương Liêu vs chúa Hoài mới.
3. **Thủ ăn Dũng** — Expertise + `fort` vs Instinct khi thành ≥ 2. Tào Nhân ở Phàn.

Uy không đánh. Uy *giữ người*: thua vẫn ở lại. Uy thấp + affinity âm → phản hoặc sang phe kề.

Chết khi:
- Mất ô đang đứng *và* Resolve + cứu rỗi thất bại (số trần, không script).
- Tag `kiêu` / `bất_phục` tăng xác suất chết hoặc phản đúng tình huống (Kinh + Ngô nhìn).

Mất tướng = mất 5 số đã nâng + affinity + mặt event. Reserve vào ô đó ở mức mở (~40), không kế thừa XP. Đó là giá.

## Affinity — buff / nerf theo 7 phe

Mỗi tướng một vector 7 số, −2 … +2 (mở 0 nếu không ghi).

`hiệu = hệ số trục × (1 + 0.15 × affinity[chủ])`

Ý:

- Tướng Tam Quốc: +2 chủ cũ, −1 địch sử, 0 với đế trừ khi *khớp đai / khớp hệ*.
- Tướng rìa (không nổi 3Q): +2 đế *khớp vùng hoặc hệ*, −1 Tào (triều đình nuốt biên), 0–+1 đế khác.

Ví dụ — tướng Lũng Tây không có tên lớn năm 219:

| | Tào | Thục | Ngô | Tần | Lý | Vũ | Chu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chúa Lũng (Sentinel, Expertise) | −1 | 0 | 0 | +2 | +1 | 0 | 0 |

Gặp Tần / đứng `longxi`: lên nhanh, thành khó mất.
Gặp Tào: Authority thấp, dễ bị coi là tùy tướng biên — chiêu được nhưng dùng kém, dễ phản về Tần nếu Tần kề.
Gặp Lý: +1 (cùng phía tây-bắc, phủ binh hiểu ải).

Đáy là lý do *tuyển* không phải max Dũng:
Lã Mông +2 Ngô, 0 Tần → Tần chiêu được vẫn tồi. Chúa Lũng +2 Tần → rẻ và mạnh hơn Lã Mông *ở Quan*.

Gặp đế không tự bật `knownIdentity`. Affinity là *hợp cách đánh / trị*, không phải “biết ông này từ tương lai”.

## Roster: lấy ai, đẻ ai

**Lấy tên sử / TW3K công khai** (mặt event đã cần): Quan Vũ, Tào Nhân, Lã Mông, Trương Liêu, Trương Hợp, Ngụy Diên, Tào Phi, Lưu Thiện, Tôn Đăng, Sĩ Nhiếp, Công Tôn Khang, Ung Khải…
Số 5 trục *tự thiết kế* theo vai 219, không dán bảng TW3K.

**Đẻ thêm** đúng rìa — 1 mặt / ô đế + 1 dự trữ:

| Ô | Mặt mở (hướng) | Hệ | Affinity chính |
| --- | --- | --- | --- |
| `longxi` | Chúa ải Lũng (tên sử nhỏ / đặt) | Expertise | Tần +2, Lý +1, Tào −1 |
| `bing` | Tướng Tấn Dương | Instinct | Lý +2, Tào −1 |
| `hexi` | Đồn điền Cô Tang | Resolve | Vũ +2, Tần +1 |
| `huai` | Tướng Chung Ly | Cunning | Chu +2, Ngô +1, Tào −1 |

Không đẻ 200 tướng. Trần ~24–30 mặt (20 ô + reserve đời 2 + 4 rìa).

## Chiêu — vì sao affinity cần

Cùng 1 lệnh ngoại giao:

- Chiêu quân = lương → lính (đã có).
- Chiêu tướng = Uy + lương, chance `0.3 + 0.1×(Authority_chủ + affinity)`.

Affinity +2: rẻ, ở lại, lên nhanh.
Affinity −1: vẫn chiêu được nếu Uy cao — dùng kém, dễ đi.

Đế không cần trộm Quan Vũ. Tần cần chúa Lũng. Lý cần Tấn Dương + Công Tôn. Đó là tuyển.

## Thứ tự làm dần

1. Schema tướng: 5 trục + hệ + tag + `affinity{}` + ô đứng. File `data/scenario/officers.json`.
2. Số *do mình đặt* cho roster đang có + 4 mặt rìa. Mô tả 1 câu / người (vai 219), không copy bio TW3K.
3. V1.5: chỉ nhân `attackOf` / `defenseOf` từ Instinct / Expertise. Chưa XP.
4. V2: lên/xuống + 3 khắc chế + chance chết khi mất ô.
5. V2.5: affinity vào chance chiêu + HUD “hợp với Tần / kỵ Tào”.

Không làm cùng lúc cây skill, vàng, 5 class battle, 200 tướng.
