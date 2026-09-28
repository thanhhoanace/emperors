> Tool: ChatGPT · Phase: `v2-gameplay`
> Ngày research: 2026-09-28 · Ngày đưa vào repo: 2026-09-28
> Nguồn: `emperors-v2-market-direction-2026-09-28.md`; nội dung báo cáo bên dưới được giữ nguyên văn.
> Trạng thái: research inbox; chưa phải quyết định hoặc luật đã khóa.

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
