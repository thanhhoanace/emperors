# AGENTS.md — Tam Quốc Loạn Nhập

> Nguồn sự thật cho mọi agent. Codex đọc file này trực tiếp; Claude Code đọc qua `CLAUDE.md`.
> Gameplay đã khóa: `docs/product/GAMEPLAY-FREEZE.md`. Thảo luận cũ không thắng freeze.

## Dự án

Mô phỏng theo lượt: 4 hoàng đế xuyên không tranh thiên hạ với Tào Tháo, Lưu Bị, Tôn Quyền. **Kịch bản khóa: thu 219**. Engine: 20 châu, `data/world.json`.
Trọng tâm: xem và quay clip Three.js. GitHub Pages.

## Phân vai

Chi tiết + cô lập kiến thức: `docs/product/lanes.md`.

| Luồng | Được sửa | Cấm |
| --- | --- | --- |
| **Claude — hình** | `src/world/**`, `game.html`, design, bake, `cities.json`, `lonlat` | `src/engine/**`, scenario, freeze nội dung máy, `data/scenario/**`, personas |
| **Grok — luật** | freeze, scenario, rules, `data/scenario/**`, `src/engine/**`, test engine/sim, personas | `src/world/**`, bake, `cities.json` |

`decide(fid)` trong engine chỉ nhận DecisionContext của đúng phe. Không đọc doctrine / persona / prior phe khác.

## Một sự thật, một chỗ

| Câu hỏi | Nguồn |
| --- | --- |
| Gameplay đã khóa | `docs/product/GAMEPLAY-FREEZE.md` |
| Kịch bản 219 | `docs/product/scenario.md` |
| RuntimeEvent | `docs/product/runtime-event.md` |
| Perception / DecisionContext | `docs/product/perception.md` |
| Hộp cát AI trong game | `docs/product/agent-sandbox.md` |
| Phân vai / cô lập | `docs/product/lanes.md` |
| Số đang chạy | `data/world.json` |
| Đang ở đâu | `docs/status.md` |
| Câu hỏi lớn đang mở (phase) | `docs/phases/<phase>/WORKING.md` |
| Quyết định của một phase | `docs/phases/<phase>/DECISION.md` |

## Research và quyết định lớn (phase)

Áp dụng cho mọi tool: Claude, Codex, Grok, ChatGPT, người. **Research dài bao nhiêu cũng được. Bộ nhớ chung phải gọn. Quyết định phải bền.**

Mở phase khi có câu hỏi lớn chưa chốt mà nhiều tool cùng nghĩ (đổi hướng gameplay, kiến trúc, visual). Việc nhỏ, sửa lỗi, thí nghiệm tạm: không mở phase.

```
docs/phases/<phase>/
├── WORKING.md     chúng ta đang tin gì      2–5 màn hình, chỉ lượt synthesis sửa
├── DECISION.md    chúng ta đã quyết gì      1–2 màn hình, chỉ khi chủ dự án chốt
└── _research/     mỗi tool tìm ra gì        inbox, không giới hạn độ dài
    ├── claude.md  chatgpt.md  grok.md  codex.md
```

Luật:

1. Mỗi tool **tối đa một file** `_research/<tool>.md` cho một phase. Chạy lại thì sửa hoặc ghi đè chính file đó. Không `-v2`, `-final`, `-review` trong tên file; Git giữ lịch sử.
2. `_research/` là inbox, không phải sự thật. Code không đọc `_research/`.
3. Không tool nào sửa `WORKING.md` trong lúc research. Một lượt synthesis duy nhất cập nhật nó.
4. Tool vừa research không làm synthesis nếu tool khác làm được; xoay vòng giữa các phase.
5. Chỉ thêm một tool khi nó giảm được bất định (cảm nhận cộng đồng → Grok/ChatGPT; thiết kế hệ thống → Claude).
6. Tối đa 2 vòng research + 1 synthesis + 1 quyết định. Muốn thêm vòng phải ghi lý do trong `WORKING.md`.
7. `DECISION.md` nói *vì sao*; luật đã chốt vẫn chép vào SOT (`GAMEPLAY-FREEZE.md`, `rules.md`, `design/direction.md`…). `DECISION.md` thay ADR cho quyết định của phase; `docs/decisions/` cho quyết định ngoài phase.
8. Câu hỏi "có vui không?" trả lời bằng spike (prototype nhỏ), không bằng báo cáo; kết quả ghi vào `WORKING.md`.
9. Tool không commit được (ChatGPT…): dán **nguyên văn** output vào `_research/<tool>.md`, ghi ngày và câu hỏi ở đầu file.

Vòng đời: EXPLORE (`_research/`) → MERGE (`WORKING.md`) → CHALLENGE (chỉ research GAP) → COMPACT (viết lại `WORKING.md`) → DECIDE (chủ dự án) → FREEZE (`DECISION.md` + SOT) → BUILD (đọc `DECISION.md` + SOT + code). Implementation không mở lại research trừ khi lộ giả định sai; khi đó ghi vào `WORKING.md`.

Lệnh cho lượt synthesis (dán nguyên):

```
You are not another researcher. Compress docs/phases/<phase>/_research/*.md into
docs/phases/<phase>/WORKING.md. Preserve: supported findings, disagreements between
tools, uncertainty, open questions, the owner's stated inputs. Remove: duplicated
explanations, rhetoric, outdated hypotheses. Do NOT resolve disagreements without
evidence. Keep it to 2–5 screens. Link the research file and section for every
non-obvious claim.
```

Khung `WORKING.md`: Problem · Owner inputs · Evidence we trust · Contradictions (tool nào nói gì) · Current hypothesis · Open questions · Next research (tool nào, GAP nào).
Khung `DECISION.md`: Decision · Why · Rejected · Preserve / Defer · Assumptions that matter · Revisit when · Written into (SOT nào).

Phase đang mở: `docs/phases/README.md`.

## Lệnh

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm test
npm run sim -- 500
npm start
```

Engine thuần: không DOM, không Math.random. Đổi luật: engine + test + rules cùng commit.
