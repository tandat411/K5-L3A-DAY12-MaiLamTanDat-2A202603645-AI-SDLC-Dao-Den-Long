# Báo Cáo Retrospective — Dự Án Đảo Đèn Lồng (AI SDLC)

> **Tác giả:** Mai Lâm Tấn Đạt (2A202603645)  
> **Dự án:** Game 3D Đảo Đèn Lồng — Lab Day 12 AI SDLC  
> **Thời gian hoàn thành:** 2026-11-20  

---

## 1. Đánh Giá Toàn Diện 4 Phase Phát Triển

### Phase 1 — Khởi Tạo & Hợp Đồng v1.0 (Đêm 1: Đảo Bến)
- **Mục tiêu:** Xây dựng core simulation tất định 60 tick/s, không phụ thuộc DOM để chạy headless test tự động, dựng bản 3D Three.js tối giản.
- **Hiệu quả:**
  - Tách bạch 100% logic toán học (`src/engine.js`) và tầng biểu diễn WebGL (`src/index.html`) theo triết lý Andrej Karpathy giúp vượt qua test hợp đồng tự động ngay lần chạy đầu tiên.
  - Bộ sinh số giả ngẫu nhiên Mulberry32 đảm bảo tính tất định hoàn toàn giữa các lượt chạy cùng seed.
- **Thách thức:** Cân chỉnh tọa độ không gian 3D giữa trục camera và ma trận màn hình để nhân vật di chuyển trực quan.

### Phase 2 — Chuẩn Hóa Số Liệu & Mở Rộng 3 Đêm (Contract v1.1)
- **Mục tiêu:** Đồng bộ số liệu vật lý chuẩn (tốc độ chạy 6.0 m/s, nhảy 7.0 m/s, lướt 14 m/s), xây dựng 3 Đêm (Đảo Cau với bục nhảy, Đảo Chuông 3 tầng kèm gió bão), thêm Gió Lạc và Bùa Gió.
- **Hiệu quả:**
  - Thiết kế bảng dữ liệu cấu hình tập trung trong `game.contract.json` giúp thay đổi thông số gameplay mà không cần viết lại logic lõi.
  - Tích hợp bộ tổng hợp âm thanh procedural bằng Web Audio API (không dùng file âm thanh bên ngoài), giữ repo siêu nhẹ và độc lập.
- **Thách thức:** Xử lý va chạm dốc nghiêng và bục nhảy trên không cần tính toán độ cao sàn `getGroundHeight(x, z)` chính xác theo góc cực.

### Phase 3 — Change Request "Đèn Cạn Dầu" (Contract v1.2)
- **Mục tiêu:** Thay đổi luật cốt lõi (đèn hao dầu 1.0/s, Bóng Mực hút dầu 5.0/s khi đèn dưới 30% dầu, thắp lại tốn 5 đom đóm, thắng khi sống sót tới bình minh với ít nhất 60% đèn sáng).
- **Hiệu quả:**
  - Viết tài liệu ADR (Architectural Decision Record) và cập nhật CHANGELOG.md trước khi viết mã giúp định hình rõ ràng phạm vi breaking changes.
  - Cơ chế đom đóm mở rộng sức chứa (+2 con mỗi lần thắp thành công) tạo động lực vòng lặp gameplay rõ rệt.
- **Thách thức:** Xử lý hồi quy các test cũ do điều kiện thắng chuyển từ "thắp hết đèn thắng ngay" sang "sống sót tới bình minh". Cần cập nhật test kịch bản có giải trình minh bạch.

### Phase 4 — Phiên Bản Phát Hành v1.0.0 (Contract v1.3)
- **Mục tiêu:** Đo lường hiệu năng (Benchmark 30s với 200 quái, 100 đom đóm, camera xoay 15s/vòng), Soak test 10 Đêm liên tục kiểm tra rò rỉ bộ nhớ, Bảng xếp hạng cục bộ Top 10 kèm CLI export, Bộ tính năng trợ năng (accessibility).
- **Hiệu quả:**
  - Benchmark đạt 86.2 FPS trung bình, P1 low đạt 75.2 FPS (vượt xa ngưỡng yêu cầu 60/30 FPS).
  - Soak test hoàn thành 10 đêm với 0 crash, tỷ lệ bộ nhớ duy trì ổn định (mem_end <= 1.2 * mem_start).
  - Bộ công cụ trợ năng toàn diện: tùy biến đổi phím có phát hiện trùng, cảnh báo phụ đề hình ảnh, chế độ mù màu, giảm chuyển động và cỡ chữ lớn.

---

## 2. Phân Tích Lỗi Của AI & Tinh Chỉnh Harness

### Các lỗi AI điển hình trong quá trình phát triển:
1. **Lỗi phạm vi biến khi refactor Web UI (`ReferenceError: now is not defined`):**
   - *Hiện tượng:* Khi nâng cấp hàm nhấp nháy đèn 1Hz, AI đã truyền biến `now` vào hàm khởi tạo đêm `startNight()` ở ngoài vòng lặp hoạt họa, khiến giao diện bị kẹt tại màn hình chọn đêm.
   - *Cách phát hiện:* Kiểm tra nhật ký console của trình duyệt và rà soát diff của git.
   - *Khắc phục:* Thay bằng `performance.now()` và bổ sung dọn dẹp bộ nhớ mesh khi đổi đêm.
2. **Lỗi giả định thông số cũ trong kịch bản kiểm thử:**
   - *Hiện tượng:* Khi nâng cấp từ Phase 1 lên Phase 2, một số test cũ bị fail do chi phí nạp đèn tăng từ 3 lên 10. AI ban đầu có xu hướng sửa code logic để test cũ pass thay vì nhận diện đây là thay đổi chuẩn của spec.
   - *Khắc phục:* Dựa vào quy định trong `AGENTS.md` (Contract v1.1 là chân lý) để cập nhật lại kịch bản test và ghi chú lý do rõ ràng.

### Harness nào giúp ích nhiều nhất?
- **File `AGENTS.md`:** Là mỏ neo quan trọng nhất. Quy định rõ ràng về 12 bước trong thứ tự tick của game engine giúp AI không bị xáo trộn logic khi bổ sung tính năng mới.
- **Quy tắc Karpathy (Simplicity First):** Ràng buộc AI không được cài đặt bừa bãi các thư viện nặng, giữ toàn bộ dự án gọn gàng, chạy nhanh và dễ debug.
- **Test Runner tích hợp sẵn của Node.js (`node --test`):** Giúp kiểm tra hồi quy sau mỗi thao tác sửa mã với thời gian chạy chưa đầy 300ms, không tốn token cấu hình Jest/Mocha.

---

## 3. Quản Lý Token & Tối Ưu Hóa Chi Phí

| Giai đoạn | Token đầu vào (ước tính) | Token đầu ra (ước tính) | Tổng Token | Chi phí ước tính |
|---|---|---|---|---|
| Chuẩn bị (CP0) | ~6,000 | ~2,500 | ~8,500 | ~$0.01 |
| Phase 1 | ~18,000 | ~7,000 | ~25,000 | ~$0.04 |
| Phase 2 | ~24,000 | ~11,000 | ~35,000 | ~$0.06 |
| Phase 3 | ~22,000 | ~10,000 | ~32,000 | ~$0.05 |
| Phase 4 | ~26,000 | ~12,000 | ~38,000 | ~$0.06 |
| **Tổng cộng** | **~96,000** | **~42,500** | **~138,500** | **~$0.22** |

### Các kỹ thuật tiết kiệm token hiệu quả nhất:
1. **Batching Tool Calls:** Gộp các thao tác đọc file, tạo file và chạy lệnh trong cùng một lượt gọi công cụ thay vì chia nhỏ nhiều turn.
2. **Surgical Edits:** Chỉ dùng `edit_file` với đoạn thay thế tối thiểu thay vì ghi đè lại toàn bộ file nguồn.
3. **Prompt cô đọng:** Đưa thẳng yêu cầu, thông số và tiêu chí chấp nhận, tránh giải thích dài dòng.

---

## 4. Bài Học Kinh Nghiệm (Nếu Làm Lại Sẽ Thay Đổi Gì?)
1. **Thiết lập schema hợp đồng kiểm thử v1.x ngay từ đầu:** Nếu quy hoạch các trường mở rộng (như nhiên liệu đèn, bùa, gió) theo cấu trúc module ngay từ Phase 1, các phase sau sẽ giảm thiểu tối đa việc refactor.
2. **Tự động hóa chụp ảnh kiểm chứng (Visual Snapshotting):** Xây dựng một kịch bản chụp ảnh canvas WebGL tự động trong headless để có bằng chứng thị giác tức thì sau mỗi commit.
3. **Phân tách file Web UI thành các component nhỏ hơn:** Giữ file `index.html` dưới 400 dòng bằng cách tách riêng module âm thanh và module trợ năng để dễ bảo trì.
