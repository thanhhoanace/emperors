> Tool: ChatGPT · Phase: `v2-gameplay`
> Ngày research: 2026-09-28 · Ngày đưa vào repo: 2026-09-28
> Nguồn: `emperors-v2-market-direction-2026-09-28.md`; nội dung báo cáo bên dưới được giữ nguyên văn.
> Trạng thái: research inbox; chưa phải quyết định hoặc luật đã khóa.

> Bổ sung mới nhất: **[B. Market audit sau spike 2](#b-market-audit-sau-spike-2--28092026)**. Báo cáo nhập ban đầu bên dưới được giữ nguyên; các điểm cần sửa hoặc thu hẹp được nêu trong B9.

Câu hỏi của chủ dự án (nguyên văn):

> ở v2 đứng trước 2 ngã rẽ. 1 giữ game đơn giản. chơi kiểu join là chơi, k phải suy nghĩ nhiều, có kết quả nhanh, kích thích chơi liên tục như chơi cờ
> cách 2 là chiến dịch, tính toán, chi tiết, căng thẳng, mất nhiều thời gian
> với e đâu là cách hấp dẫn hơn
> research về nhu cầu game của người chơi thực tế và mong muốn của họ là gì
> ý tưởng game ban đầu của a hình thành từ game loạn 12 sứ quân cũ + các trend về xuyên không
> với vai trò chuyên gia phân tích thị trường game, phân tích cho a

---

# Emperors V2 — lựa chọn hướng sản phẩm từ nhu cầu người chơi

Ngày nghiên cứu: 28/09/2026, Asia/Saigon.  
Trạng thái: khuyến nghị để chủ dự án quyết định; chưa thay thế interview, freeze hay roadmap đã duyệt.

## Khuyến nghị

Chọn hướng 1 làm sản phẩm chính của V2: **game tranh bá theo ván, vào chơi nhanh, khoảng 20–30 phút, quyết định có chiều sâu và mang bản sắc xuyên không**. Thời lượng là giả thuyết thiết kế cần đo; không phải con số tối ưu đã được thị trường chứng minh.

Hướng 2 có thị trường thật và có thể tạo gắn bó mạnh. Tuy nhiên, với Emperors đang cần kiểm chứng vòng chơi, hướng 1 tạo ra một lời hứa dễ thử hơn: người chơi có thể hoàn thành một cuộc tranh bá, thấy kết quả những quyết định của mình và thử cách chơi khác trong phiên sau.

Không nên triển khai đồng thời hai sản phẩm hoàn chỉnh ở V2. Game chiến dịch cần nhịp phát triển, điều kiện thắng, AI, lưu ván và lượng nội dung khác với game theo ván. Giảm số lượt của một chiến dịch không tự tạo ra trải nghiệm ngắn hấp dẫn.

“Dễ bắt đầu”, “ván ngắn”, “ít tính toán” là ba biến độc lập. Ví dụ chơi cờ mà anh đưa ra gợi ý ưu tiên ít luật phải học, thao tác rõ và nhiều cách xử lý thế cờ. Nếu giảm cả nhu cầu suy nghĩ lẫn ảnh hưởng của quyết định, game có thể lại trở thành trải nghiệm xem mô phỏng — đúng vấn đề anh từng phản hồi.

## 1. Phạm vi và chất lượng bằng chứng

Nghiên cứu này sử dụng:

- Bản review interview V2 ngày 27/09/2026 hiện có, cùng các trao đổi anh cung cấp trong lượt này.
- Khảo sát động cơ chơi; thông báo số bán của nhà phát triển/nhà phát hành; mô tả sản phẩm chính thức; điểm đánh giá hiển thị trên Steam.
- Hai thảo luận cộng đồng đọc trực tiếp: Thronefall trên Reddit và 9 Kings trên Steam. Đây là mẫu định tính có chủ đích rất nhỏ, có cả ý kiến trái chiều, không phải phân tích đại diện toàn bộ review.
- Dữ liệu giải trí ngắn ở Đông Nam Á để đánh giá giả thuyết thu hút bằng nội dung xuyên không, không dùng thay dữ liệu nhu cầu game.

Không thực hiện khảo sát người chơi Emperors mới, không chạy thử các game đối chiếu trong lượt này, không lấy code mới hay tái kiểm thử engine. Trạng thái dự án được hiểu theo bản review đã đọc, không phải xác nhận HEAD ngày hôm nay.

Số bán là mốc lịch sử được công bố; điểm review là ảnh chụp kết quả truy xuất ngày nghiên cứu và có thể đổi. Các game khác nhau về nền tảng, ngân sách, thương hiệu, giá và thời gian phát hành. Không dùng số bán để tính xác suất Emperors thành công.

Chưa tìm được khảo sát công khai, đại diện, hỏi riêng người Việt quan tâm game lịch sử/xuyên không rằng họ chọn ván nhanh hay chiến dịch. Gamota có báo cáo 2026 nhưng trang công khai chỉ giới thiệu phạm vi và yêu cầu đăng ký nhận bản đầy đủ; nghiên cứu này không sử dụng nội dung chưa đọc [S12].

## 2. Những tín hiệu thị trường có thể dùng

| Bằng chứng | Điều được quan sát | Hàm ý để thử với Emperors |
|---|---|---|
| ESA Essential Facts 2025 [S01] | Trong người chơi trưởng thành tại Mỹ, 68% chọn giết thời gian/thư giãn, 62% chọn vui và 35% chọn giữ đầu óc linh hoạt. | Có nhu cầu giải trí nhẹ đầu lẫn suy nghĩ. Khảo sát không trực tiếp đo sở thích độ dài ván; không áp tỷ lệ này sang Việt Nam. |
| Quantic Foundry, phân tích 2015–2024 [S02] | Mẫu tự nguyện 1,57 triệu người cho thấy động lực suy tính/lập kế hoạch dài hạn giảm so với chuẩn ban đầu. Mẫu thiên về PC/console phương Tây và loại Trung Quốc. | Cần chú ý chi phí học và lượng thông tin phải giữ trong đầu. Đây không phải bằng chứng doanh thu game chiến thuật giảm hay 67% người chơi bỏ chiến thuật. |
| 9 Kings [S04, S05] | Game xây vương quốc roguelike nhịp nhanh; nhà phát triển công bố vượt một triệu bản trong tháng 5/2026. | Có thị trường trả tiền cho chiến lược cô đọng và thử nhiều tổ hợp. Chưa chứng minh mô hình web Việt Nam hoặc số phút cụ thể. |
| Thronefall [S03] | Định vị xây/phòng thủ vương quốc tối giản; trang Steam truy xuất hiển thị 95% tích cực trong 11.064 review tiếng Anh. | Giảm thao tác quản lý có thể đi cùng trải nghiệm được yêu thích. Điểm review phản ánh người đã chọn sản phẩm, không phải toàn bộ thị trường. |
| Crusader Kings III [S06] | Paradox công bố bốn triệu bản đa nền tảng ngày 23/04/2025; sản phẩm kết hợp chiến lược với câu chuyện nhân vật. | Hướng chiến dịch có sức mua thật. Một thương hiệu lớn với nhiều năm phát triển không phải dự báo doanh số cho game mới. |
| Polytopia [S07] | Weekly Challenges ra mắt 09/06/2025 dùng cùng thế giới khởi đầu cho người chơi và giới hạn 20 lượt; ván thường giữ nguyên. | Có thể tạo chơi lại bằng tối ưu quyết định trên luật gọn. Đây là ví dụ thiết kế, chưa phải bằng chứng tính năng làm tăng retention. |
| Reigns: Three Kingdoms [S08] | Quyết định bằng vuốt, bối cảnh Tam Quốc; Steam truy xuất có 52% tích cực trong 337 review toàn bộ. | Chủ đề quen thuộc và thao tác dễ không tự bảo đảm được yêu thích. Không quy nguyên nhân điểm thấp cho một cơ chế khi chưa có phân tích đủ. |

Không so trực tiếp phần trăm review tiếng Anh của Thronefall với toàn bộ review của Reigns như một thí nghiệm. Chúng chỉ giúp xác nhận có cả sản phẩm được đón nhận và sản phẩm nhận phản hồi phân hóa trong vùng thiết kế liên quan.

## 3. Người chơi thực tế đang yêu cầu điều gì?

Trong thảo luận Thronefall, người hỏi muốn một game dễ mở lên chơi vài ván và ngại quản lý vi mô; người trả lời đánh giá cao điều khiển đơn giản và thử thách vẫn tồn tại [S09].

Trong thảo luận 9 Kings tháng 6/2025, một người lo các ván và các vua thiếu khác biệt. Những người khác phản đối, nêu các cách xây và đặc điểm vua khác nhau [S10]. Vì là phản hồi ở thời điểm Early Access, không coi đây là kết luận về phiên bản hiện hành. Tín hiệu hữu ích là người chơi đánh giá sự đa dạng bằng trải nghiệm và lựa chọn thực sự thay đổi, không chỉ bằng số lượng nội dung.

Từ bằng chứng và bối cảnh dự án, các nhu cầu dưới đây là **giả thuyết cần kiểm chứng với người chơi mục tiêu**, không phải tỷ lệ thị trường đã đo:

| Nhu cầu | Biểu hiện trong trải nghiệm | Điều dễ gây bỏ cuộc |
|---|---|---|
| Hiểu được mình đang làm gì | Vào là biết vai trò, nguy cơ trước mắt và việc có thể làm | Đọc quá nhiều luật trước quyết định đầu |
| Có quyền quyết định | Lựa chọn làm thay đổi địa bàn, con người và phản ứng đối thủ | Hành động xong chỉ thấy log; thắng thua không liên hệ với lựa chọn |
| Cảm thấy mình chơi giỏi hơn | Biết ván sau nên đổi gì | Thua do thông tin bất ngờ không có cách chuẩn bị |
| Thử một cách làm mới | Đổi đế hoặc chiến lược tạo thế cờ khác | Một công thức thắng áp dụng cho mọi vai |
| Nhập vai và tạo câu chuyện | Có người nhớ ơn, phản bội, mặc cả; sự kiện có hậu quả | Thẻ sự kiện chỉ đổi vài số và biến mất |
| Kiểm soát thời gian của mình | Biết sắp kết thúc; có lưu và tiếp tục | Bị kéo qua các thao tác không còn ý nghĩa |

Hai nhóm có thể thích cùng một ý tưởng xuyên không nhưng đòi hỏi trải nghiệm khác. Một nhóm muốn “tối nay thử làm hoàng đế một ván”; nhóm khác muốn “gây dựng triều đại của mình qua nhiều buổi”. Cần chọn nhóm đầu tiên phục vụ thay vì lấy trung bình nhu cầu hai nhóm.

## 4. Loạn 12 Sứ Quân và xuyên không: giữ phần hấp dẫn nào?

### Cần xác định đúng game gốc

Tìm kiếm trả về nhiều sản phẩm cùng hoặc gần tên. Một bài lưu trữ năm 2014 mô tả bản Java của Micro Game là xếp ba biểu tượng để đánh, lấy tài nguyên và tăng cấp [S13]. Đây là nguồn thứ cấp cũ; chưa xác nhận đó là bản anh từng chơi. Cần một ảnh hoặc link từ anh trước khi lấy luật game cũ làm tài liệu chuẩn.

Điểm có thể phân tích ngay từ chính mô tả của anh là sự kết hợp giữa **cảm giác tranh bá quen thuộc** và **tình huống nhân vật lịch sử xuất hiện khác thời đại**. Hoài niệm là một lối tiếp cận người chơi đầu tiên; người chưa chơi game cũ vẫn phải hiểu Emperors bằng chính trải nghiệm của nó.

### Tín hiệu về giải trí ngắn hỗ trợ đến đâu?

Sensor Tower, báo cáo tháng 6/2026, ước tính Đông Nam Á chiếm 32% lượt tải ứng dụng phim ngắn toàn cầu trong Q1/2026. Các chủ đề được nêu gồm giả tưởng và đảo ngược địa vị [S11]. Đây là tín hiệu để thử thông điệp giàu kịch tính. Nó không đo riêng xuyên không, không đại diện riêng Việt Nam và không chứng minh người xem muốn chơi game chiến lược.

### Cơ chế phải thực hiện lời hứa của chủ đề

Với Emperors, xuyên không nên ảnh hưởng ít nhất ba việc:

1. **Biết gì:** mỗi đế có nền kiến thức khác nhau; biết lịch sử hoặc hình thế không đồng nghĩa biết tình báo hiện tại.
2. **Làm được gì:** cách trị quốc, dùng người hoặc dụng binh đem lại lựa chọn riêng đủ rõ để người chơi muốn thử vai khác.
3. **Lịch sử đổi ra sao:** khi quyết định của người chơi làm thế giới rẽ hướng, hiểu biết cũ phải được kiểm chứng lại. Không biến kiến thức thành tiên tri luôn đúng.

Ví dụ tình huống để prototype, không phải luật đã chốt: nhận tin một cửa ngõ đang yếu; người chơi có thể đánh ngay, bỏ một nhịp do thám hoặc đổi điều kiện liên minh để được đi qua. Kết quả phải tác động lên map và mối quan hệ, khiến người chơi kể được “tôi thắng nhờ đánh vào thời điểm đó”.

Đo hiệu quả chủ đề ở hai tầng: người ta có bấm thử khi thấy tình huống không, và sau khi chơi họ có tự nguyện quay lại không. Không lấy lượt xem trailer hoặc tỷ lệ bấm làm bằng chứng vòng chơi tốt.

## 5. So sánh hai hướng đối với chính Emperors

Bảng sau là đánh giá sản phẩm từ bối cảnh hiện có, không phải điểm số thị trường khách quan.

| Tiêu chí | Hướng 1: ván tranh bá gọn | Hướng 2: chiến dịch dài |
|---|---|---|
| Lời hứa | Hoàn thành một cuộc tranh bá trong một phiên ngắn | Xây dựng và sống cùng một thế lực qua nhiều phiên |
| Phần thưởng chính | Quyết định hay, xoay thế cờ, kết quả rõ | Quy hoạch dài hạn, gắn bó tướng/triều đại, hậu quả tích lũy |
| Lý do quay lại | Thử đế khác, phương án khác, thế cờ khác | Tiếp tục câu chuyện dang dở và theo đuổi mục tiêu lớn |
| Rào cản vào chơi | Có thể giảm bằng một tình huống cụ thể, ít hướng dẫn | Cần giải thích hệ thống, nhưng vẫn có thể onboarding tốt |
| Yêu cầu nội dung | Tổ hợp cơ chế và khác biệt giữa các ván phải đủ mạnh | Nhiều sự kiện, phát triển tướng, ngoại giao và nội dung hậu kỳ |
| Rủi ro chất lượng | Nông, may rủi, ván lặp, người chơi không thấy mình tiến bộ | Quá tải, thao tác lặt vặt, AI thiếu thuyết phục, giữa/cuối ván kéo dài |
| Cách thử trên web | Có thể đưa người lạ từ mở link tới kết thúc ván trong một buổi | Phải theo dõi quay lại qua nhiều ngày và khả năng tiếp tục ván |
| Phù hợp hiện tại | Thuận lợi hơn để chứng minh trải nghiệm cơ bản | Hợp nếu chủ đích phục vụ nhóm mê mô phỏng và chấp nhận phạm vi lớn |

Không có cơ sở để khẳng định nhóm thích ván nhanh đông hơn nhóm thích chiến dịch trong tệp Emperors. Khuyến nghị hướng 1 dựa trên độ phù hợp của lời hứa sản phẩm, khả năng kiểm chứng và phạm vi thực hiện, kết hợp tín hiệu thị trường cho thấy hướng này có người mua.

### Tệp đầu tiên nên tuyển

Ưu tiên người đọc/nói tiếng Việt, thích lịch sử hoặc giả tưởng xuyên không, từng chơi chiến thuật/cờ/game theo ván và có thể dành một phiên khoảng nửa giờ. Đây là định nghĩa tuyển người thử theo hành vi; chưa phải chân dung nhân khẩu học đã xác nhận. Không nên tự giới hạn giới tính hoặc tuổi khi chưa có dữ liệu.

Ba nhóm hữu ích cho thử nghiệm:

- Thích cờ, chiến thuật gọn hoặc roguelite: kiểm tra độ rõ và khả năng chơi lại.
- Thích lịch sử/Tam Quốc/xuyên không, ít chơi chiến thuật nặng: kiểm tra sức hút chủ đề và khả năng tự học.
- Đã chơi Civ/Total War/CK hoặc game chiến dịch tương tự: kiểm tra chiều sâu bị thiếu ở đâu và giá trị của hướng dài.

Nhóm ba là đối chứng quan trọng. Nếu chỉ phỏng vấn nhóm mê chiến dịch, danh sách tính năng có thể tăng liên tục; nếu chỉ hỏi nhóm thích đơn giản, nét riêng chiến lược có thể bị bào mòn.

## 6. V2 nên giữ gì và giản lược gì nếu chọn hướng 1?

Đây là đề xuất mới để xem xét sau ngã rẽ sản phẩm. Những phần anh đã chọn trong interview vẫn là quyết định đã ghi; báo cáo này không tự hủy chúng.

| Hệ thống V2 hiện được bàn tới | Phương án cho ván gọn |
|---|---|
| Map tương tác, fog, khám phá phe | Giữ ưu tiên cao: map là nơi hiểu tình hình và ra lệnh; vùng chưa rõ phải có giải thích |
| Khác biệt giữa bốn đế / A.5 | Giữ làm trụ cột chơi lại; khác biệt thể hiện trong quyết định, không chỉ cộng chỉ số |
| Một lệnh triều đình + việc từng châu | Giữ quyền điều hành nhiều việc; thử chính sách lặp/ủy nhiệm/gộp lệnh để số click không tăng đều theo số châu |
| Tướng: ba chỉ số và thẻ | Giữ thông tin giúp chọn người đúng việc; lớp quan hệ/XP/biến cố triển khai theo giá trị tạo ra trong một ván |
| Quân đồn trú và quân cơ động | Bảo đảm vị trí và bảo toàn lực lượng; cách hiển thị có thể gọn, không dùng chung một đội quân ở nhiều nơi |
| Tiếp tế, hành quân, vây thành | Thử trạng thái dễ đọc và ít bước điều chỉnh; mở rộng mô phỏng nếu người chơi thấy đó là quyết định đáng quan tâm |
| Xây dựng, dân, tiền, lương | Tập trung vào đánh đổi rõ giữa tăng trưởng, giữ ổn định và mở chiến tranh; tránh nhiều chuỗi nâng cấp tương tự nhau |
| Ngoại giao | Một số giao kèo có nghĩa vụ và hậu quả thực; thông tin phải theo mức biết |
| Lưu vong/chư hầu/phục quốc | Thử tình huống trở lại có mục tiêu và thời hạn rõ; đánh giá có tạo cao trào hay chỉ kéo dài ván đã thua |
| Kế vị nhiều đời, quan hệ sâu, vận tải chi tiết | Ứng viên chuyển sang phase chiến dịch nếu được anh đồng ý sau thử nghiệm |
| Intro, lời kể kết quả, save/load | Giữ. Ván ngắn vẫn cần tạm dừng và hiểu vì sao thắng/thua |
| LLM và nội dung sinh tự do | Chưa cần để chứng minh vòng chơi; tiếp tục ưu tiên luật và tính nhất quán |

Một phép tính cho thấy sức ép nhịp độ: **48 lượt trong 30 phút chỉ cho trung bình 37,5 giây/lượt**, tính cả đọc tin, quyết định, xem kết quả và hoạt ảnh. Nếu mỗi lượt phải chỉnh nhiều châu, chọn tướng, cân tiếp tế và đọc biến cố, thời lượng cũ 20–40 phút rất khó giữ. Phải đo thao tác và thay nhịp chơi; không nên chỉ rút thời gian hoạt ảnh.

Nguyên tắc thử: mỗi tương tác cần giúp hiểu thế cờ hoặc thực hiện một đánh đổi. Ít click không đồng nghĩa ít quyền điều hành. Cần tránh quay về lỗi V1 mà anh phản ánh: có quá ít việc có ý nghĩa và cảm giác chủ yếu quan sát.

### Lời hứa và nhịp trải nghiệm đề xuất

Lời hứa nội bộ để hướng thiết kế: một ván làm hoàng đế, dùng sở trường và điều mình biết để đổi thế cuộc, rồi thử lại theo cách khác.

- Mở ván bằng một vấn đề có thể hành động ngay. Mục tiêu thử nghiệm: quyết định đầu dưới 90 giây.
- Có thắng lợi cục bộ, đánh đổi hoặc phản ứng dễ nhận thấy sớm. Không cần đợi nhiều lượt mới thấy mình đã làm được gì.
- Tình huống mới phát sinh từ hệ thống và trạng thái thế giới, tránh dùng biến cố ngẫu nhiên để bù cho quyết định thiếu tác dụng.
- Có điểm kết thúc thuyết phục trong khoảng 20–30 phút với người đã quen; người mới có thể lâu hơn và được lưu tiếp tục.
- Kết thúc giải thích một vài bước ngoặt cùng một phương án có thể thử ở ván sau.

Không khóa số lượt hoặc bắt buộc chiếm sạch toàn map chỉ để đạt thời lượng. Điều kiện thắng phải phù hợp câu chuyện tranh bá và rõ ngay khi vào ván.

Mục tiêu tỷ lệ thắng 20–30% trong interview cần được diễn giải lại theo nhóm người chơi, độ khó và số ván đã trải qua. Nó chưa phải quy luật làm game hấp dẫn. Đặc biệt, cần đo người mới có hiểu thất bại và tự muốn chơi lại không trước khi tối ưu về một tỷ lệ tổng.

## 7. Phân phối và cách thu tiền cần khớp hướng chơi

Các lựa chọn dưới đây là giả thuyết kinh doanh, chưa phải đề nghị chi ngân sách hoặc công bố mô hình giá.

Với ván gọn, web giúp gửi đường dẫn cho người thử và quan sát toàn bộ một ván. Tuy nhiên, mở link dễ không có nghĩa người dùng sẽ nhớ quay lại. Sau khi chứng minh vòng chơi, có thể thử bản chơi cơ bản miễn phí cùng bản đầy đủ/gói kịch bản, hoặc một sản phẩm mua một lần. Tránh đưa sức mạnh trả tiền vào giai đoạn đang đo kỹ năng và công bằng vì sẽ làm tín hiệu khó diễn giải.

Với chiến dịch, bản demo đủ sâu và một sản phẩm có lưu tiến trình đáng tin cậy sẽ quan trọng hơn khả năng kết thúc ngay. Nội dung mở rộng có thể hợp với cấu trúc này, nhưng cần người chơi thật sự quay lại chiến dịch trước khi lập kế hoạch nhiều gói nội dung.

Không có dữ liệu hiện tại để ước tính doanh thu, giá bán tối ưu, chi phí thu hút người chơi hoặc quy mô thị trường có thể phục vụ. Số người tải game/phim ngắn trong khu vực không chuyển trực tiếp thành số khách hàng Emperors. Game PC bán tốt cũng chưa kiểm chứng khả năng kiếm tiền của game web tiếng Việt.

Kênh tuyển người thử có thể là cộng đồng lịch sử/Tam Quốc, game tuổi thơ và chiến thuật. Cần dùng tình huống chơi thực để giới thiệu; độ hấp dẫn của video do AI tạo không thay được trải nghiệm khi mở game.

## 8. Kế hoạch kiểm chứng trước khi khóa V2

### Bước A — nghiên cứu hành vi gần đây

Tuyển khoảng 18 người, mỗi nhóm ở mục 5 khoảng sáu người. Đây là nghiên cứu định tính để phát hiện vấn đề; không dùng n=18 để tuyên bố tỷ lệ thị trường.

Hỏi về ba lần chơi gần nhất: họ chọn game gì, có bao nhiêu thời gian, đã chơi bao lâu, dừng ở đâu, quay lại vì sao. Hỏi game chiến thuật gần nhất họ bỏ và một lần họ chơi lại ngay sau thua. Những câu này đáng tin hơn việc chỉ hỏi họ có thích ý tưởng mới không.

Quan sát họ chơi mà không có tác giả đứng giải thích. Ghi thời điểm không hiểu luật, cảm giác mất quyền quyết định, việc họ tự tìm xem và điều họ kể lại sau phiên.

### Bước B — so sánh hai prototype có phạm vi hẹp

| Thiết kế thử | Prototype A: ván gọn | Prototype B: chiến dịch |
|---|---|---|
| Nội dung chung | Cùng hai đế, ngôn ngữ hình ảnh, chất lượng hướng dẫn và kịch bản nền | Như A |
| Phần khác cần thử | Vòng chơi trọn vẹn, mục tiêu khoảng 20–30 phút | Vòng mở đầu chiến dịch, mục tiêu tiến triển qua ít nhất hai phiên |
| Tín hiệu chính | Tự bắt đầu ván mới, thử vai khác, hiểu điều cần sửa | Tự quay lại tiếp tục save, nhớ kế hoạch, quan tâm người và lãnh thổ |
| Tránh thiên lệch | Không làm A đẹp/chạy mượt hơn để thắng phép thử | Không gọi B là bản cao cấp; không ép so hoàn thành chiến dịch với hoàn thành ván ngắn |

Cho thứ tự A/B xen kẽ giữa người thử để giảm hiệu ứng học trước. Nếu phải có người hỗ trợ, ghi lượng trợ giúp và lý do. So sánh theo nhóm hành vi, không gộp tất cả thành một điểm yêu thích.

Hai đế dùng trong test cần khác nhau đủ rõ; có thể chọn Tần và Lý theo lát cắt đã bàn, nhưng đây chưa là chỉ thị triển khai. Không cần xây đầy đủ cả hai game: prototype B chỉ cần đủ để người chơi thật sự muốn hoặc không muốn tiếp tục qua hai phiên, vẫn phải tạo cảm giác chiến dịch trung thực.

### Bước C — đo hành vi tự nguyện

Theo dõi:

- Thời gian từ mở game đến hành động có ý nghĩa đầu tiên; tỷ lệ cần trợ giúp.
- Người chơi có giải thích được mục tiêu và hậu quả của quyết định không.
- Thời lượng ván A và tỷ lệ bỏ trước khi có kết quả; lý do bỏ.
- Tỷ lệ bắt đầu ván mới của A; tỷ lệ tiếp tục save của B, tách khỏi hành vi được người điều phối yêu cầu.
- Quay lại trong 24–48 giờ và trong bảy ngày, khi người chơi biết họ vẫn có thể chơi nhưng không bị thúc ép.
- Kết quả theo người thắng/người thua, vai đã chọn và nhóm kinh nghiệm.
- Ý định trả tiền chỉ là tín hiệu yếu; khi sản phẩm đủ cụ thể, thử quyết định mua hoặc đăng ký mua có cam kết rõ ràng.

Ván mới và tiếp tục save là hai hành vi khác nhau. Không lấy thời gian chơi dài nhất làm bên thắng: có thể đó là hứng thú, cũng có thể là lạc hướng hoặc quá nhiều thao tác.

### Ngưỡng sơ bộ để điều hành thử nghiệm

Chỉ tiêu do dự án đặt để phát hiện lỗi, không phải benchmark ngành:

- Ít nhất khoảng 80% người thử A tự thực hiện hành động đầu và giải thích mục tiêu, không cần tác giả hướng dẫn trực tiếp.
- Trung vị quyết định đầu của A dưới 90 giây; người đã quen hoàn thành ván trong vùng thời lượng mục tiêu.
- Người chơi kể được ít nhất một quyết định khiến thế cờ thay đổi và một cách họ muốn thử khác.
- Nếu người thích lịch sử bị hút bởi chủ đề nhưng không muốn chơi ván hai, phải kiểm tra vòng chơi trước khi thêm nội dung hoặc kéo dài chiến dịch.

Với mẫu nhỏ, báo số người cụ thể bên cạnh phần trăm. Sau khi sửa các lỗi lớn, mở rộng thử nghiệm theo lượng người có thể tuyển. Muốn đưa ra kết luận thống kê về retention cần tính cỡ mẫu theo chênh lệch muốn phát hiện; không tự gọi một chênh lệch vài người là đã thắng thị trường.

### Điều kiện thay đổi khuyến nghị

Chọn hướng chiến dịch nếu nhóm mục tiêu tự nguyện quay lại tiếp tục nhiều phiên, gắn bó rõ với tướng/lãnh thổ, và các hệ thống sâu tạo ra quyết định đáng kể thay vì tăng thao tác. Đồng thời cần chấp nhận phạm vi nội dung, AI và QA lớn hơn.

Giữ hướng ván gọn nếu người chơi tự thử lại, đổi đế, hiểu nguyên nhân kết quả và tiếp tục thấy thế cờ mới sau nhiều ván. Nếu cả hai không tạo hành vi quay lại, cần sửa cơ chế ra quyết định và phản hồi thay vì mặc định ghép cả hai.

## 9. Những phản biện cần giữ trước khi quyết định

**Ván ngắn có thể làm mất cảm giác xây đế chế.** Đúng. Prototype phải cho thấy xuất phát, tăng sức mạnh, bước ngoặt và kết cục có liên hệ. Nếu người chơi luôn thấy vừa nhập vai đã bị ngắt, tăng thời lượng hoặc chuyển hướng là hợp lý.

**Chiến dịch có thể gắn bó hơn và hợp tướng/phục quốc hơn.** Đúng. Đó là lập luận mạnh nhất cho hướng 2. Cần chứng minh bằng hành vi tiếp tục ván, không chỉ bằng việc người được hỏi muốn thêm tính năng.

**Game gọn bán triệu bản có thể là ngoại lệ.** Đúng. Các trường hợp đối chiếu xác nhận khả năng tồn tại thị trường, không cung cấp tỷ lệ thành công của tất cả game tương tự. Nghiên cứu không có cơ sở dữ liệu đầy đủ về game thất bại để tính xác suất.

**Xuyên không có thể chỉ khiến người ta tò mò một lần.** Đúng. Cần đo riêng hiệu quả thu hút và giữ người. Cơ chế khác biệt kiến thức, vai trò và lịch sử đổi hướng là giả thuyết biến tò mò thành trải nghiệm chơi lại.

**Giảm hệ thống có thể tái tạo V1 ít việc để làm.** Đúng. Phải giữ agency: đủ lựa chọn có hậu quả, khả năng xử lý nhiều việc và map phản hồi rõ. Chỉ giảm những công việc không tạo đánh đổi đáng chú ý.

## 10. Quyết định cần chủ dự án chốt sau nghiên cứu

1. Có dùng ván tranh bá ngắn làm lời hứa chính của V2 và đưa các hệ thống đòi hỏi nhiều phiên sang nhánh chiến dịch về sau không?
2. Tệp đầu tiên muốn phục vụ là người thích tranh bá nhanh có chủ đề xuyên không, hay người muốn mô phỏng triều đại nhiều buổi?
3. Bản Loạn 12 Sứ Quân nào là nguồn cảm hứng cụ thể? Cần ảnh/link để phân tích đúng cơ chế gốc.

Chưa cần trả lời lại toàn bộ các câu hỏi kỹ thuật của review trước. Khi hướng sản phẩm rõ, nhiều quyết định về số lượt, xây dựng, tiếp tế và kế vị sẽ có tiêu chí để đánh giá.

## Nguồn

Tất cả được truy xuất ngày 28/09/2026. Link là nguồn thực tế đã đọc; không hàm ý đã mua hoặc đọc đầy đủ báo cáo thương mại.

- **S01.** [ESA — 2025 Essential Facts](https://www.theesa.com/resources/essential-facts-about-the-us-video-game-industry/2025-data/). Khảo sát thị trường Mỹ; tỷ lệ động cơ dùng đúng nhóm người chơi trưởng thành.
- **S02.** [Quantic Foundry — Gamers Have Become Less Interested in Strategic Thinking and Planning](https://quanticfoundry.com/2024/05/21/strategy-decline/), 21/05/2024; dữ liệu đến 04/2024. Nguồn gốc phương pháp và giới hạn mẫu.
- **S03.** [Thronefall — Steam](https://store.steampowered.com/app/2239150/Thronefall/). Mô tả chính thức và snapshot review tiếng Anh.
- **S04.** [9 Kings — Steam](https://store.steampowered.com/app/2784470/9_Kings/). Mô tả sản phẩm chính thức.
- **S05.** [9 Kings — thông báo Patch #25](https://steamcommunity.com/games/2784470/announcements/detail/701017176467834071), 26/05/2026. Nội dung đọc được trong [Steam announcements feed](https://store.steampowered.com/news/posts/?enddate=1779826366&feed=steam_community_announcements); [SteamDB lưu bản patch](https://steamdb.info/patchnotes/23420050/) giúp xác nhận ngày.
- **S06.** [Paradox — Crusader Kings III Passes Four Million Sales](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/crusader-kings-iii-passes-four-million-sales), 23/04/2025. Số bán do nhà phát hành công bố, nhiều nền tảng.
- **S07.** [Midjiwan — Weekly Challenges are Now Here!](https://polytopia.io/weekly-challenges-are-now-here/), 09/06/2025. Tính năng được mô tả bởi nhà phát triển.
- **S08.** [Reigns: Three Kingdoms — Steam](https://store.steampowered.com/app/2437040/Reigns_Three_Kingdoms/). Mô tả chính thức và snapshot review toàn bộ.
- **S09.** [Reddit — Thronefall...do you suggest this game?](https://www.reddit.com/r/ShouldIbuythisgame/comments/1ipx5i0/thronefalldo_you_suggest_this_game/), luồng thảo luận từ 2025. Bằng chứng định tính, không phải khảo sát.
- **S10.** [Steam Community — 9 Kings: Build & Run Variety?](https://steamcommunity.com/app/2784470/discussions/0/601905999576619111/), 01/06/2025. Có cả phản hồi lo lặp và phản biện về khác biệt các vua.
- **S11.** [Sensor Tower — State of Short Drama Apps 2026](https://sensortower.com/blog/state-of-short-drama-apps-2026-report), 06/2026. Dữ liệu ước tính ứng dụng giải trí, không phải khảo sát người chơi game xuyên không.
- **S12.** [Gamota — Vietnam Gaming 2026 Outlook](https://gamota.com/gamota-lab/reports/gamota-releases-the-vietnam-gaming-2026-outlook-insights-into-vietnams-gaming-market/), 04/06/2026. Chỉ đọc trang giới thiệu; báo cáo đầy đủ yêu cầu đăng ký.
- **S13.** [Bài lưu trữ — Loạn 12 Sứ Quân [By Micro Game]](https://gamejavahaynhatdt.blogspot.com/2014/02/loan-12-su-quan-by-micro-game.html), 25/02/2014. Nguồn thứ cấp, chỉ dùng để nhận diện khả năng có phiên bản Java xếp ba; chưa xác nhận phiên bản người dùng nhắc.

Nguồn dự án: emperors-v2-interview-review-2026-09-27.md, bản hiện hành đã đọc từ tệp của dự án; bối cảnh lời người dùng trong cuộc trao đổi ngày 28/09/2026.

---

# B. Market audit sau spike 2 — 28/09/2026

## B0. Câu hỏi, phương pháp và giới hạn

Thực hiện bởi ChatGPT/Codex, ngày 28/09/2026, sau khi fetch và fast-forward repo tới `9d30411`. Đây là research bổ sung theo yêu cầu trực tiếp của chủ dự án; không phải thay đổi luật hoặc quyết định thay chủ dự án.

Câu hỏi của chủ dự án, nguyên văn:

> Pull code về và đọc cho a phần research + demo của claude và feedback của grok qua file docs/phases/v2-gameplay/_research/grok.md
> sau đó e thực hiện research về các phần sau
> Market structure
> Competitor taxonomy
> Player segmentation
> Retention mechanics
> Session duration
> Monetization
> Genre trends
> Evidence synthesis
>
> sau đó tổng hợp lại, đưa ra ý kiến của e, định hướng và giải pháp của e
> a cần e đóng vai 1 người chơi khó tính, như các gamer trên steam đã làm

**Kết luận của em:** ưu tiên ván tranh bá ngắn trên điện thoại, người chơi trực tiếp chọn nước đi trên bản đồ; dùng thẻ cho phản ứng và câu chuyện. Chưa nên làm chiến dịch dài, cũng chưa nên lấy quẹt có/không làm toàn bộ game. Lý do mạnh nhất là lời hứa sản phẩm và vấn đề agency của chính Emperors, không phải chứng minh thị trường chỉ thích ngắn.

Bốn lớp bằng chứng được tách riêng:

1. **Dự án:** đọc research Claude A–I, Grok B và A, `DECISION.md`, hai spike; đối chiếu code V1 khi Grok phê bình AI. Phản hồi anh chán sau khi chơi lấy từ `grok.md` B0, không giả làm quan sát trực tiếp của em.
2. **Thị trường:** nguồn chính thức từ Sensor Tower, GameAnalytics, Quantic Foundry, GameRefinery, nhà phát triển và cửa hàng. Báo cáo mang tên năm 2026 có thể đo năm 2025; luôn ghi kỳ dữ liệu.
3. **Người chơi:** đọc 34 review Steam qua API công khai, bốn game, cả hai chiều; 12 trường hợp có nội dung được trình bày ở B5. Đây là mẫu định tính có chủ đích, tiếng Anh, chịu cách xếp hạng của Steam. Không phải khảo sát đại diện Việt Nam hoặc khảo sát tỷ lệ thích từng thể loại.
4. **Demo:** đọc source và chạy mô phỏng Node. Không có phiên chơi cảm ứng trên điện thoại hoặc quan sát người lạ trong lượt này. `support.js` của canvas không nằm trong repo; kiểm tra handler của simulator không chứng minh giao diện chạy tốt trên thiết bị.

Độ chắc: cao với lỗi tái hiện được và mô tả sản phẩm; vừa với nhu cầu rút ra từ nhiều review; thấp với độ lớn tệp Việt Nam, willingness-to-pay và khả năng Emperors giữ chân. Không có dữ liệu để đưa dự báo doanh thu, số người mua hoặc xác suất thành công đáng tin.

## B1. Đọc demo dưới góc người chơi khó tính

### B1.1. Những gì đã tiến bộ

Spike 2 đã có địa bàn cụ thể, lương và quân, tướng, chiêu hàng, lưu vong, điều kiện thắng và diễn giải phép tính. Người chơi có thể lấy đất và nhận tướng: nói game hoàn toàn không có phần thưởng là không đúng. Câu hỏi là người chơi có cảm thấy **mình tạo ra** phần thưởng đó và có muốn dùng nó làm việc tiếp theo không.

Spike 1 thử lệnh trực tiếp nhưng chủ dự án thấy nhiều nút, khó vào; spike 2 giảm thao tác nhưng phần lựa chọn quân sự lại bị hệ thống làm hộ. Hai phản hồi không mâu thuẫn: cần giảm gánh học và thao tác, đồng thời giữ quyền quyết định.

### B1.2. Máy đang quyết định hộ phần nào?

Trong [`spike2/Main.dc.html`](../spike2/Main.dc.html), `targets1/targets2` xếp mục tiêu theo xác suất thắng; `deal1/deal2` thường đưa mục tiêu đứng đầu. `plan1/plan2` chọn quân xuất phát, khoảng 70% quân từ các địa bàn kề đủ điều kiện và tướng thích hợp theo công thức. Bản đồ là các node hiển thị, không có thao tác chọn đất để tự ra lệnh.

Hệ quả thiết kế: người chơi thường phê chuẩn phương án đã tối ưu cục bộ, thay vì tự chọn giữa đánh kho lương, cứu biên giới hoặc mở đường. Có/không vẫn có thể sâu, nhưng cần hai tương lai đáng cân nhắc. Số thẻ lớn không đồng nghĩa số quyết định lớn.

Chạy lại lệnh có sẵn:

```sh
node docs/phases/v2-gameplay/spike2/sim.js 60
```

720 ván chính sách = 4 đế × 3 chính sách × 60 seed (`i * 7919`). Kết quả thắng, làm tròn như simulator:

| Đế | Heuristic đọc số `sense` | Gật hết `yes` | Heuristic `rand` | Chạm trung bình / p90 của `sense` |
| --- | ---: | ---: | ---: | ---: |
| Tần | 72% | 80% | 30% | 122,5 / 183 |
| Đường | 22% | 30% | 20% | 196,1 / 571 |
| Minh | 32% | 8% | 2% | 170,3 / 272 |
| Hán Vũ | 45% | 55% | 35% | 136,8 / 248 |

`sense` chỉ là vài ngưỡng xác suất và dự trữ lương; không đại diện người chơi giỏi. `rand` là công thức quyết định giả ngẫu nhiên, không phải thử nghiệm người chơi. Chênh 8–10 điểm phần trăm trong 60 seed chưa đủ kết luận suy nghĩ làm chơi kém hơn. Tuy vậy, đây là cảnh báo phải kiểm tra lợi ích của lựa chọn và cân bằng bốn đế. Không được dùng bảng này làm tỷ lệ thắng kỳ vọng của người thật.

Audit thêm bốn trace, mỗi đế một ván seed `7919`, luôn chọn có, dừng khi `g.over`: 191/437 thẻ đã xử lý là `single` (intro/kết quả/tin/chuyển chương), tức 43,7% trong **bốn trace này**. Chúng có chức năng phản hồi, không mặc định vô dụng; nhưng nếu cứ bắt bấm “Tiếp”, cần đo phần thời gian làm việc đó. Con số này không phải ước lượng toàn bộ ván. Simulator còn kiểm 9.876 thẻ đủ nhãn và 24 ván qua component handler; các kiểm tra đó không phát hiện tính đúng của dự báo trên thẻ.

### B1.3. Lỗi làm mất niềm tin, tái hiện được

Các ví dụ đều dùng `SW.newGame(emp, 7919)` rồi `SW.choose(g, true)` liên tục; đọc `g.queue[0]` trước và sau mỗi bước:

| Trường hợp | Thẻ đang báo | Trạng thái và kết quả thật |
| --- | --- | --- |
| Tần, mùa 1 | Khương Mê Đương kéo tới Ký | Tây huyện đã bị chiếm, chủ là `me`, `face = null`; raid vẫn chạy và hiện “Đẩy lui null” |
| Hán Vũ (`liu_che`), mùa 3 | Giữ Trương Dịch **100%**, 1.700 quân, sức thủ 1.870 | Quân đã rút để lấy Tửu Tuyền; còn 500, sức thủ 550. UI báo “Mất Trương Dịch”, “null phá cổng”. Nguồn địch cũng đã thuộc ta; do gán chủ theo nguồn nên lãnh thổ thực tế vẫn thuộc ta |
| Đường, mùa 15 | Trả 80 lương do thám Trường An | Trường An vừa về tay ta; vẫn bị trừ lương để xem thông tin đất mình |

Nguyên nhân: `deal1/deal2` tạo cả hàng đợi theo trạng thái đầu mùa; lệnh trước đổi trạng thái nhưng thẻ sau chưa được làm mới. `raid1` dùng quân thủ hiện tại với lực đánh lưu từ trước, thiếu kiểm tra nguồn còn là địch; `choose` xử lý scout mà không chặn đích đã thuộc ta.

**Đây là lỗi tính nhất quán, không phải fog of war hợp lệ.** Người chơi không thể học từ thất bại nếu dự báo và xử lý nói về hai trạng thái khác nhau. Cần sửa trước khi dùng playtest để phán quyết map hay swipe vui hơn.

### B1.4. Các rủi ro khác và điều không nên kết luận quá tay

- Chương 1 chuyển sau đủ năm thành hoặc mùa 9; chương 2 gom sức mạnh vào quy mô khác. Mất dấu đầu tư ở quê nhà có thể làm giảm gắn bó. Cần hỏi người chơi có nhận ra thứ mình gây dựng còn tác dụng không; chưa chứng minh mọi người ghét chuyển chương.
- Bốn đế có khác biệt, gồm cả nguồn kỵ binh của Hán Vũ, không hoàn toàn chỉ đổi tên. Nhưng nhiều lợi thế vẫn là tăng số; cần kiểm tra chúng có khiến người chơi chọn đường khác không.
- Không thấy autosave/khôi phục ván hoặc nút chơi lại cùng seed trong spike 2. Đây là thiếu sót của prototype, chưa phải lỗi của một sản phẩm đã phát hành.
- Node chương 2 khoảng 34 px, một số chữ 9,5–10 px trên artboard 390×844: rủi ro đọc/chạm cần thử thiết bị, không phải kết quả usability test.
- Mục tiêu ta 6 châu, địch 11 châu là bất đối xứng. Điều đó có thể tạo ván ngắn hợp lý nếu được giải thích và có đoạn kết; không tự động là “thắng giả”.
- **Sửa nhận định của Grok về V1:** `game.html` compose `engine.js → attach-219.js → perception.js`; lớp cuối ghi đè `decide/decideAll/fillDecisions`, yêu cầu `DecisionContext`. Đọc hàm nền rồi kết luận toàn bộ runtime V1 đọc state thật là thiếu bước. Spike 2 có AI đọc truth theo comment của chính prototype; phải phân biệt hai runtime. Audit này không khẳng định đã chứng minh toàn bộ V1 không rò thông tin.
- Prototype tách biệt để kiểm chứng tương tác là đúng mục đích đã được owner yêu cầu. Chưa freeze không có nghĩa cấm làm spike. Việc cần tránh là đưa luật thử vào SOT/production trước khi duyệt, không phải cấm mọi code thí nghiệm.

## B2. Market structure — Emperors cạnh tranh ở thị trường nào?

Không có một thị trường duy nhất tên “game chiến thuật”. Cần tách lời hứa trải nghiệm, nền tảng, kênh phân phối và cách kiếm tiền:

| Cấu trúc | Thứ người chơi mua bằng thời gian/tiền | Sức ép với Emperors |
| --- | --- | --- |
| SLG/4X mobile dịch vụ, như Rise of Kingdoms | Phát triển tài khoản, vị thế liên minh, quan hệ và cạnh tranh nhiều tuần | Cần nội dung, cộng đồng, vận hành và kinh tế liên tục; không nên lấy doanh thu nhóm này làm TAM trực tiếp của game solo ngắn |
| Chiến thuật theo ván, như Polytopia | Đọc thế trận, thắng bằng hiểu biết, thử đối thủ hoặc xuất phát khác | Đòi hỏi luật rõ, đa dạng tình huống và đường lật lại; hình thức nhỏ không miễn trách nhiệm cân bằng |
| Roguelite xây vương quốc, như 9 Kings | Khám phá tổ hợp, thích nghi và thấy kế hoạch lớn dần | Cần nhiều cách chơi có giá trị; làm lại cùng recipe sẽ cạn hứng thú |
| Chiến dịch/nhập vai triều đại, như CK3 | Gắn bó lâu dài với đất, người và lịch sử của mình | Có thị trường thật, nhưng đòi hỏi lưu ván, AI, nhịp cuối và nội dung khác với sản phẩm ngắn |
| Truyện tương tác/quyết định, như Reigns | Tò mò chuyện tiếp theo, hệ quả, nhân vật và các kết thúc | Ít thao tác nhưng chi phí viết nội dung và kiểm soát lặp đáng kể |

Sensor Tower báo cáo **82 tỷ USD IAP mobile năm 2025**, tăng 1%; strategy tăng đồng thời doanh thu, lượt tải và thời gian chơi. Đó là doanh thu mua trong ứng dụng, không phải toàn bộ doanh thu gồm quảng cáo. Bằng chứng này bác bỏ cách nói strategy đang hết nhu cầu; nó không xác định hướng nào phù hợp với Emperors. [M01]

Tại Việt Nam, Sensor Tower ước tính **329 triệu lượt cài mới Q1/2025** trên App Store/Google Play. Đây không phải 329 triệu người, cũng không phải người muốn Tam Quốc xuyên không. Dữ liệu SEA phân biệt nhóm dễ tải như arcade/simulation và nhóm tạo IAP như strategy/RPG/shooter. Không thể lấy tỷ lệ khu vực để tự gán quy mô một ngách Việt Nam. [M02]

**Khuyến nghị vị trí cạnh tranh:** game solo theo ván, ưu tiên điện thoại, phát hiện qua video hoặc cộng đồng yêu sử. YouTube là kênh thu hút và nơi kể lại nước đi, không phải thể loại. Đối thủ giành thời gian còn gồm game khác và chính video mà người xem chưa muốn rời đi. Giả thuyết cần đo là “xem một tình huống → bấm thử → hiểu quyền của mình → tự muốn ván nữa”, không phải tổng lượt xem Tam Quốc.

Chưa đủ dữ liệu để tính thị phần có thể giành. Cần số người xem phù hợp thật sự bấm vào, tỷ lệ chơi được trên máy của họ, quay lại và trả tiền; không cộng lượt tải, người hoạt động, bản bán và review vào cùng một bảng quy mô.

## B3. Competitor taxonomy — học đúng đối thủ, đúng phần

Các mô tả sau dựa trên trang chính thức/cửa hàng [M07–M17]. Đây là phân loại chức năng, không phải bảng xếp hạng doanh thu hoặc khẳng định các game cùng tệp.

| Nhóm / game | Quyền quyết định chủ yếu | Nguồn chơi lại | Bài học phù hợp cho Emperors |
| --- | --- | --- | --- |
| Gần về bản đồ: **Polytopia** | Di chuyển, mở đất, đầu tư và giao chiến | Bộ tộc, thế xuất phát, đối thủ; thử thách cùng seed | Ít luật hiển thị vẫn cho nhiều cách giải; thử thách bất đồng bộ có thể đến sau |
| Gần về fantasy + input: **Reigns: Three Kingdoms** | Lựa chọn thẻ, tình tiết và giao chiến thẻ | Sự kiện, nhân vật, tiến trình | Đối thủ gần nhất để kiểm tra swipe + lịch sử; chủ đề trùng không đồng nghĩa cùng nhu cầu |
| Gần về build: **9 Kings** | Chọn và kết hợp bài trên lưới vương quốc | Vua, tổ hợp, nhiệm vụ và độ khó | Cho người chơi thấy chính mình tạo ra một cách thắng; tránh recipe độc tôn và thua không rõ lý do |
| Kề về sự tối giản: **Thronefall** | Phân bổ tiền, nâng cấp, vị trí vua và phòng thủ | Màn chơi, lựa chọn trang bị/thử thách | Bỏ bớt quản lý nhưng giữ điểm can thiệp; không phải mẫu mở rộng lãnh thổ trực tiếp |
| Kề về sự tối giản: **The King is Watching** | Phân bổ vùng được vua chú ý để sản xuất/huấn luyện | Bố trí, tổ hợp và điều kiện ván | Một giới hạn dễ hiểu có thể tạo trade-off; không cần chồng nhiều menu |
| Kề về tính rõ: **Into the Breach** | Đổi vị trí và chặn ý định địch | Đội hình, bản đồ, mục tiêu khác nhau | Biết địch sắp làm gì vẫn có bài toán sâu; giữ bí mật không phải cách duy nhất tạo chiến thuật |
| Kề về phân phối/social: **OpenFront** | Đất, tài nguyên, ngoại giao giữa người thật | Đối thủ và tình huống multiplayer | Bản đồ có thể sinh chuyện dễ kể; không bê mạng người chơi thật vào prototype solo |
| Đối chứng chiến dịch: **CK3 / Civ / Total War** | Kế hoạch dài, đầu tư và quan hệ nhiều tầng | Campaign khác, vai khác, lịch sử khác | Học cảm giác sở hữu và hệ quả; không suy ra phải bê toàn bộ hệ thống |
| Đối chứng dịch vụ: **Rise of Kingdoms** | Tài khoản, chỉ huy, liên minh và hiện diện theo thời gian | Xã hội, tiến trình và sự kiện | Hiểu nhu cầu cộng đồng; mô hình vận hành/thu tiền không phù hợp để sao chép nguyên bộ |

Snapshot Steam 28/09/2026: Reigns: Three Kingdoms **52% / 337 review toàn bộ**; 9 Kings **92% / 10.099 review tiếng Anh**; Thronefall **95% / 11.064 review tiếng Anh**. Khác ngôn ngữ, thời gian bán và nhóm người mua nên không coi đây là thử nghiệm swipe đối đầu bản đồ. Steam cũng không đại diện doanh số hay cảm nhận trên mobile. [M08–M10]

OpenFront công bố hơn một triệu người chơi web mỗi tháng trên trang Steam; đây là số tự công bố, không phải kiểm toán. Bản Steam vào Early Access 17/09/2026, ứng dụng iOS/Android nằm trong kế hoạch. Vì vậy chưa dùng nó làm bằng chứng một ứng dụng mobile tương tự đã thành công, hoặc xác nhận con số DAU/wishlist Grok nêu. [M13]

## B4. Player segmentation — nhóm nào nên phục vụ trước?

Phân khúc dưới đây là **giả thuyết hành vi để tuyển người thử**, không phải tỷ trọng thị trường đã đo. Cùng một người có thể thuộc nhiều nhóm vào những thời điểm khác nhau.

| Nhóm | Điều họ muốn khi mở game | Điều dễ làm họ bỏ | Ưu tiên |
| --- | --- | --- | --- |
| Người thích sử và muốn tự đổi thế cờ | Hiểu tình huống nhanh; thắng bằng một quyết định đáng nhớ | Danh tướng chỉ là skin, mình chỉ bấm tiếp, lịch sử không ảnh hưởng cách chơi | Tệp chính đề xuất |
| Người thích thử build/chiến thuật gọn | Khám phá kết hợp, sửa sai, đổi cách thắng | Một bài tối ưu dùng mãi, RNG che mọi nguyên nhân | Tệp chính thứ hai |
| Người đi từ video, tò mò vài phút | Được tự làm điều vừa thấy trong clip, không đọc sách luật | Mở ra khác quảng cáo, chữ nhỏ, tải chậm, tutorial kéo dài | Tệp vào cửa; chưa mặc định là tệp trả tiền |
| Người nhập vai gây dựng triều đại | Nhớ tướng, giữ đất, thấy đầu tư nhiều buổi có nghĩa | Reset thiếu lý do, thành quả bị xoá, kết thúc quá sớm | Phục vụ một phần bằng hệ quả trong ván; chưa hứa campaign đầy đủ |
| Người sống cùng liên minh SLG | Vai trò xã hội, thi đua, cứu nhau, tiến trình dài | Solo ít tương tác, không có mục tiêu cộng đồng | Chưa phải tệp đầu của V2 |
| Người thích truyện tương tác nhẹ | Nhân vật thú vị, bất ngờ và kết thúc khác nhau | Thẻ lặp, văn dài, số liệu lấn át câu chuyện | Có thể hợp swipe; không tự đồng nhất với người muốn điều quân |

Không tuyển chỉ bằng câu “anh có thích Tam Quốc không?”. Hỏi game họ thực sự chơi gần đây; họ có chủ động chơi lại một màn để sửa nước đi không; có mở game giữa những khoảng rảnh ngắn không; điều gì khiến họ bỏ game cuối cùng. Đây là hành vi có ích hơn nhãn casual/hardcore hoặc tuổi/giới tự suy đoán.

**Căng thẳng sản phẩm cần chấp nhận:** người thích lịch sử chưa chắc thích 4X; người thích xuyên không chưa chắc muốn bảng hậu cần; người xem video thắng lớn chưa chắc thích tự thua và học. Chưa có số liệu về phần giao của ba nhóm ở Việt Nam. Gốc Loạn 12 Sứ Quân cũng chưa xác nhận đúng phiên bản; không dùng ký ức một tựa khác để chốt cơ chế.

## B5. Retention mechanics — người chơi quay lại vì điều gì?

### B5.1. Đọc người chơi thật, gồm cả phản chứng

Mẫu thu ngày 28/09/2026 qua Steam `appreviews`: `language=english`, `filter=all`, `day_range=365`, `purchase_type=all`, `num_per_page=5`, lần lượt `review_type=positive/negative`. Reigns: Three Kingdoms trả về 1 chê + 3 khen; ba game còn lại mỗi game 5 chê + 5 khen, tổng 34. Chỉ xét những review trả về, không tuyên bố đã đọc hết một năm. Endpoint theo game ở M18.

12 trường hợp dưới đây được chọn vì có nhận xét cụ thể hoặc phản chứng. Nội dung là **diễn giải**, không phải trích nguyên văn. Giờ chơi là `playtime_at_review / 60`, làm tròn, không phải số giờ hiện tại trên tài khoản. Giờ cao chứng minh có tiếp xúc dài hơn, không tự làm ý kiến đúng cho mọi người.

| Game / đánh giá / ngày | Giờ khi viết | Ý người chơi | Hàm ý cần thử, không phải kết luận toàn thị trường |
| --- | ---: | --- | --- |
| [9 Kings · chê · 05/12/2025](https://steamcommunity.com/profiles/76561198012583327/recommended/2784470/) | 9,0 | Tìm được build mạnh rồi lặp lại, ít lựa chọn mới, trận tự chạy và khó hiểu lúc thua | Nhiều lượt nâng cấp chưa chắc còn nhiều quyết định |
| [9 Kings · chê · 11/02/2026](https://steamcommunity.com/profiles/76561198041502332/recommended/2784470/) | 49,6 | Nhiệm vụ và RNG thiếu công bằng; không thấy đủ thông tin địch để biết sửa gì | Cần giải thích thất bại và quyền điều chỉnh |
| [9 Kings · khen · 08/11/2025](https://steamcommunity.com/profiles/76561197993087097/recommended/2784470/) | 27,4 | Thích ý tưởng nhỏ nhưng nhiều tổ hợp giữa các bộ bài của vua | Độ sâu có thể đến từ kết hợp, không cần danh sách hệ thống dài |
| [9 Kings · khen · 24/05/2026](https://steamcommunity.com/profiles/76561199492893353/recommended/2784470/) | 97,8 | Thích vua có bản sắc và phải đổi kế hoạch; vẫn phê bình RNG, scaling và cân bằng | Review tích cực không có nghĩa người chơi chấp nhận mọi lỗi |
| [Polytopia · khen · 29/11/2025](https://steamcommunity.com/profiles/76561199102627906/recommended/874390/) | 20,4 | Thường ngại strategy phức tạp, nhưng ở đây học được và vẫn phải nghĩ | Có tệp muốn cửa vào thấp cùng khả năng làm chủ cao |
| [Polytopia · chê · 07/09/2026](https://steamcommunity.com/profiles/76561198956058505/recommended/874390/) | 68,9 | Vị trí xuất phát, cân bằng bộ tộc và snowball làm khó lật lại | Công bằng và đường phục hồi quan trọng cả ở game gọn |
| [Polytopia · chê · 12/05/2026](https://steamcommunity.com/profiles/76561199776108636/recommended/874390/) | 23,8 | Thích game nhưng thấy nhiều DLC bộ tộc làm tổng giá quá cao | Bán nội dung vẫn có rủi ro cảm giác bị chia nhỏ sản phẩm |
| [Thronefall · chê · 14/03/2026](https://steamcommunity.com/profiles/76561198052562705/recommended/2239150/) | 0,8 | Vị trí xây cố định giảm quyền sáng tạo, dù hiểu lợi ích giảm quản lý | Một giới hạn tốt cho tệp này có thể loại tệp khác; không nên gạt đi là chơi sai cách |
| [Thronefall · chê · 25/02/2026](https://steamcommunity.com/profiles/76561197997130422/recommended/2239150/) | 10,3 | Lặp bản đồ đã biết với buff/debuff không đủ mới | Biến thể phải đổi bài toán, không chỉ đổi hệ số |
| [Thronefall · chê · 29/01/2026](https://steamcommunity.com/profiles/76561198027738762/recommended/2239150/) | 17,6 | Thích game nhưng chữ trên Steam Deck gây mỏi mắt | Mobile cần đọc được trong lúc chơi, không chỉ đẹp trong ảnh |
| [Thronefall · khen · 18/02/2026](https://steamcommunity.com/profiles/76561198118216252/recommended/2239150/) | 1,1 | Tìm thấy ở đây trải nghiệm họ từng mong đợi khi xem quảng cáo game khác | Video phải hứa đúng trải nghiệm; đây là lời người dùng, không phải xác minh cáo buộc về quảng cáo |
| [Reigns: Three Kingdoms · khen · 03/06/2026](https://steamcommunity.com/profiles/76561198883000901/recommended/2437040/) | 20,9 | Từng chơi qua Netflix rồi mua Steam và tìm thiết bị để tiếp tục | Phản chứng cho lời tuyệt đối “không ai cần game này”; không chứng minh quy mô thị trường lớn |

Review chê duy nhất của Reigns trong mẫu chỉ nói không hợp mình, không giải thích. Vì vậy không được dùng mẫu này để “xác nhận Steam đồng loạt chê swipe lặp”. Năm review khen Thronefall trả về nghiêng về phản ứng với quảng cáo game khác: đó cũng là thiên lệch chọn mẫu cần ghi nhận.

Google Play của Rise of Kingdoms cho thêm một đối chứng mobile: review 2026 được trang hiển thị vừa nhắc nhiều việc để làm và lợi ích liên minh, vừa than chi phí cạnh tranh, tiến trình F2P dài hoặc kỳ vọng quảng cáo. Đây là vài trường hợp công khai, không phải tỷ lệ đồng thuận. Nhóm này có lý do xã hội để quay lại mà một game solo không thể giả lập chỉ bằng thêm nhiệm vụ ngày. [M16]

### B5.2. Thiết kế giữ chân đề xuất

Chuỗi cần chứng minh cho Emperors: **tôi có ý định → được chọn → thấy bàn cờ đổi → hiểu vì sao → nghĩ ra cách khác**. Đây là giả thuyết thiết kế từ review và code, chưa phải kết quả retention của Emperors.

| Nhịp | Giá trị nên tạo | Cơ chế đề xuất | Cách kiểm tra |
| --- | --- | --- | --- |
| Sau một lệnh | Cảm giác mình tác động | Đất, tuyến đánh hoặc thế thủ đổi rõ; kết quả chỉ ra nguyên nhân chính | Người chơi nói được mình vừa đổi gì, không chỉ đọc lại số |
| Trong một ván | Mong đợi kế hoạch trả quả | Một kế hoạch 2–3 lệnh: giữ kho → gom quân → lấy cửa ải | Có tự nhắc tới mục tiêu tiếp theo trước khi UI gợi ý không |
| Cuối ván | Đóng lại một câu chuyện | Ghi lại 2–3 bước ngoặt do người chơi tạo; giải thích thắng/thua | Có kể được một tình huống và muốn sửa/thử gì không |
| Giữa các ván | Làm chủ và khám phá | Chơi lại seed, đổi đế, mở cách chơi/scenario theo chiều ngang | Chọn một biến thể vì tò mò cách chơi, không chỉ vì phần thưởng đăng nhập |
| Sau khi core có sức hút | So cách giải với người khác | Seed thử thách tuần, chia sẻ biên niên hoặc nước đi | Người khác có hiểu và muốn tự giải thế đó không |

Polytopia là tham khảo cụ thể cho lớp cuối: thử thách tuần dùng cùng bản đồ, bộ tộc và đối thủ để so kết quả. Nó chứng minh một cơ chế tồn tại, không chứng minh cứ thêm leaderboard là giữ chân được. [M07]

Phần thưởng nên làm người chơi **có thêm điều muốn làm**: lấy cửa ải mở tuyến mới, thu phục tướng mở nước đi mới, cứu đồng minh tạo cơ hội phối hợp. Rương thưởng hoặc buff vĩnh viễn có thể tạo động lực khác, nhưng chưa sửa được sự thiếu quyền quyết định ở core. Tránh dùng tăng sức mạnh tài khoản để che việc người chơi không học được gì sau thất bại.

## B6. Session duration — phân biệt phiên, ván và chiến dịch

GameAnalytics 2025 đo **năm 2024**, trên 11.600 game tích hợp SDK: median session khoảng 5–6 phút, tổng chơi khoảng 22 phút/ngày, khoảng bốn phiên/ngày. Đây là thống kê nhóm game, không phải người Việt thích ván đúng năm phút, càng không phải giới hạn một cuộc tranh bá. Cách đóng/mở ứng dụng cũng ảnh hưởng đơn vị session. [M03]

Adjust báo strategy tăng **57% số session** năm 2025. Đó không phải tăng 57% độ dài phiên, số người hoặc nhu cầu campaign. Khác tập ứng dụng/phương pháp nên không ghép cơ học với GameAnalytics. [M04]

Đề xuất giữ mốc owner đã chọn và thêm khả năng ngắt quãng:

| Đơn vị | Mục tiêu thiết kế để thử | Ý nghĩa |
| --- | --- | --- |
| Lựa chọn đầu | Dưới 60 giây, theo DECISION | Người mới được tác động sớm |
| Một quyết định khi đã quen | Khoảng 5–20 giây ở tình huống đơn giản; cho phép nghĩ lâu hơn | Giảm thao tác không có giá trị, không ép người chơi ra lệnh theo đồng hồ |
| Một đoạn chơi | Khoảng 2–5 phút có tiến triển nhìn thấy | Hợp hoàn cảnh bị ngắt trên điện thoại |
| Một ván hoàn chỉnh | 15–25 phút khi quen, như DECISION; đo phân phối thực tế | Có mở, phát triển và kết thúc; có thể chia qua nhiều phiên |
| Lý do quay lại nhiều ngày | Đổi cách giải, đế hoặc scenario | Không cần kéo một ván thành vài ngày để có gắn bó dài |

Các mốc ngoài DECISION là **giả thuyết thử**, chưa được thị trường xác nhận. Cần autosave sau quyết định và tóm tắt tình hình khi quay lại. Nếu một ván mất 25 phút nhưng không thể dừng ở phút thứ ba, sản phẩm khó đáp ứng nhiều bối cảnh mobile dù tổng thời lượng “ngắn”.

98–209 chạm trung bình trong các chính sách spike 2 không chuyển được thành phút nếu chưa đo đọc, suy nghĩ, animation và gián đoạn. P90 hơn 500 chạm ở một cấu hình cảnh báo đuôi ván kéo dài. Nên đo cả median/p90 thời gian chủ động và tỷ lệ thoát giữa ván; không ép chạm thật nhanh để đạt KPI.

Không tự thêm hard cap số lượt trái DECISION. Kiểm tra nguyên nhân kéo dài trước: lặp tiến-lùi, ít lựa chọn có ích, quá nhiều xác nhận hay điều kiện thắng thiếu đoạn kết. Kết thúc cần cảm giác hoàn thành mục tiêu đã hứa, dù chưa chiếm toàn bản đồ.

## B7. Monetization — bán giá trị nào mà không phá lời hứa?

Đề xuất giai đoạn đầu: cho chơi miễn phí một trải nghiệm hoàn chỉnh đủ chứng minh core; sau đó thử **mua mở bản đầy đủ hoặc gói nội dung có cách chơi mới**. Đây là lựa chọn chiến lược phù hợp với lời hứa ván công bằng và phạm vi solo, chưa phải mô hình đã được chứng minh kiếm nhiều tiền nhất tại Việt Nam.

| Mô hình | Lợi ích | Rủi ro với sản phẩm này | Khuyến nghị |
| --- | --- | --- | --- |
| Một lần mở bản đầy đủ | Dễ hiểu, không cần can thiệp nhịp trận | Khó thuyết phục trả trước khi người chơi chưa tin core | Ứng viên ưu tiên sau demo miễn phí đủ giá trị |
| Gói đế/scenario theo chiều ngang | Thu tiền từ nhu cầu cách chơi mới | Chia nhỏ quá mức, đế trả tiền mạnh hơn hoặc tăng chi phí cân bằng | Thử sau khi chứng minh người chơi muốn đổi cách chơi |
| Cosmetic/biên niên trang trí | Ít ảnh hưởng luật | Game solo có thể có nhu cầu thấp; chưa có dữ liệu trả tiền | Để sau, không dự báo doanh thu từ thiện chí |
| Quảng cáo, nhất là rewarded ads | Giảm rào cản chi trả | Cần lượng người dùng; thưởng quân/hoàn tác phá so sánh ván, chen quảng cáo phá nhịp | Không đưa vào kiểm chứng core; chỉ xét khi có dữ liệu và lợi ích phù hợp |
| Gacha sức mạnh, bán quân, năng lượng | Có các mô hình thương mại thành công ngoài thị trường | Tạo nghĩa vụ kinh tế/vận hành và thay đổi lý do thắng-thua | Không phù hợp lời hứa V2 đang đề xuất |

Polytopia hỗ trợ mua bộ tộc một lần và không quảng cáo; review vẫn có người thấy tổng DLC quá đắt. Bài học là phải minh bạch giá trị của phần miễn phí và gói trả tiền, không phải cứ bán nội dung là người chơi sẽ hài lòng. [M15; B5]

Giá Steam tham khảo ở ngày đọc: Reigns gốc 2,99 USD, Reigns: The Witcher 5,99 USD. Đây chỉ là hai ví dụ premium trên một cửa hàng, không phải giá mobile Việt Nam hoặc khoảng giá tối ưu cho Emperors. Không tự đặt “79k sẽ bán được” khi chưa có thử nghiệm willingness-to-pay. [M14]

GameRefinery ghi nhận xu hướng phối hợp IAP và quảng cáo. Đó là mô tả thị trường, không phải chỉ dẫn mọi game phải dùng cả hai. Emperors cần biết ai quay lại trước khi tối ưu ai trả tiền. [M19]

Cách đo khi đến giai đoạn thương mại: tỷ lệ mua trong nhóm đã thật sự trải nghiệm, doanh thu ròng/người bắt đầu, mức hoàn tiền và ảnh hưởng lên chơi lại. Tách người đến từ cộng đồng với người mua qua quảng cáo. Doanh thu kỳ vọng = người chơi phù hợp tiếp cận được × tỷ lệ chơi được × tỷ lệ mua × tiền ròng mỗi người mua; hiện các biến quan trọng đều chưa được đo, nên chưa dự báo.

## B8. Genre trends — điều gì đang đổi, điều gì bị diễn giải sai?

1. **Mobile strategy vẫn có sức mua.** Báo cáo Sensor Tower 2026 và quan sát GameRefinery tháng 7–8/2026 cho thấy sức bật của 4X có cửa vào casual. “Mở đầu dễ” không đồng nghĩa “toàn bộ game ngắn”; nhiều game dẫn tới tiến trình dịch vụ dài. Chỉ học cách vào cuộc, không tự nhận toàn bộ mô hình sẽ phù hợp. [M01, M20]
2. **Có nhu cầu game gọn nhưng có chiều sâu.** 9 Kings, Thronefall và The King is Watching là các ví dụ đã có người mua/đánh giá, không phải tỷ lệ thành công của mọi indie làm tương tự. Đây là tập người thắng được chọn ra; chưa chứng minh một làn sóng đảm bảo thành công. [M09–M11]
3. **Campaign vẫn có thị trường.** CK3 công bố bốn triệu bản PC/console tháng 4/2025. Số bán không chứng minh mọi người hoàn thành campaign, nhưng đủ chống lại lời tuyệt đối rằng mô hình dài không còn ai muốn. [M17]
4. **Swipe không thể bị tuyên bố chết từ Steam CCU.** Reigns gốc có nội dung kỷ niệm mười năm trong tháng 8/2026; Reigns: The Witcher phát hành tháng 2/2026. Chúng không chứng minh swipe tăng trưởng hay phù hợp Emperors, nhưng cho thấy kết luận “đã chết” quá mạnh. Vấn đề chắc hơn là owner không thích agency của spike 2 hiện tại. [M14; B1]
5. **Kênh video tăng vai trò, nhưng phải phân biệt quảng cáo và nội dung tự nhiên.** Sensor Tower ghi nhận phần chi quảng cáo mobile trên YouTube tăng. Điều đó không chứng minh một clip chiến thuật sẽ tự lan truyền, hoặc người xem sẽ chơi game. Muốn dùng creator, phải đo việc họ hiểu tình huống, kể được nguyên nhân và đưa người xem tới đúng trải nghiệm. [M01]
6. **Giảm động cơ “strategic planning” không bằng giảm nhu cầu thể loại strategy.** Quantic Foundry đo dịch chuyển điểm động cơ trong mẫu tự chọn 2015–4/2024, nghiêng về người chơi PC/Bắc Mỹ/Tây Âu, loại Trung Quốc khỏi phân tích này. Không được đổi percentile 50→33 thành “67% người chơi bỏ strategy”, hoặc áp thẳng cho mobile Việt Nam. [M05]

Với xuyên không, tăng trưởng nội dung giải trí có thể gợi ý cách thu hút sự tò mò; chưa có bằng chứng ở đây rằng người đọc/xem sẽ chơi hoặc trả tiền cho Emperors. Lợi thế cần tự chứng minh là **tri thức của hoàng đế làm thay đổi nước đi**, chứ không chỉ làm hook quảng cáo.

## B9. Evidence synthesis — giữ, sửa và chưa biết

| Nhận định | Đối chiếu Claude / Grok / báo cáo ChatGPT trước | Kết luận sau audit | Độ chắc |
| --- | --- | --- | --- |
| Nên làm ván ngắn trước | Cả ba hướng về ngã rẽ 1, nhưng lập luận thị trường mạnh yếu khác nhau | Giữ như khuyến nghị về sản phẩm, khả năng kiểm chứng và owner input; không tuyên bố tệp này chắc chắn đông nhất | Vừa về hướng; thấp về product-market fit |
| Campaign bị bỏ dở nên nên bỏ campaign | Claude/Grok dùng achievement và completion làm luận cứ | Tỷ lệ mở achievement không phải tỷ lệ người bắt đầu rồi bỏ campaign; không đo hài lòng hoặc cầu thể loại. Bỏ suy diễn nhân quả | Cao về giới hạn phương pháp |
| Swipe chết hoặc không thể làm video | Grok B2–B3 diễn đạt tuyệt đối | Chưa được chứng minh. Steam CCU không đo mobile, hoàn thành truyện hay doanh thu trọn đời. Input swipe có thể phục vụ truyện; spike hiện tại có vấn đề agency cụ thể | Cao về giới hạn; vừa về nguyên nhân chán |
| Người chơi ít thích tư duy, strategy giảm | Claude dùng nghiên cứu động cơ, cả ba bàn cửa vào | Giữ nhu cầu vào dễ như giả thuyết; không đổi khảo sát động cơ thành quy mô/thị phần. Dữ liệu thương mại strategy còn tăng | Cao về sự phân biệt |
| Thắng-thua chưa tạo cảm xúc vì thiếu thưởng | Grok ghi owner feedback; demo đã có đất/tướng | Cần kiểm tra quyền tạo kết quả, ý nghĩa của kết quả và lý do chơi tiếp trước; chưa đủ cơ sở chỉ thêm meta là hết chán | Vừa |
| “Gật hết” thắng cao chứng minh không cần nghĩ | Grok nêu bảng mô phỏng, audit chạy lại được | Đây là báo động thiết kế/chính sách baseline, chưa là thí nghiệm về người thật hoặc tối ưu chiến thuật | Cao về số máy; thấp về khái quát người chơi |
| V1 AI đọc trộm vì hàm nền nhận full state | Grok B1 | Cần rút lại kết luận từ đoạn code đó: runtime có lớp perception ghi đè. Phải audit composed runtime mới kết luận toàn hệ thống | Cao về composition đã đọc |
| Prototype tách riêng là vi phạm freeze | Grok phê bình quy trình spike | Owner đã yêu cầu prototype trước implementation; tách spike hợp lệ. Không đưa luật thử thành luật khóa | Cao theo DECISION |
| Chỉ cần ván 10–15 phút là hợp mobile/YouTube | Một số so sánh ở Grok và research cũ | Chưa có phép đo tương đương giữa các đối thủ. Phiên khác ván; giữ 15–25 phút như mục tiêu owner, thêm lưu/tiếp tục | Cao về định nghĩa; thấp về thời lượng tối ưu |
| Demo có thể dùng để duyệt vui/ngắn ngay | Trạng thái chung cũ đang chờ owner rồi freeze | Lỗi thẻ cũ làm nhiễu playtest. Đã tái hiện UI 100% nhưng báo thua, raid từ đất ta và scout đất ta | Cao tại commit/seed đã ghi |

Những thứ chưa có bằng chứng: quy mô tệp Việt Nam yêu sử + strategy ngắn; bản Loạn 12 Sứ Quân anh nhớ; retention thực tế; giá chấp nhận; “xuyên không” tạo chuyển đổi mua; người chơi có thích map input hơn nếu cùng một hệ thống đã được sửa. Các con số doanh thu của genre lớn, lượt xem video hay doanh số một hit không lấp được các lỗ hổng này.

Định nghĩa “chiều sâu” dùng cho bước tiếp: **có ít nhất hai kế hoạch hợp lý trong một thế; hoàn cảnh khiến kế hoạch tốt thay đổi; người chơi thấy hệ quả và điều chỉnh được**. Đây là tiêu chí làm prototype của em, không phải định nghĩa học thuật hoặc luật đã được owner duyệt.

## B10. Ý kiến của em và giải pháp đề xuất

### B10.1. Nếu viết bằng giọng một người mua game khó tính

Đoạn sau là **đánh giá giả lập do em viết từ audit**, không phải review thật trên Steam, không phải lời của người thử và không hàm ý em đã chơi cảm ứng:

> Ý tưởng hoàng đế xuyên không làm tôi muốn thử. Nhưng tôi muốn tự lấy một thành, chấp nhận để hở một nơi khác và sống với hậu quả. Hiện game chọn sẵn chỗ đánh, tướng và quân; phần của tôi thường là đồng ý. Khi thẻ còn hứa chắc thắng rồi báo thua bằng một tên “null”, tôi không biết phải học gì. Thêm rương sau ván chưa khiến tôi muốn làm lại. Hãy cho tôi một thất bại mà tôi hiểu, và một phương án khác mà tôi muốn tự thử.

Phán quyết hiện tại: **chưa có đủ bằng chứng để giới thiệu spike 2 như một game đã tìm được core vui**. Có chất liệu để tiếp tục: fantasy rõ, thang mở rộng từ địa phương tới thiên hạ, tướng có thể thành người đáng nhớ. Nhưng hoàn thiện màu sắc, animation hoặc kéo dài chiến dịch lúc này đều không trực tiếp giải quyết chỗ thiếu quyền chơi.

### B10.2. Định hướng

Lời hứa đề xuất: **“Một ván tranh bá: tự mình lật một thế Tam Quốc.”**

- Ván ngắn là sản phẩm chính; giữ khả năng tạm dừng và tiếp tục trên điện thoại.
- Bản đồ là nơi chọn ý định. Thẻ là nơi nhận lời cầu viện, đàm phán, xử tù binh hoặc nghe tướng đề xuất. Quẹt có thể vẫn là cách trả lời những việc ấy.
- Mỗi lượt chỉ cần một quyết định lớn; mở chi tiết khi người chơi chạm vào nơi liên quan. Ít nút luôn hiện, nhưng có quyền chọn đích và mức rủi ro.
- Xuyên không tạo cách giải khác nhau. Tướng và đất phải có tác dụng mà người chơi gọi tên được; nguồn replay chủ yếu đến từ kế hoạch khác, không từ thêm số lượt.

Đây là **đề nghị sửa phần input** của DECISION sau trigger owner đã chán; chưa tự thay quyết định swipe đã ghi. Cũng không đồng nghĩa làm giao diện Civ/Total War đầy đủ trên màn hình nhỏ.

### B10.3. Một tình huống mẫu để định nghĩa “được chơi”

Ví dụ thiết kế, chưa có trong luật hiện hành: ta giữ thành và kho lương, đối phương báo dấu hiệu chuẩn bị đánh kho ở lượt sau; phía tây có cửa ải mở một tuyến mới. Người chơi chọn:

| Ý định | Lợi ích | Cái giá nhìn thấy |
| --- | --- | --- |
| Đưa chủ lực lấy ải | Có tuyến mở rộng và vị trí chặn địch | Kho lương chỉ còn quân giữ nhỏ |
| Điều tướng về giữ kho | Giữ nguồn nuôi quân và có thể phản công | Bỏ lỡ cơ hội lấy ải lúc địch còn yếu |
| Bỏ một phần lương để xin viện | Có cơ hội giữ kho trong khi đánh ải | Đổi nguồn lực và mắc nghĩa vụ cụ thể với đồng minh |

Không cần hiện một bảng mười loại thuế. Cần hiện đúng ba thứ tại điểm chọn: **được gì, bỏ gì, vì sao rủi ro như vậy**. Người chơi phải được đổi phương án; nút xác nhận không được giả làm quyền chọn. Nếu thử nghiệm thấy ba phương án quá nặng, chỉ giữ hai phương án có khác biệt thực, không để hệ thống tự chọn tất cả rồi hỏi có/không.

Kết quả sau lệnh nên cho thấy “kho mất vì chủ lực rời đi”, “tướng giữ được nhờ địa hình” hoặc “đồng minh tới vì hiệp ước”. Có thể dùng khoảng/ước lượng nếu thông tin chưa đủ; không in xác suất chính xác từ thông tin cũ hoặc bí mật rồi gọi đó là minh bạch.

### B10.4. Bản sắc đế, thành quả và câu chuyện

Đề xuất thử bản sắc bằng **nước đi mới hoặc trade-off mới**, không chỉ tăng hiệu suất: Tần huy động nhanh nhưng hao dân tâm; Lý dùng người/thu phục để mở lựa chọn; Chu ưu tiên giữ đất và phát triển căn cứ; Hán Vũ dùng ngựa/đường giao thương để mở chiến thuật khác. Đây là hướng thiết kế giả định, không phải kết luận lịch sử mới hoặc spec đã khóa. Chỉ làm sâu một cặp đế trong lát cắt đầu để biết người chơi có thực sự đổi kế hoạch.

Khi từ thành lên châu, giữ ít nhất một di sản nhìn thấy và có tác dụng: công trình quê nhà, vị tướng tự thu phục hoặc tuyến lương tự xây. Không cần mang mọi con số qua; cần người chơi nhận ra công sức không mất đi vô cớ. Nếu phải chuyển ở mùa 9, giải thích bằng tình thế và cho thấy hệ quả, rồi kiểm tra owner có chấp nhận.

Kết thúc ván trả ba giá trị: biết vì sao kết thúc; nhớ một nước đi của mình; nhìn thấy một thử nghiệm đáng làm ở ván sau. Biên niên chỉ hữu ích khi gắn với lựa chọn thật. Nút “chơi lại cùng thế” giúp tự kiểm chứng “nếu lần trước giữ kho thì sao”; đổi đế giúp kiểm chứng “cùng thế, cách khác”.

## B11. Làm tiếp theo thứ tự nào?

Đây là đề xuất công việc sau research, **chưa phải code đã thực hiện hoặc freeze mới**. Không mở thêm vòng research rộng, không yêu cầu owner tổ chức nghiên cứu 18 người vốn đã bị từ chối trong DECISION.

| Thứ tự | Việc nhỏ để giải quyết bất định | Điều cần thấy trước khi đi tiếp |
| --- | --- | --- |
| P0 — độ tin cậy | Revalidate thẻ với state hiện tại; làm mới dự báo, bỏ thẻ không còn hợp lệ mà không thu phí; thống nhất thông tin dự báo và xử lý | Seed đã ghi không còn raid từ đất mình, scout đất mình, hoặc dự báo thuộc trạng thái cũ |
| P1 — quyền chơi | Một lát cắt nhỏ có chọn mục tiêu và hai kế hoạch thực; hiển thị hệ quả ngay trên bản đồ, chi tiết mở theo ngữ cảnh | Owner chọn vì có ý định, kể được điều vừa thay đổi, không cần người hướng dẫn diễn giải hộ |
| P2 — chơi tiếp | Lưu/tiếp tục, giảm xác nhận thừa, kết ván có nguyên nhân, thử lại cùng seed | Ngắt ở giữa rồi tiếp tục hiểu; chủ động muốn thử một phương án khác |
| P3 — biến thể và thương mại | Đổi đế/cách chơi; sau đó mới kiểm tra gói trả tiền hoặc lớp social | Replay tồn tại trước khi thêm nghĩa vụ đăng nhập hay phần thưởng tiền tệ |

Giữ owner chơi trước. Cho hai thế ngắn có thể chơi lại, ghi màn hình/thời gian nếu owner đồng ý với việc ghi; hỏi “anh đang muốn làm gì?” và “nếu chơi lại, anh đổi gì?”. Quan sát lựa chọn tự phát; tránh giải thích để khiến người chơi trả lời đúng ý designer.

Nếu còn tranh luận map với swipe, thử cùng **một tình huống và một bộ luật đã sửa**, thay cách ra lệnh trong một lát cắt nhỏ. Không làm hai game hoàn chỉnh khác cả UI lẫn luật rồi quy hết khác biệt cho thao tác. Sau khi đưa lên Pages và owner thấy ổn, có thể mời 5–8 người phù hợp chơi để tìm lỗi hiểu/cảm nhận; đó là kiểm chứng định tính nhẹ, không đủ chứng minh retention hoặc thị phần.

Mốc >40% chủ động chơi lại trong DECISION là mục tiêu kiểm chứng, không phải chuẩn thị trường. Khi đo cần ghi cả số người và mẫu số: tỷ lệ hoàn thành trên **mọi người mới đủ điều kiện đã bắt đầu**, tỷ lệ chơi lại trên mọi người bắt đầu, và tỷ lệ chơi lại trong nhóm đã xong một ván; tách thắng/thua và lỗi kỹ thuật. Không chỉ lấy người sống sót đến màn cuối để tô đẹp số liệu. Với mẫu nhỏ, báo “3/7 người” cùng lý do thay vì kết luận đạt product-market fit.

D1/D7 chỉ có ý nghĩa khi có cohort thật và quy tắc tính thống nhất. Benchmark GameAnalytics có D7 median khoảng 3,42–3,94% trong tập năm 2024, nhưng khác thể loại, acquisition và mẫu; không đặt đó làm mục tiêu tốt cho Emperors. Cần tìm người quay lại vì muốn chơi, không chỉ tăng số session bằng nhắc nhở. [M03]

**Tiêu chí bác bỏ hướng đề xuất:** sau khi sửa tính đúng, trao quyền chọn và làm rõ kết quả, owner cùng người thử phù hợp vẫn chỉ muốn bấm cho xong, không có ý định cho ván sau; hoặc tệp yêu sử muốn gắn bó với cùng một triều đại nhiều buổi hơn là bắt đầu lại. Khi đó mới có bằng chứng mạnh hơn để đổi lời hứa sang campaign hoặc truyện tương tác. Báo cáo này không thay được bước thử đó.

## B12. Nguồn và khả năng truy vết

Tất cả truy xuất 28/09/2026. Các URL dưới đây là tài liệu/trang đã đọc; không hàm ý đã mua báo cáo đầy đủ. Số cửa hàng là snapshot, có thể thay đổi. Tách nguồn chính thức về **sản phẩm** khỏi lời người chơi về **trải nghiệm**; cả hai đều có thiên lệch riêng.

- **M01 — Sensor Tower, State of Gaming 2026**, công bố 26/02/2026, dữ liệu 2025: [press release](https://sensortower.com/press/press-release-sensor-tower-state-of-gaming-gaming-drove-52-billion-downloads-82b-iap-revenue-on-mobile-and-12b-premium-revenue-on-steam). Dùng cho IAP mobile, tăng trưởng strategy và kênh quảng cáo YouTube; không suy ra doanh thu ads hoặc organic conversion.
- **M02 — Sensor Tower, Southeast Asia Mobile Gaming 2025**, dữ liệu Q1/2025: [bài phân tích](https://sensortower.com/blog/southeast-asia-mobile-gaming-2025). App Store/Google Play; lượt cài mới khác người duy nhất, không gồm mọi kênh Android.
- **M03 — GameAnalytics, 2025 Mobile Gaming Benchmarks**, dữ liệu 01/01–31/12/2024: [báo cáo công khai và methodology](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks). Tập game tích hợp SDK, không phải mẫu toàn thị trường Việt Nam.
- **M04 — Adjust, Mobile App Trends 2026**, dữ liệu 2025: [trang báo cáo](https://www.adjust.com/resources/ebooks/mobile-app-trends-2026). Số session strategy, không phải độ dài session.
- **M05 — Quantic Foundry**, 21/05/2024: [Strategy decline](https://quanticfoundry.com/2024/05/21/strategy-decline/). Dữ liệu khảo sát động cơ, không đo thị phần thể loại; cần giữ giới hạn mẫu.
- **M06 — Devolver, Reigns**: [trang sản phẩm](https://www.devolverdigital.com/games/reigns). Nguồn chính thức về định dạng quyết định và nền tảng; dùng đối chiếu phân loại Reigns ở B3.
- **M07 — Midjiwan**, 09/06/2025: [Weekly Challenges are Now Here](https://polytopia.io/weekly-challenges-are-now-here/). Cơ chế thử thách cùng seed, bộ tộc và đối thủ; không thay luật chế độ thường.
- **M08 — Reigns: Three Kingdoms**: [Steam](https://store.steampowered.com/app/2437040/Reigns_Three_Kingdoms/). Mô tả và review aggregate toàn bộ ngôn ngữ tại lúc đọc.
- **M09 — 9 Kings**: [Steam](https://store.steampowered.com/app/2784470/9_Kings/). Mô tả và aggregate tiếng Anh; đang Early Access ở snapshot. Review chi tiết ở B5 là nguồn riêng của từng tác giả.
- **M10 — Thronefall**: [Steam](https://store.steampowered.com/app/2239150/Thronefall/). Mô tả và aggregate tiếng Anh; không đại diện mobile.
- **M11 — The King is Watching**: [Steam](https://store.steampowered.com/app/2753900/The_King_is_Watching/). Cơ chế vùng chú ý; không dùng để ước lượng run length chưa đo.
- **M12 — Into the Breach**: [Steam](https://store.steampowered.com/app/590380/Into_the_Breach/). Thông tin đòn đánh của địch và bài toán chiến thuật; ví dụ thiết kế, không cùng fantasy Emperors.
- **M13 — OpenFront**: [Steam](https://store.steampowered.com/app/3560670/OpenFront/). Số người web do developer công bố, ngày EA, kế hoạch nền tảng; chưa kiểm toán retention hoặc DAU.
- **M14 — Reigns tiếp tục có sản phẩm/nội dung**: [Reigns gốc](https://store.steampowered.com/app/474750/Reigns/) và [Reigns: The Witcher](https://store.steampowered.com/app/1651600/). Thông báo kỷ niệm 10 năm tháng 8/2026, ngày phát hành Witcher 25/02/2026 và giá niêm yết lúc đọc; không dùng để suy doanh số.
- **M15 — Midjiwan support**: [FAQ chính thức](https://polytopia.io/support/). Mua bộ tộc và không quảng cáo; phản ứng người mua DLC được dẫn riêng ở B5.
- **M16 — Rise of Kingdoms**: [Google Play](https://play.google.com/store/apps/details?id=com.lilithgame.roc.gp&hl=en). Mô tả alliance/strategy, nhãn ads/IAP; review hiển thị của Christian (22/07/2026), Gydeon X (26/05/2026), Ash Romero (10/07/2026). Mẫu nhỏ do cửa hàng chọn hiển thị, không suy tần suất phàn nàn.
- **M17 — Paradox**, 23/04/2025: [Crusader Kings III Passes Four Million Sales](https://www.paradoxinteractive.com/media/press-releases/paradox-interactive/crusader-kings-iii-passes-four-million-sales). Số bán PC/console do nhà phát hành công bố.
- **M18 — Steam review API, mẫu B5**: [Reigns: Three Kingdoms](https://store.steampowered.com/appreviews/2437040?json=1&language=english&filter=all&day_range=365&review_type=negative&purchase_type=all&num_per_page=5), [9 Kings](https://store.steampowered.com/appreviews/2784470?json=1&language=english&filter=all&day_range=365&review_type=negative&purchase_type=all&num_per_page=5), [Polytopia](https://store.steampowered.com/appreviews/874390?json=1&language=english&filter=all&day_range=365&review_type=negative&purchase_type=all&num_per_page=5), [Thronefall](https://store.steampowered.com/appreviews/2239150?json=1&language=english&filter=all&day_range=365&review_type=negative&purchase_type=all&num_per_page=5). Với mỗi game đã gọi thêm `review_type=positive`, giữ nguyên tham số khác. Response có thể thay đổi theo thời gian; B5 lưu profile URL, ngày và giờ chơi của 12 trường hợp đã sử dụng. Không dùng sample này tính tỷ lệ hài lòng.
- **M19 — GameRefinery**, 04/09/2025: [Top Monetization Trends in the Mobile Games Market](https://www.gamerefinery.com/top-monetization-trends-in-the-mobile-games-market/). Xu hướng mô hình phối hợp; không phải unit economics của Emperors.
- **M20 — GameRefinery**, 15/09/2026: [Mobile Game Market Review: July–August 2026](https://www.gamerefinery.com/mobile-game-market-review-july-august-2026/). Quan sát casualized 4X và live operations, không chứng minh demand cho game solo ngắn.

Nguồn nội bộ: [`claude.md`](claude.md) A–I; [`grok.md`](grok.md) B0–B7 và A; [`DECISION.md`](../DECISION.md); [`spike/rules.js`](../spike/rules.js); [`spike/sim.js`](../spike/sim.js); [`spike2/Main.dc.html`](../spike2/Main.dc.html); [`spike2/sim.js`](../spike2/sim.js); [`game.html`](../../../../game.html) và [`src/engine/perception.js`](../../../../src/engine/perception.js), tại `9d30411`.


## C. Cảnh trận kiểu Civ VI và chân dung tướng (28/09/2026, khuya)

> Chủ dự án dán vào hội thoại với Claude sau khi chơi demo 1, ghi là "Feedback từ phía team a". Giữ nguyên văn (kể cả dấu trích dẫn của ChatGPT); câu hỏi gốc không kèm theo.

**Có thể làm battle scene mang cảm giác Civ VI, nhưng để đạt độ hoàn thiện hình ảnh như Civ VI là việc khó và tốn công.** Với Emperors, em sẽ nhắm tới **một cảnh giao chiến ngắn, rõ thế trận và có điểm nhấn**, thay vì mô phỏng hàng nghìn lính đánh nhau như Total War.

Repo đã có nền 3D, camera hành quân, đội quân dạng instance, bụi và cờ đổi chủ. :chatgpt-content-reference{index="3"}[Prototype battle](sandbox:/workspace/scratch/7315840af024/emperors/docs/design/prototypes/real.html) cũng đã dựng đội hình, máy bắn đá và khói. Nhưng trong :chatgpt-content-reference{index="4"}[luồng game đang chạy](sandbox:/workspace/scratch/7315840af024/emperors/src/world/event-presenter.js), trận đánh vẫn là cảnh quân tới thành rồi hiện kết quả; chưa có lính thực sự giao chiến hay bộ animation trận hoàn chỉnh. :chatgpt-content-reference{index="5"}[Hướng hình ảnh hiện hành](sandbox:/workspace/scratch/7315840af024/emperors/docs/design/direction.md) đã chọn bản đồ chiến dịch kèm cắt cảnh trận, nên không phải bắt đầu từ số không.

| Khó khăn chính | Vì sao khó |
| --- | --- |
| **Lính và animation** | Cần mẫu lính, vũ khí, đội hình, chạy, đánh, trúng đòn và rút lui trông thống nhất. Đây là khoảng cách lớn nhất giữa prototype và cảnh trận thuyết phục. |
| **Đọc được trận trong vài giây** | Người chơi phải thấy ai đánh, địa hình có tác dụng gì, vì sao thắng hoặc thua. Nhiều hiệu ứng đẹp mà không rõ kết quả sẽ làm cảnh trận kém giá trị. |
| **Hiệu năng mobile web** | Camera hạ thấp sẽ lộ chi tiết lính, thành và mặt đất; đồng thời tăng gánh cho GPU điện thoại. Cần giới hạn số lính nhìn thấy và dùng nhiều mức chi tiết. |
| **Nhịp chơi** | Nếu mỗi lệnh đánh đều bắt xem một cảnh dài, ván 15–25 phút sẽ bị ngắt liên tục. Cần tua và bỏ qua được. |

Em đề xuất làm **một vertical slice 3–5 giây**: một địa hình, hai phe, hai loại lính, một tướng, ba kết quả dễ phân biệt (thắng, thua, giữ thành). Luật tính kết quả trước; cảnh trận diễn lại đúng kết quả và đúng thông tin người chơi được biết. Khi lát cắt này chạy mượt trên điện thoại và anh vẫn muốn xem ở trận thứ mười, mới mở rộng số loại quân và cảnh. Đây là phạm vi khả thi để thử trong vài tuần với người làm 3D và người làm Three.js; mức hoàn thiện đồng đều như game thương mại lớn sẽ cần nhiều tháng sản xuất asset và animation. Đó là ước lượng phạm vi của em, chưa phải báo giá.

**Ảnh tướng TW3K thì không nên lấy làm asset cho Emperors**, kể cả screenshot cắt mặt, texture trích từ game, ảnh fan chỉnh màu hay dùng ảnh đó để vẽ đè. EULA của SEGA giữ quyền đối với artwork, hình ảnh và nhân vật được thể hiện trong game; quyền làm mod được giới hạn cho mod dùng với sản phẩm của họ. Hướng dẫn dùng hình cho video/thumbnail cũng không cấp quyền đưa hình ấy vào một game độc lập. Muốn dùng trực tiếp cần giấy phép phù hợp từ chủ quyền. :chatgpt-content-reference{index="0"}

**Mình có thể tự xây chân dung Quan Vũ, Tào Tháo, Gia Cát Lượng** từ tư liệu lịch sử và một art direction riêng: cùng ngôn ngữ ánh sáng, trang phục, bảng màu, khung chân dung; tránh sao chép khuôn mặt, giáp và bố cục đặc trưng của bản TW3K. Bản quyền bảo vệ cách thể hiện cụ thể, không bảo hộ bản thân ý tưởng lịch sử; :chatgpt-content-reference{index="6"}[tài liệu nhân vật trong repo](sandbox:/workspace/scratch/7315840af024/emperors/docs/product/characters.md) cũng đã ghi rõ dùng roster/tư liệu sử nhưng không copy portrait hay mesh. :chatgpt-content-reference{index="1"}

Nếu là tiền của anh, em sẽ đầu tư trước vào **một bộ tướng và một trận mẫu có bản sắc Emperors**. Chất lượng của mẫu đó sẽ cho mình biết mục tiêu “như Civ VI” cần thêm bao nhiêu công, trước khi đặt hàng cả roster.
