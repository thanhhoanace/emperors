# Phase: research → working → decision

> Rule chung cho mọi tool (Claude, Codex, Grok, ChatGPT, người). `AGENTS.md` dẫn tới đây.
> Một câu: **Let research be verbose. Let shared memory be compact. Let decisions be durable.**

## Khi nào mở một phase

Khi có một câu hỏi lớn chưa chốt mà nhiều tool cùng nghĩ (đổi hướng gameplay, đổi kiến trúc, đổi visual). Việc nhỏ, sửa lỗi, thí nghiệm tạm thì không mở phase.

## Cấu trúc

```
docs/phases/<phase>/
├── WORKING.md        ← chúng ta đang tin gì (shared memory, gọn)
├── DECISION.md       ← chúng ta đã quyết gì (chỉ có khi chủ dự án chốt)
└── _research/        ← mỗi tool tìm ra gì (inbox, dài bao nhiêu cũng được)
    ├── claude.md
    ├── chatgpt.md
    └── grok.md
```

| File | Trả lời câu | Độ dài | Ai sửa |
| --- | --- | --- | --- |
| `_research/<tool>.md` | Tool này tìm ra gì? | Không giới hạn. Giữ nguồn, giới hạn dữ liệu, mâu thuẫn, lý lẽ | Chỉ tool đó |
| `WORKING.md` | Hiện chúng ta tin gì? | 2–5 màn hình | Tool đang làm synthesis |
| `DECISION.md` | Đã quyết gì, vì sao, bỏ gì, khi nào xét lại? | 1–2 màn hình | Viết khi chủ dự án chốt |

## Luật

1. **Mỗi tool tối đa một file research cho một phase.** Chạy lại thì sửa hoặc ghi đè chính file đó. Không `-v2`, `-final`, `-review` trong tên file; Git đã giữ lịch sử.
2. **`_research/` là inbox, không phải knowledge base.** Không ai coi nó là sự thật. Khi đã synthesis xong, nó chỉ còn để tra nguồn.
3. **Không tool nào sửa trực tiếp `WORKING.md` trong lúc research.** Research vào file của mình; một lượt synthesis duy nhất cập nhật `WORKING.md`.
4. **Không tự coi research của mình là sự thật.** Tool vừa research thì không làm synthesis nếu còn tool khác làm được; xoay vòng giữa các phase.
5. **Không dùng nhiều tool chỉ vì có nhiều tool.** Chỉ thêm một góc nhìn khi nó giảm được bất định (ví dụ: cảm nhận cộng đồng → Grok/ChatGPT; thiết kế hệ thống → Claude).
6. **Giới hạn vòng:** tối đa 2 vòng research + 1 synthesis + 1 quyết định. Muốn thêm vòng phải ghi lý do trong `WORKING.md`.
7. **`DECISION.md` nói *vì sao*, file SOT nói *cái gì*.** Luật đã chốt vẫn được ghi vào SOT hiện có (`GAMEPLAY-FREEZE.md`, `rules.md`, `design/direction.md`…). `DECISION.md` là bản ghi quyết định của phase, thay cho một ADR riêng; ADR trong `docs/decisions/` dành cho quyết định ngoài phase.
8. **Spike thay cho tài liệu khi có thể.** Câu hỏi "có vui không?" trả lời bằng prototype nhỏ; kết quả ghi vào `WORKING.md`, không viết thêm báo cáo.

## Vòng đời

```
1. EXPLORE    tool nào cần research thì ghi _research/<tool>.md
2. MERGE      một tool đọc tất cả, cập nhật WORKING.md
3. CHALLENGE  các tool đọc WORKING.md, chỉ research GAP quan trọng, sửa file research của mình
4. COMPACT    viết lại WORKING.md, bỏ phát hiện cũ hoặc trùng
5. DECIDE     chủ dự án chốt
6. FREEZE     viết DECISION.md; chép luật đã chốt vào SOT
7. BUILD      agent code đọc DECISION.md + SOT + codebase
```

Implementation không mở lại research, trừ khi nó làm lộ một giả định sai; khi đó ghi giả định đó vào `WORKING.md` của phase (hoặc mở phase mới).

## Lệnh cho lượt synthesis

Dán nguyên cho tool làm synthesis:

```
You are not another researcher. Your job is to compress the current evidence
from docs/phases/<phase>/_research/*.md into docs/phases/<phase>/WORKING.md.

Preserve: supported findings, disagreements between tools, uncertainty, open questions,
the owner's stated inputs.
Remove: duplicated explanations, rhetoric, outdated hypotheses.
Do NOT resolve disagreements without evidence. Keep WORKING.md to 2–5 screens.
Link to the research file and section for every non-obvious claim.
```

## Khung `WORKING.md`

```
# <Phase> — Working state
> Cập nhật: <ngày> · synthesis bởi <tool> · nguồn: _research/<các file>

## Problem
## Owner inputs            (chủ dự án đã nói gì, nguyên ý)
## Evidence we trust
## Contradictions          (ghi rõ tool nào nói gì)
## Current hypothesis
## Open questions
## Next research           (tool nào, câu hỏi GAP nào)
```

## Khung `DECISION.md`

```
# <Phase> — Decision
> Chốt: <ngày> bởi chủ dự án · thay cho: <quyết định cũ nếu có>

## Decision
## Why
## Rejected                (và vì sao)
## Preserve / Defer
## Assumptions that matter
## Revisit when
## Written into            (SOT nào đã cập nhật)
```

## ChatGPT và tool ngoài repo

Tool không commit được thì chủ dự án (hoặc agent trong repo) dán nguyên output vào `_research/<tool>.md`, ghi ngày và câu hỏi đã hỏi ở đầu file. Không tóm tắt lại khi dán.

## Phase đang mở

| Phase | Câu hỏi | Trạng thái |
| --- | --- | --- |
| [`v2-gameplay`](v2-gameplay/WORKING.md) | Gameplay v2: vào là chơi hay chiến dịch sâu, và giữ chiều sâu nào | CHALLENGE — chờ research của ChatGPT/Grok, rồi chủ dự án chốt |
