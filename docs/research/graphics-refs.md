# Đồ họa kiểu dat.city mà không crash điện thoại: Ryan Sael, spiderbench, frontier-games (28/9/2026)

> Câu hỏi của chủ dự án: Ryan Sael dựng đồ họa bằng kỹ thuật gì; dat.city là cái nhìn muốn đạt, nhưng dat.city nặng và điện thoại crash liên tục; đọc hai repo tham khảo (spiderbench, frontier-games) và tìm cách áp dụng.
> Nguồn gốc (tiếng Anh, có trích dẫn): [`datcity.md`](datcity.md) (mổ mã dat.city 25/9 và phép đo điện thoại 28/9, §10), [`ryan-sael.md`](ryan-sael.md) (15 trang sael.net và bài đăng X), [`frontier-games.md`](frontier-games.md). Phần spiderbench đọc trực tiếp ở đây.
> Công cụ đo: [`tools/phone-probe/`](../../tools/phone-probe/). Chạy bằng GPU phần mềm (SwiftShader): số bộ nhớ và lệnh vẽ là thật, thời gian khung thì không.

## Tóm tắt

1. **Ryan không dùng Blender, không dùng file mô hình.** "no everything just code, @threejs". Mọi thứ là hình khối dựng bằng code three.js, chạy Claude Code, và cho AI đọc các dự án cũ trên máy để giữ phong cách. Cái đẹp đến từ một công thức lặp lại ở mọi trang (mục 1), không từ tài nguyên.
2. **dat.city crash trên điện thoại vì bộ nhớ đồ họa phình dần.** Trên iPhone giả lập, GPU tăng từ 144 MB lên **868 MB** trong khoảng 2,5 phút khi thành phố dựng xong. **766 MB là texture**: mỗi quận nạp một ảnh "story atlas" (1280–1600 × 960–1280 điểm ảnh) lên GPU và không nhả. Cùng lúc đó là 1.187 lệnh vẽ và 3 triệu tam giác mỗi khung. Code không bắt sự kiện mất ngữ cảnh WebGL.
3. **Chính Ryan chỉ có một trang có nhánh riêng cho điện thoại:** airace.lol tắt toàn bộ hậu kỳ trên máy nhỏ ("no AO, blur or bloom passes on a battery"). Các trang còn lại chạy đủ chuỗi hậu kỳ trên điện thoại, chỉ giới hạn độ nét và tự hạ khi chậm.
4. **Demo Hoài Nam của mình đo cùng cách: khoảng 295 MB** trên điện thoại ngang (1688×780), không phình theo thời gian. Hai khoản lớn:
   - bản đồ bóng 4096² khoảng 100–120 MB;
   - khung hậu kỳ "lens" HalfFloat MSAA×4 khoảng 63 MB.
   Cả hai đều cắt được.
5. **spiderbench** chứng minh Claude có thể điều khiển Blender bằng script Python để làm mô hình có xương và động tác (file GLB ghi "Khronos glTF Blender I/O v5.2"). Nhưng đó là game AAA cho máy tính có card rời, và giấy phép cấm dùng thương mại. Chỉ học cách làm, không lấy code.
6. **frontier-games:** không có game đẹp nào chạy được trên điện thoại. Đáng học nhất:
   - **Voxel Musou**: Tam Quốc vô song, khoảng 300 lính nhân bản theo từng bộ phận cơ thể, 3 mức chi tiết, giấy phép **MIT** nên dùng lại được;
   - **Slide Rush**: có mức chất lượng thật cho điện thoại;
   - **Chrono City**: đẹp gần bằng dat.city, dựng hoàn toàn bằng code.

**Đề xuất:** giữ hướng dựng bằng code như Ryan, không cần Blender lúc này. Áp công thức của Ryan vào bản đồ và tượng lính. Đặt một **mức chất lượng cho điện thoại** với ngân sách cứng về bộ nhớ, lệnh vẽ và hậu kỳ (mục 6), học airace: điện thoại tắt hậu kỳ.

## 1. Ryan Sael làm thế nào

Đọc mã tĩnh 16 trang ([`ryan-sael.md`](ryan-sael.md) phần 1). Tám trang gần đây dùng chung một khuôn "ONE HTML LAB":

| Thành phần | Cách làm |
| --- | --- |
| Giao hàng | Một file HTML, một module ES viết liền, three.js r183 lấy từ CDN. Không build, không binary, không texture tải về |
| Hình khối | Hộp bo cạnh nhẹ (bevel 0,04–0,09, 2–4 đoạn) nên cạnh nào cũng bắt sáng. Gộp theo vật liệu: mỗi vật liệu 1 lệnh vẽ. Vật lặp lại dùng InstancedMesh. Biến thể lấy từ số ngẫu nhiên có hạt giống |
| Vật liệu | MeshStandard/Physical. Chèn shader bằng `onBeforeCompile`: **tới 10 "đèn giả"** (mảng uniform, chỉ khuếch tán, không đổ bóng) thay cho PointLight thật; tăng bão hòa theo từng vật liệu (1,10–1,26) |
| Ánh sáng | Đèn bán cầu thấp; một đèn nắng ấm với bóng mềm 2048 trong khung hẹp; đèn viền lạnh; môi trường sinh từ một quả cầu trời bằng code (không file HDR); ACES, phơi sáng 0,92–1,06 |
| Không khí | Sương mũ số mũ, sáng hơn nền một chút. Nền thường xanh đêm để vật phát sáng nổi |
| Camera | Tele, FOV 30–32 |
| Hậu kỳ | Đích HalfFloat có MSAA; GTAO nửa độ phân giải; bloom nửa độ phân giải, ngưỡng 1,0–1,7 (chỉ vật phát sáng); **độ sâu trường ảnh tự viết**: dải nét rộng max(3, 0,3 × khoảng cách), mờ gần và xa khác nhau, lấy mẫu xoắn ốc nửa độ phân giải. Đây là thứ làm cảnh trông như mô hình thu nhỏ |
| Tự hạ chất lượng | Độ nét = kẹp(min(DPR, 1,5, √(2,5 triệu / diện tích)), 0,75, 1,5). Đo khung mỗi 1,6 giây; chậm thì hạ lần lượt: độ nét −0,25 → tắt phản chiếu → tắt MSAA → tắt AO |
| Quy trình | Ảnh tham chiếu làm "đích thị giác", cho AI đọc thư mục các dự án cũ, nỗ lực tối đa. Có móc chụp khung theo thời gian cố định và bảng chỉnh thông số xuất JSON |

Ryan nói về điện thoại ([`ryan-sael.md`](ryan-sael.md) phần 2): tháng 7 viết dat.city "chạy mượt trên iPad và iPhone cũ". Tháng 9 có người báo Pixel 10 Pro XL ra "đốm trắng" rồi "cần thiết bị có WebGL", người khác hỏi "có phải Android đều crash". Ryan trả lời vẫn chạy tốt trên Safari, iPhone nhỏ. Các ảnh story atlas mang dấu phiên bản 10/7 và 20/7, tức có sau câu "mượt trên iPhone cũ". Đây là suy luận: nhiều khả năng dat.city nặng lên từ lúc thêm các ảnh đó.

## 2. Vì sao dat.city crash trên điện thoại

Đo bản chép dat.city (22 file JS, 65 quận, 64 story atlas) giả lập iPhone 390×844, DPR 3, cảm ứng. dat.city tự chọn mức "medium" (DPR 1, có bloom, không bóng, không DOF). Chi tiết: [`datcity.md`](datcity.md) §10.

| Giây | Bộ nhớ GPU | Trong đó texture | Lệnh vẽ | Tam giác/khung |
| --- | --- | --- | --- | --- |
| 11 | 144 MB | 42 MB | 331 | 0,2 triệu |
| 44 | 342 MB | 246 MB | 608 | 2,3 triệu |
| 78 | 523 MB | 426 MB | 809 | 2,8 triệu |
| 112 | 743 MB | 642 MB | 971 | 2,9 triệu |
| 146 trở đi | **868 MB** | **766 MB** | 1.183 | 3,0 triệu |

- **Texture là thủ phạm chính.** 64 ảnh chỉ 13 MB khi tải (webp), nhưng tổng 138,6 triệu điểm ảnh. Giải nén RGBA có mipmap là khoảng 700 MB. Tải nhẹ không có nghĩa là nhẹ trong bộ nhớ.
- **Không bỏ vật ngoài khung nhìn.** Cả thành phố gửi đi mỗi khung: 1.183 lệnh vẽ, 3 triệu tam giác. Trên điện thoại vừa tốn điện vừa nóng máy.
- **Mức cho cảm ứng chỉ là "medium".** Không có mức riêng cho điện thoại. Chỉ giảm nửa xe, chim, tàu; thành phố vẫn dựng đủ.
- **Hai ngữ cảnh WebGL lúc khởi động** (màn chờ và cảnh chính), và không bắt `webglcontextlost`. Khi hệ điều hành thu hồi bộ nhớ thì màn đen hoặc tab tải lại, không tự hồi.
- JS heap nhỏ (50–130 MB), không phải nguyên nhân.

## 3. Demo Hoài Nam của mình, đo cùng cách

Điện thoại ngang 844×390, DPR 3 (demo tự giới hạn 2, vùng vẽ 1688×780): khoảng 295 MB, ổn định theo thời gian.

| Khoản | MB | Cắt thế nào |
| --- | --- | --- |
| Bản đồ bóng 4096² (texture 64 MB, bộ đếm tính cả mipmap nên ghi 89) và độ sâu 32 MB | ~100–120 | 1024–2048 trên điện thoại, chỉ quanh tiêu điểm, vẽ nửa tốc độ (như dat.city): còn 6–25 MB |
| Khung "lens" MSAA×4: màu HalfFloat 42 MB + độ sâu 21 MB | ~63 | Điện thoại: bỏ lens (như airace) hoặc 1 lượt không MSAA ở độ nét 1: còn ~5–10 MB |
| Texture khác (địa hình nướng sẵn, khung lens đã giải) | ~57 | Giữ; không thêm ảnh lớn theo vùng |
| Vùng đệm hình học | ~45 | Giữ; bớt cây và tầng địa hình mịn trên điện thoại |
| Khung canvas | ~10 | — |

Máy tính (ADR 0005): 150–180 lệnh vẽ, 1,83–1,88 triệu tam giác. Tam giác cần giảm cho điện thoại, chủ yếu ở địa hình và cây.

## 4. spiderbench (đọc mã, giấy phép không cho dùng lại)

- **Claude + Blender bằng script:** người nhện 53 nghìn tam giác, 79 động tác; côn đồ 56 nghìn, 13 động tác; 45 xe; đồ vật. Tất cả xuất từ Blender. Script `tools/blender/*.py` không có trong repo, chỉ có GLB (3–10 MB mỗi file). Texture thành phố cũng nướng trong Blender.
- **Đám đông:** người dựng trong Blender, vẽ nhân bản, xương chạy trên GPU nhờ bảng động tác nướng thành texture (18 xương, 14 động tác, 3 mức chi tiết), màu áo theo từng bản. Đây là cách cho hàng nghìn lính biết đi và đánh mà không nặng.
- **Chuỗi hậu kỳ AAA:** TAA, GI/AO/phản chiếu trong màn hình, bóng nhiều tầng, mây thể tích, khoảng 9 khung vẽ phụ độ phân giải đầy đủ. Mức thấp nhất vẫn bật TAA và bóng 2 tầng. README khuyên dùng card rời. Không hợp điện thoại.
- **Bài học hiệu năng ghi trong code:**
  - BatchedMesh trên Chrome/ANGLE làm GPU đứng ~100 ms mỗi khung;
  - gộp hình lớn lúc dựng làm bộ nhớ đỉnh vọt, **crash tab**;
  - chia ô 512 m, bật/tắt từng ô;
  - vật nhỏ không đổ bóng ở tầng xa;
  - nạp ảnh có thử lại khi trình duyệt từ chối vì thiếu tài nguyên.

## 5. frontier-games

Chi tiết: [`frontier-games.md`](frontier-games.md).

- **Voxel Musou (MIT):**
  - lính Ngụy/Thục dựng từ khối, mỗi bộ phận là một InstancedMesh dùng chung;
  - khung xương nhỏ cho mỗi lính: gối gập, thân xoay, vũ khí theo tay;
  - mỗi khung chỉ gói lính trong tầm nhìn;
  - 3 mức chi tiết (khoảng 4,9k → 1,2k tam giác → hộp);
  - bóng lấy từ hộp đại diện;
  - biên dịch shader trước sau màn chờ;
  - chỉnh màu theo số đo từ ảnh concept.
  Hợp nhất với tượng lính trên bản đồ và cảnh trận của mình. Là three r186 dạng ES module: phải chuyển sang r146 script thường, ghi công theo MIT.
- **Slide Rush:**
  - DPR 0,85–1,5 tự đổi theo trung bình 60 khung;
  - điện thoại mặc định mức medium, **tắt bóng**;
  - bóng tròn dưới chân nhân vật;
  - hậu kỳ tắt mặc định.
  Không có giấy phép: chỉ học ý.
- **Overnight-builds (Chrono City, Tidewater):**
  - cách giữ bộ máy tự hạ chất lượng: tắt AO dưới 55 khung/giây, độ nét 0,72 dưới 47, MSAA 4→2→0 dưới 42;
  - quy trình "look": mỗi vòng AI chụp ảnh, đo khung/giây và lệnh vẽ, sửa "ba chỗ yếu nhất người xem thấy trước".
  Không giấy phép: chỉ học ý.
- **Sprout Quest:** Blender chạy ngầm dựng mô hình bằng code, chụp thành atlas webp cho game 2D chạy trên điện thoại. Cách rẻ nếu muốn tranh tướng đẹp.

## 6. Đề xuất cho Tam Quốc Loạn Nhập

**Cái nhìn (áp dụng ngay, không cần Blender):**

1. Tượng lính, thành, nhà: hộp bo cạnh nhẹ thay hộp vuông; gộp theo vật liệu; tượng lính nhân bản theo bộ phận như Voxel Musou.
2. Đèn giả trong shader cho lửa trại, đèn lồng, đuốc (không PointLight). Tăng bão hòa theo vật liệu. Sương theo khoảng cách. Camera tele.
3. Độ sâu trường ảnh kiểu Ryan (dải nét theo khoảng cách) và bloom chỉ cho vật phát sáng. **Chỉ trên máy tính.**
4. Ánh sáng môi trường sinh từ quả cầu trời bằng code; AO nướng sẵn hoặc giả trong shader.

**Mức điện thoại (ngân sách cứng, đo bằng `tools/phone-probe` trước khi báo xong):**

| Hạng mục | Điện thoại | Máy tính (ADR 0005) |
| --- | --- | --- |
| Bộ nhớ GPU | ≤ 200 MB, **không tăng theo thời gian chơi** | ≤ 150 MB vùng đệm |
| Texture | ≤ 64 MB tổng; ảnh lớn nạp khi cần, nhả khi rời (giới hạn cứng, bỏ ảnh cũ nhất) | — |
| Lệnh vẽ | ≤ 250 | ≤ 400 |
| Tam giác/khung | ≤ 0,8 triệu | ≤ 1,5 triệu toàn cảnh |
| Độ nét | 1–1,5, tự hạ tới 0,75 theo khung/giây **tuyệt đối** (Ryan hạ theo tương đối nên máy chậm từ đầu không bao giờ hạ) | ≤ 1,5 |
| Bóng | 1024–2048, quanh tiêu điểm, nửa tốc độ; lính dùng bóng tròn | 4096 |
| Hậu kỳ | Tắt, hoặc một lượt gộp bloom nhẹ + vignette, không MSAA HalfFloat | Lens đầy đủ |

**Giữ bộ nhớ không phình:** một ngữ cảnh WebGL; bắt `webglcontextlost`/`restored` và dựng lại; `dispose()` khi rời vùng; dựng chia lát (≤ 5 ms/khung) và không gộp hình lớn một lượt; biên dịch shader sau màn chờ.

**Blender:** chưa cần. Ryan đạt cái nhìn đó hoàn toàn bằng code. Khi cần tướng hay ngựa điêu khắc kỹ, Claude có thể điều khiển Blender bằng script (như spiderbench) để xuất GLB nhỏ hoặc chụp thành atlas (như Sprout Quest). Mỗi mô hình phải nằm trong ngân sách trên.

**Bước tiếp theo đề xuất (chờ chủ dự án duyệt vì đổi hướng hình):** một lát "Hoài Nam mức điện thoại".
- Áp công thức mục 1 cho tượng lính và thành.
- Hạ bóng và lens trên điện thoại, thêm bắt mất ngữ cảnh.
- Đo `tools/phone-probe` trên giả lập, rồi thử trên một iPhone và một Android tầm trung (khung/giây, nóng máy sau 15 phút).
