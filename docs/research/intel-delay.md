# Sương mù, tình báo và tin trễ trong game chiến lược — hàm ý cho Tam Quốc Loạn Nhập

> Nghiên cứu 2026-09-27. Không bàn thắng/thua, kinh tế, tướng (agent khác lo). Mỗi ý có link; mục 7 liệt kê thứ chưa kiểm chứng được.

**Tóm tắt.** Các game khảo sát làm ba việc với thông tin: *che* theo tầm nhìn kề (Civ, TW3K, Diplomacy Fog of War), *bán* tin theo cấp (Civ: 5 cấp tầm nhìn ngoại giao; ROTK 8: lệnh Do thám hạn 12 tháng; ROTK 14 PK: tài nguyên "quân tình"), *làm nhiễu* theo nguồn (Dominions: sai số 0–50 % tuỳ nguồn; Command Ops: dấu "vị trí cuối" và cảnh báo tin cũ; Kriegsspiel: trọng tài giữ thư một hai lượt hoặc đưa cho địch). Tin *trễ* thật sự chỉ có ở Kriegsspiel, Command Ops, Flashpoint. Sử liệu Hán: công văn đi hết bản đồ trong 1–3 tuần, tin dân gian 1–2 tháng — đều ngắn hơn một mùa, nên "trễ một lượt" chỉ nên áp cho *lời đồn*, không cho *sự kiện công khai*.

## 1. Civilization VI

| Lớp | Cơ chế | Nguồn |
| --- | --- | --- |
| Sương mù | Chưa khám phá (đen) → đã khám phá nhưng mất tầm nhìn (giữ địa hình, tài nguyên, thành, kỳ quan; **ẩn quân**) → đang thấy. Không có tầm nhìn vĩnh viễn. | [Fog of war](https://civilization.fandom.com/wiki/Fog_of_war), [Steam](https://steamcommunity.com/app/289070/discussions/0/340412122409528184) |
| Tầm nhìn | Đa số quân 2 ô; settler/vài tàu 3; máy bay ≥4; thành nhìn 1 ô ngoài biên; thương nhân, gián điệp cũng cho tầm nhìn. | [Sight](https://civilization.fandom.com/wiki/Sight_(Civ6)) |
| 5 cấp tầm nhìn ngoại giao | None → Limited → Open → Secret → Top Secret. Mỗi thứ +1 cấp với một nước: phái đoàn/đại sứ, tuyến thương mại, Listening Post, liên minh; tech Printing và Catherine +1 với mọi nước. Gián điệp và liên minh không cộng dồn. | [Civilopedia](https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_4/), [Delegations](https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_8/) |
| Mỗi cấp lộ gì | None: tuyên chiến, lên án, kết bạn, liên minh, lập tôn giáo, kỳ quan xong. Limited: ý kiến về bạn, thể chế. Open: agenda, quan hệ với nước khác. Secret/Top Secret: bấm thành xem chi tiết; gossip "tăng quân", "chuẩn bị chiến tranh", đổi chiến lược thắng. | [Wiki](https://civilization.fandom.com/wiki/Diplomatic_Visibility_and_Gossip_(Civ6)), [LadiesGamers](https://ladiesgamers.com/civilization-6-switch-beginners-guide-7-diplomacy/) |
| Gossip | Thông báo **ngay trong lượt**, không trễ, gom vào Gossip report. Rất nhiều loại: luyện quân, xây quận, đổi chính sách, bao vây thành, "Attack launched", "Preparation for war". | [Gossip Trim](https://steamcommunity.com/sharedfiles/filedetails/?id=1699536058) |
| Gián điệp | Mở ở Renaissance; tối đa ~5. Nhiệm vụ 8–16 lượt; tỉ lệ cơ bản: Siphon Funds/Fabricate Scandal/Foment Unrest 56 %, Sabotage/Steal Tech 35 %, Heist/Partisans 10–20 %. Listening Post +1 cấp khi đang chạy; Gain Sources: gián điệp ở thành đó tính cao hơn 2 cấp trong 24 lượt. | [Spy](https://www.civilopedia.net/en-US/rise-and-fall/units/unit_spy/), [GameRant](https://gamerant.com/civilization-6-spies-steal-great-works-gold/) |
| Bị bắt | Kết quả: thành công / thất bại không lộ / bị bắt / bị giết. Counterspy **ẩn**, không hiện trong tỉ lệ bạn thấy, kéo cơ hội "xuống gần 0". Bị bắt → có thể chuộc; nước bị do thám giảm thiện cảm mạnh. | [Civilopedia](https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_5/), [Steam](https://steamcommunity.com/app/289070/discussions/0/3441214221465032698/), [CivFanatics](https://forums.civfanatics.com/threads/secrets-about-spies.607065/) |
| Thưởng chiến đấu | +3 sức chiến đấu mỗi *bậc chênh* tầm nhìn, tối đa +12; Mông Cổ gấp đôi. Tuyên chiến huỷ phái đoàn/thương mại nên chỉ giữ được qua Mông Cổ, Printing, Listening Post. | [Wiki](https://civilization.fandom.com/wiki/Diplomatic_Visibility_and_Gossip_(Civ6)), [CivFanatics](https://forums.civfanatics.com/threads/diplomatic-visibility-and-combat.651343/) |

Người chơi biết "X đang làm gì" bằng ba kênh chồng nhau: thấy quân trên bản đồ, dòng gossip *mở khoá theo cấp*, gián điệp nâng cấp tạm. Civ chỉ *che*, không *nhiễu*.

## 2. Total War: Three Kingdoms

- **Lượt = một mùa**, 5 mùa/năm. [Seasons](https://totalwar.fandom.com/wiki/Seasons_(Total_War:_Three_Kingdoms))
- **Sương mù chiến dịch**: không có đơn vị trinh sát; "sương che hết, đôi khi không thấy cả chủ châu kề"; muốn nhìn phải dùng gián điệp. [Steam](https://steamcommunity.com/app/779340/discussions/0/1651045226226978167/)
- **Undercover Network**: thả nhân vật để phe địch *tự tuyển*; *ngay khi đang xin việc* đã lộ vàng, lương, dân số, số thành, thái thú của địch. Hai tài nguyên: Undercover Network (toàn phe) và Cover (tích luỹ theo lượt). Thất bại/thiếu tài nguyên → bị bắt → xử, thả, hoặc bị *lật thành gián điệp hai mang*. Dấu hiệu: tướng địch lâu năm bỗng xin về với ta. [Gamepressure](https://www.gamepressure.com/total-war-three-kingdoms/undercover-network-spies/z4c47f)
- **Thang leo**: mới vào → tầm nhìn thành địch; lên tướng → *thấy quân địch di chuyển*; thái thú → tác động thành; thừa kế → châm nội chiến. CA: "hành động của gián điệp luôn thành công, rủi ro nằm ở bị lộ". [PCGamesN](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-spies-espionage)
- **Hành động cấp tướng**: Infiltrate Army, Leak Marching Orders, Falsify Marching Orders, Deny/Poison Military Provisions. [Gaming Nexus](https://www.gamingnexus.com/News/43117/The-Spy-Segment-of-Total-War-Three-Kingdoms-is-one-facet-of-a-complex-game). Discredit cần "tầm nhìn tới tướng đang ra trận". [Steam](https://steamcommunity.com/app/779340/discussions/0/1742266965426880610)
- **Ngoại giao công khai**: màn ngoại giao liệt kê phe *đã biết*, rê chuột xem hiệp ước giữa hai phe bất kỳ, ai đánh ai, thứ hạng sức mạnh; nút "group by faction" xem khối. [TW Academy](https://academy.totalwar.com/campaign-diplomacy/), [Steam](https://steamcommunity.com/app/779340/discussions/0/1642038749323192193/)
- **AI nhìn xuyên sương?** Cộng đồng khẳng định "AI luôn thấy cả bản đồ"; không có tuyên bố chính thức của CA. [Steam](https://steamcommunity.com/app/779340/discussions/0/1637536330460245435/)

## 3. Koei — Sangokushi

Đính chính: XI và XIV **theo lượt 10 ngày**; XII/XIII mới là thời gian thực có tạm dừng.

| Bản | Nhịp / ngân sách lệnh | Tình báo và tin giả |
| --- | --- | --- |
| VII | Tháng; mỗi tướng/chúa có Action Points (trần 200), hết AP thì nghỉ tháng. | Lệnh Spy "thu tin một thành"; kỹ năng Spy nhìn nhiều thành và các thành lân cận. [Kongming](https://kongming.net/faqs/romance-of-the-three-kingdoms-vii/three_kingdoms_vii.html) |
| VIII Remake | Tháng, AP theo lệnh. | Espionage: "biết độ bền, quân và tướng của thành", **luôn thành công, hạn 12 tháng**, làm mưu dễ thành hơn; tự đi được thành kề, xa hơn phải do thám. Mưu: Estrange, Destroy, Provoke, Collude, Spy. [Manual](https://www.koeitecmoamerica.com/manual/rtk8-remake/en/5100.html), [Namu](https://en.namu.wiki/w/%EC%82%BC%EA%B5%AD%EC%A7%80%208%20%EB%A6%AC%EB%A9%94%EC%9D%B4%ED%81%AC/%EA%B2%8C%EC%9E%84%20%EC%8B%9C%EC%8A%A4%ED%85%9C) |
| XI | Lượt 10 ngày; hành động lực toàn phe hồi mỗi lượt theo số thành, thống suất/mị lực chúa, trí quân sư; ~25/thành, trần 255. | **Không sương mù** — thấy toàn thiên hạ. Lưu ngôn 200 vàng, hạ trung thành + trị an; thành bại so trí quân sư ta với quân sư, thái thú, mị lực chúa địch. Trên trận: Nguỵ báo (lừa địch rút), Hoả kế, Nhiễu loạn. [Baidu](https://baike.baidu.com/en/item/Romance%20of%20the%20Three%20Kingdoms%20XI/1530826), [GamerSky AP](https://www.gamersky.com/handbook/200603/21611.shtml), [Sohu](https://www.sohu.com/a/337285985_120099898), [GamerSky mưu](https://www.gamersky.com/handbook/200603/21607.shtml) |
| XIII | Thời gian thực, 3 tốc độ, tạm dừng; nhiệm vụ tốn ngày; INT quyết kết quả nhiệm vụ Nhân sự/Chiến lược/Ngoại giao. | [Koei wiki](https://koei.fandom.com/wiki/Romance_of_the_Three_Kingdoms_XIII), [GameFAQs](https://gamefaqs.gamespot.com/ps4/160302-romance-of-the-three-kingdoms-xiii/faqs/80274) |
| XIV | Lượt 10 ngày, 3 lượt/tháng; "Orders" tiêu khi ra lệnh, hồi theo diện tích đất. | Mưu: Hidden Poison, Estrange, Placation, Unattended Home, Dual Destruction — thành bại theo INT tướng làm + INT chúa ta *đối* INT chúa địch, trị an, quan hệ. PK: **False Information** (dẫn quân địch vào bẫy; đặc tính Seer/Careless), Hoài Nam giảm giá mưu. PK CE: tài nguyên **quân tình** — Điệp báo (đặt quan tình báo → tin định kỳ) hoặc Trinh sát (phái tướng → nhiều tin một lần); *tiêu quân tình để nâng tỉ lệ hiện trên màn* của mưu/ngoại giao, địch cũng tiêu; Tuần thị giảm mưu địch. [Manual](https://www.koeitecmoamerica.com/manual/rtk14wpk/en/3300.html), [Plots](https://www.koeitecmoamerica.com/manual/rtk14/en/4300.html), [PK](https://www.koeitecmoamerica.com/rtk14/wpk/pk.html), [PK CE](https://www.gamecity.ne.jp/sangokushi14/wpk/ce/jp/feature/system.html) |

Bài học Koei: tin *có hạn sử dụng*; tin *làm mưu dễ thành* (tình báo là tiền đề của mưu); thành bại mưu và tin giả là *đấu INT hai bên*; ROTK XI bỏ hẳn sương mù mà vẫn hay vì cạnh tranh nằm ở ngân sách lệnh.

## 4. Wargame và boardgame: trễ, che, nhiễu

| Trò | Cơ chế | Nguồn |
| --- | --- | --- |
| Kriegsspiel (1824) | Lượt 2 phút; bản đồ thật chỉ trọng tài giữ; lệnh viết tay; quân chỉ đặt lên bàn khi *cả hai bên thấy*; trọng tài **giữ thư một hai lượt, không giao, hoặc giao cho địch**. | [Wikipedia](https://en.wikipedia.org/wiki/Kriegsspiel), [IKS](https://kriegsspiel.org/faq/) |
| Diplomacy | Lệnh viết kín, lật cùng lúc; **không giấu quân, không xúc xắc**; đàm phán được nói dối. Biến thể Fog of War: chỉ thấy ô mình đứng + ô kề; quân *đứng yên* thành đài quan sát. | [Wikipedia](https://en.wikipedia.org/wiki/Diplomacy_(game)), [vDiplomacy](https://www.vdiplomacy.com/variants.php?variantID=30), [DipWiki](http://dipwiki.com/index.php?title=Fog_of_War) |
| Battles of Bull Run | Quân úp, thêm quân **giả**, viết trước lộ trình; lật khi kề nhau. | [Wikipedia](https://en.wikipedia.org/wiki/The_Battles_of_Bull_Run) |
| Command Ops 2 | Địch hiện dưới dạng *báo cáo tình báo*, nhìn xa nhận nhầm loại; rời tầm thì giữ **vị trí cuối thấy**; "đừng lập kế trên tin cũ, mơ hồ". Lệnh trễ ~30 phút, sửa theo chỉ huy, tham mưu, sức khoẻ. | [Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1223954053), [Steam](https://steamcommunity.com/app/521800/discussions/0/2139714324761590469/) |
| Flashpoint Campaigns | WeGo; chu kỳ lệnh NATO 10 phút, WP 18–19; **kéo dài** khi mất sẵn sàng, mất HQ, quân ngoài bán kính chỉ huy. | [OTS](https://ontargetsimulations.com/guides/coldwar/fieldmanuals/basic-tutorials/command-and-control/) |
| Radio General | Chỉ nghe báo cáo; đơn vị mất liên lạc, **phóng đại**, lạc đường. | [Steam](https://store.steampowered.com/app/1011610/Radio_General/) |
| Rule the Waves 2 | Tin về tàu địch có thể sai; do thám tăng căng thẳng; bị đánh cắp mà không biết ai. | [Naval Gazing](https://www.navalgazing.net/Rule-the-Waves-2-Game-1-January-1902), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/RuleTheWaves) |
| Dominions 5 | Lượt đồng thời; **sai số theo nguồn**: bói 0 %, gián điệp 10 %, trinh sát 30 %, mặc định 50 % ("khoảng N quân"); thực tế 50–200 % báo cáo. | [illwiki](https://illwiki.com/dom5/user/loggy/scoutreports), [Steam](https://steamcommunity.com/app/722060/discussions/0/1500126447381672721/) |
| Unity of Command 2 | Sương phủ nhưng **HQ và kho tiếp tế địch luôn hiện**; tù binh/trinh sát tạo intel marker; thẻ Ultra xoá sương một lượt. | [Steam](https://steamcommunity.com/app/809230/discussions/0/591770212722839085/), [Dev diary](https://unityofcommand.net/blog/2017/12/07/developer-diary-14-fog-of-war/) |

Chris Crawford: sương mù "hợp lý, cần trinh sát" thì thêm hứng thú; quá thật thì hết vui. [Wikipedia](https://en.wikipedia.org/wiki/Fog_of_war)

**Nguyên tắc**: *che* số quân và lệnh của phe không kề; *giữ công khai* mốc lớn (chủ đất, hiệp ước, HQ) để bàn cờ đọc được; *trễ* chỉ với tin gián tiếp và trễ phải *thấy được* (nhãn tuổi tin); *nhiễu* theo nguồn, thang rõ; tin giả *luôn cắm được* nhưng *bị lộ có giá*; đứng yên/củng cố phải có giá trị quan sát.

## 5. Neo lịch sử: tin đi nhanh bao nhiêu thời Hán

- Luật *Hành thư* (Trương Gia Sơn): "bưu nhân hành thư, một ngày một đêm 200 dặm"; chậm nửa ngày 50 roi; bưu đặt mỗi 10 dặm (20 dặm nam Giang, 30 dặm Bắc Địa/Thượng/Lũng Tây). [NWUPL](https://zhfx.nwupl.edu.cn/hsdt/100049.htm), [BSM](http://m.bsm.org.cn/?hanjian%2F4277.html=)
- Quân báo khẩn 300 dặm/ngày. [Baidu](https://baike.baidu.com/en/item/Eight-hundred-li%20urgent%20dispatch/1459597). Chiếu khẩn Đông Hán: ba kỵ thay nhau, 1 000 dặm một ngày đêm; Kim Thành ↔ Trường An có hồi đáp trong 7 ngày; trạm Hà Tây cách nhau 50–90 dặm (20,8–37,4 km). [CSSN](https://cssn.cn/kgxc/kgxc_kgsb/202207/t20220728_5431431.shtml), [QQ](https://news.qq.com/rain/a/20240307A07ZYW00)
- Đi bộ thường dân 50–70 dặm/ngày (nhật ký đời Tống, dùng làm sàn). [NEAC](https://www.neac.gov.cn/seac/c103391/202302/1161230.shtml). Dặm Hán = 415,8 m. [Wikipedia](https://en.wikipedia.org/wiki/Li_(unit))
- Áp lên `data/world.json` (đường chim bay từ `lonlat`; đường bộ thật dài hơn 1,3–1,5×):

| Tuyến | km ≈ dặm Hán | 200 d/ng (công văn) | 300 (khẩn) | 70 (dân) |
| --- | --- | --- | --- | --- |
| Lạc Dương – Thành Đô | 920 ≈ 2 200 | 11 ngày | 7 | ~32 |
| Thành Đô – Kiến Nghiệp | 1 405 ≈ 3 400 | 17 | 11 | ~48 |
| Lạc Dương – Phiên Ngung | 1 291 ≈ 3 100 | 16 | 10 | ~44 |
| Hứa Xương – Tương Dương | 280 ≈ 670 | 3,4 | 2,2 | ~10 |

Kết luận: "tin từ A tới B mất một tháng" đúng cho *tin dân gian* xuyên bản đồ; công văn, sứ giả mất 1–3 tuần. Cả hai **ngắn hơn một mùa (~90 ngày)**: sự kiện đầu mùa ở đâu cũng tới mọi triều đình trước mùa sau. Cái *chưa tới* là **chi tiết đáng tin** (số quân, ý đồ) — đó mới là thứ nên trễ và nhiễu.

## 6. Hàm ý cho Tam Quốc Loạn Nhập

Ràng buộc freeze: 1 phe / 1 lệnh / lượt, không tiền tệ mới, không chồng %, referee tất định, `decide` chỉ nhận `DecisionContext`. Đề xuất chỉ thêm *lớp chiếu tin* (`projectPerception`, `provinceIntel`, `publicNews`) và một mưu trong `Engine.STRATAGEMS`; không đổi máy chiến đấu. Lane engine là của Grok — đây là đề bài, không phải code.

### (a) Nguồn tin và mỗi nguồn lộ gì

| Nguồn | Điều kiện | Lộ | Độ tin | Mẫu |
| --- | --- | --- | --- | --- |
| Châu mình | luôn | số thật | `exact` | như nay |
| Kề biên | châu kề châu mình | band, tướng giữ, luỹ, *loại lệnh* phe đó vừa ra nếu lệnh chạm ô kề | `seen` | Civ thành nhìn 1 ô; Diplomacy FoW |
| Đồng minh | pact có clause `alliance` | **chia sẻ `seen` của nhau** (hợp hai tập kề) | `seen` | Civ liên minh +1 cấp; TW3K gián điệp lên tướng thấy quân |
| Do thám | mưu `spy(pid)`, đích ≤ 2 bước từ đất mình | số quân ±10 % làm tròn nghìn, tướng, luỹ, band lương; **hạn 4 lượt** (= 12 tháng ROTK 8) | `spy` | ROTK 8 Espionage; Dominions gián điệp 10 % |
| Lời đồn | mọi phe không kề, tự động, **trễ 1 lượt** | loại lệnh lượt trước của phe đó + band ±1 nấc | `rumor` | Civ gossip nhưng có trễ; Dominions 50 % |
| Công khai | luôn, cùng lượt | đổi chủ châu, pact ký/vỡ/từ chối, phe chết, Hiến Đế ở đâu, hai cảnh kịch bản, mốc coalition/late-war | `public` | TW3K màn ngoại giao; UoC2 HQ luôn hiện |

Điểm mới so với hôm nay: đồng minh chia sẻ tầm nhìn (liên minh *đáng ký*), lời đồn trễ một lượt ("ai đang làm gì" *có câu trả lời* nhưng cũ), do thám là mưu có hạn dùng.

### (b) Trễ và tuổi tin

- **Cùng lượt**: kết quả lệnh mình, quan sát kề, tin công khai, tin đồng minh chia sẻ.
- **Lượt sau**: lời đồn về lệnh của phe không kề; kết quả do thám (sứ đi về trong mùa, báo cáo mô tả *trạng thái đầu lượt*, dùng lượt sau).
- **Tuổi**: giữ `lastSeenTurn`; HUD in "Tin hiện tại / Cũ N mùa / Lời đồn / Chưa rõ" (đã có 3 nhãn đầu). Tin cũ tự nới band một nấc mỗi 2 mùa; sau 6 mùa về `unknown`. Mẫu: Command Ops giữ vị trí cuối và cảnh báo tin cũ.
- Không trễ tin công khai: sử liệu (mục 5) cho thấy chúng tới trong mùa; trễ chúng chỉ làm bàn cờ khó đọc.

### (c) Nhiễu và lừa

- **Nhiễu tất định theo nguồn** (chỉ qua `rng` seed): `seen` = band đúng; `rumor` = band ±1 nấc theo seed lượt; `spy` = số thật ±10 %. Thang như Dominions nhưng dùng nấc thay %.
- **Mưu "hư báo"** (cạnh discord/burn/defect): chọn phe nạn nhân và một châu; lượt sau `provinceIntel` của nạn nhân về châu đó nhận band giả (ép "mạnh" để doạ, "yếu" để dụ) hoặc lời đồn giả "X sắp đánh Y". Theo TW3K: **luôn cắm được**, rủi ro là **bị lộ**.
- **Phản gián tất định, không %**: tin giả vô hiệu ngay nếu nạn nhân có nguồn tốt hơn về châu đó (`seen`/`spy`/đồng minh) — nguồn cao ghi đè nguồn thấp. Nếu nạn nhân ra `fortify` hoặc `internal` *trên châu bị nhắm* cùng lượt (Tuần thị ROTK 14 / counterspy Civ), tin giả **lộ kèm tên kẻ cắm** → `grudge` tăng, vào `publicNews` ("Tào Tháo phao tin giả về Kinh Châu"). Không lộ thì tin giả sống đúng **một lượt** rồi bị sự thật lượt sau ghi đè (Kriegsspiel giữ thư một hai lượt).
- Chỉ *nạn nhân* bị nhiễu; referee luôn dùng truth (Truth ≠ Perception).

### (d) Ước lượng trước trận theo chất lượng tin

Không cộng sức chiến đấu theo tin (Civ +3/bậc là "máy hai giá", trái freeze). Tin chỉ **thu hẹp khoảng ước lượng** và mở lựa chọn `from`:

| Nguồn tốt nhất về châu đích | Khoảng quân địch hiển thị | Câu HUD |
| --- | --- | --- |
| `spy` ≤ 4 mùa | ±10 % quanh số do thám | "Do thám: ~38 nghìn, tin cậy cao" |
| `seen` | [lo, hi] của band (`weak` ≤25k, `medium` 25–45k, `strong` 45–90k) | "Quân vừa (25–45 nghìn)" |
| `seen` cũ N mùa | band nới 1 nấc mỗi 2 mùa | "Cũ 3 mùa: vừa hoặc mạnh" |
| `rumor` | band ±1 nấc, đánh dấu lời đồn | "Lời đồn: yếu đến vừa" |
| `unknown` | không số | "Chưa rõ — do thám hoặc kết minh với láng giềng" |

Kết luận trận = so `self.troops` với khoảng trên: "chắc thắng / ngang ngửa / mạo hiểm / mù", không in %. AI dùng band như nay; tin `spy` cho AI chỉ là band hẹp hơn (không số) để giữ test counterfactual "cùng band → cùng `decide`".

### (e) Phải công khai để bàn cờ đọc được

Chủ châu (đánh lẫn annex), mọi pact và phản ứng (ký, từ chối, vỡ), phe chết và ai kết liễu, Hiến Đế ở đâu, hai cảnh kịch bản, mốc coalition/late-war, **tin giả bị lộ**. Giữ ẩn: số quân phe không kề, thương vong địch, lệnh không chạm biên, mưu không bị lộ, danh tính đế ẩn.

## 7. Chưa kiểm chứng được

- ROTK VIII gốc (2001) "mỗi tướng một việc mỗi tháng": không có nguồn đọc được; chỉ có Remake và cheat "mưu một lần mỗi kỳ hội nghị". [GameFAQs](https://gamefaqs.gamespot.com/ps2/914672-romance-of-the-three-kingdoms-viii/cheats)
- ROTK XIV có thấy số quân thành địch không: diễn đàn nói XIV không sương mù (sương chỉ ở 3, 7, 8, 12), manual chưa xác nhận. [Tieba](https://tieba.baidu.com/p/6212601306)
- TW3K: AI nhìn xuyên sương và hiệu ứng chính xác của Falsify Marching Orders — chỉ có lời cộng đồng/preview.
- Civ VI gossip *không* trễ; "gossip trễ một lượt" ở mục 6 là đề xuất của ta.
- Tốc độ tin thời Hán là định mức luật và kỷ lục; mùa mưa, giặc giã chậm hơn; khoảng cách tính đường chim bay.
- Fandom, GameFAQs, BGG chặn máy; các mục đó dẫn tóm tắt tìm kiếm hoặc nguồn thay thế.
