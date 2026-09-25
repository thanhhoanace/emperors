# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*. Thay cho `HANDOFF.md` cũ.
> Mỗi phiên làm việc kết thúc bằng việc cập nhật file này (`.claude/skills/handoff/SKILL.md`). Viết ngắn, mới nhất ở trên.

**Cập nhật:** 2026-09-25 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Vòng 5 visual** + map toàn quốc: Claude (`0005`, `0006`, `proposal-all-china.md`).
- **Nhập engine** (kịch bản đã OK): `219.json` + đình chiến khách + cải cách + gates + **menu ngoại giao** (`docs/product/diplomacy.md`) + event `attack` đủ `from`/`to` cho hành quân (`docs/product/march.md`).

## Đã xong

- 2026-09-25 chiều: chủ dự án chốt `scenario.md` ổn. Khóa ngoại giao kiểu chọn điều khoản (không chỉ pact) và hành quân là phần nhìn.
- 2026-09-25 sáng: kịch bản thu 219, 20 châu, đế rìa, ADR 0007.

## Việc tiếp theo (theo thứ tự)

1. Nhập engine: snapshot 219 + diplomacy deals + guestTruce + reforms + gates. Cùng commit: `rules.md`, test, `npm run sim -- 500`.
2. Chế độ người chơi = 1 đế, 6 phe MOCK.
3. Claude: tướng đi đường theo event `attack` (`march.md`).
4. Persona thoại cho deal và cửa Trường An / Nghiệp / Hoài.

## Vấn đề đã biết

- Engine vẫn năm 200 / 14 châu. Sim cũ không dùng cho 219.
- `219.json` trên repo đang là bản rút; bảng châu đầy đủ nằm ở `scenario.md`.
- `proposal-all-china.md` mục 5 (Tần giữ Quan Trung) lệch kịch bản khóa.
