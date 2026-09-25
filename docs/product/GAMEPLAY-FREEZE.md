# GAMEPLAY FREEZE — 2026-09-26

> Khóa hướng. Không đổi trừ khi chủ dự án mở khóa.
> Chưa code. Thứ tự: Round A Perception → sim → Round A.5 statecraft → sim nhân quả → Round B Officers.

## Khóa

- A-hybrid: Tần/Vũ không có walkthrough Tam Quốc. Lý/Chu có prior *mẫu*, không phải tử vi.
- Truth ≠ Perception ≠ Presentation.
- Không bonus hard-code theo id châu.
- Không currency mới, không stack, không nhảy ô. 1 phe / 1 lệnh / lượt. Đánh ô kề.
- Một máy + một giá. Không chồng %.
- Đo đường thắng, không chỉ win%.

## Bốn máy (V1)

**Tần — Trưng.** `internal`: đổi `grain` + `loyalty` → `troops` nhanh hơn. Giá: `loyalty` tụt rõ, có thể revolt. Không +income riêng. Đất mới hữu dụng vì ép được bằng `internal`.

**Vũ — Viễn chinh.** `prepared = (last == null || last !== attack)`. Trận kế `commit` cao hơn *một lần* rồi hết. Sau trận `grain` tụt mạnh, `loyalty` tụt nhẹ. `diplomacy`×3 không chồng spike. Không +tầm, không +upkeep.

**Lý — Nhịp phủ.** Không spam `attack` → `upkeep` thấp. `attack` liên tiếp → upkeep về chuẩn. Không +FIELD, không +loyalty.

**Chu — Dựng lại.** Ô *disturbed* = `loyalty` dưới ngưỡng HOẶC vừa đổi chủ HOẶC vừa annex trung lập. `internal`/`fortify` trên ô đó → hồi `loyalty` + `fort` nhanh. Ô đã ổn ≈ 0 bonus. **Annex không tự buff** — chỉ đánh dấu disturbed; lượt sau mới sửa.

## Prior Lý/Chu

Mẫu: Ngô hay thừa cơ Kinh khi Quan bị ghim bắc.
Active khi đủ neo (predicate cửa đang có). Gãy 1 neo → obsolete.
`decide` chỉ +một bias cố định khi active.

## Cô lập kiến thức (bắt buộc)

Trong game:
- `decide(fid)` chỉ nhận `DecisionContext` đã chiếu. Cấm `g` đầy.
- Cấm đọc `factions[other].troops`, `type`, doctrine, persona, gates pack của phe khác.
- Cấm đọc prior Lý/Chu nếu fid là Tần/Vũ/Tam Quốc.
- RuntimeEvent = truth cho spectator. Không phải input AI.

Trong repo / agent:
- Claude: RuntimeEvent + `march.md` + hình. Không đọc để *sửa* `intel-rules`, `statecraft`, persona phe, `decide`.
- Grok: engine, perception, statecraft, gates, freeze này.
- Codex: review theo freeze. Không nhét máy vào visual.
- File thảo luận cũ (`intel.md`, `officers-longterm.md`, `perception.md`) = log. Freeze này thắng.

## Test bắt buộc Round A

Phản thực: hai ván quân Lý 20k/90k, Tào không kề / không lastSeen → cùng `DecisionContext` và cùng `decide`.
Đổi `time_displaced` ẩn, evidence giữ → `decide` không đổi.
