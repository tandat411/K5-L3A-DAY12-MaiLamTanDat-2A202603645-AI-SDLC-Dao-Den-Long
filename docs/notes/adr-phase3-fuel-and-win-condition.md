# Architecture Decision Record (ADR) — Phase 3: Change Request "Đèn Cạn Dầu"

## Trạng Thái
Đã Chấp Nhận (Accepted) — Áp dụng từ Phase 3 (Ticket-03, Contract v1.2).

## Bối Cảnh
Sau đợt playtest Phase 2, người chơi hoàn thành việc thắp toàn bộ đèn chỉ sau 2 phút, dẫn tới việc kết thúc game sớm và thiếu sự kịch tính ở giai đoạn cuối Đêm. Nhà sản xuất đưa ra Change Request (Ticket-03) nhằm chuyển dịch trọng tâm mục tiêu gameplay: từ *"thắp hết đèn để thắng sớm"* sang *"quản lý tài nguyên, giữ đảo sáng tới khi bình minh"*.

## Các Quyết Định Thiết Kế (Design Decisions)

### 1. Thay đổi mô hình trạng thái Đèn Lồng (Lantern Lifecycle)
- **Cơ chế Nhiên Liệu (Fuel):**
  - Mỗi đèn có `fuel` tối đa 100.
  - Khi thắp (mới hoặc thắp lại): `fuel = 100`.
  - Tự động hao hụt: $1.0$ đơn vị/giây (tức $1/60$ đơn vị mỗi tick).
  - Khi `fuel <= 0`: Đèn tắt (`lit = false`), phát sự kiện `lantern_out`, ghi nhớ `ever_lit = true`.
- **Cơ chế Châm Dầu (Refuel):**
  - Mây có thể nạp thêm đom đóm vào đèn đang sáng chưa đầy dầu (`fuel < 100`).
  - Mỗi đom đóm hồi 10 fuel. Đèn đầy dầu (100) không nhận thêm.
- **Thắp lại (Relight):**
  - Đèn chưa từng sáng: Cần 10 đom đóm (+100 điểm).
  - Đèn đã từng sáng (`ever_lit = true`): Chỉ cần 5 đom đóm (+40 điểm).

### 2. Hành vi mới của Bóng Mực (Shade Drain)
- **Vùng an toàn suy yếu:** Đèn có `fuel < 30` sẽ mất vùng an toàn 6m.
- **Trạng thái Drain:** Bóng Mực ở trạng thái `wander` sẽ tìm đến đèn có `fuel < 30` gần nhất, khi cách $\le 2$m chuyển sang `drain`, đứng yên và hút 5 fuel/giây.
- **Đẩy lùi khi hồi phục:** Khi đèn được châm dầu lên $\ge 30$, các Bóng Mực trong vùng 6m lập tức bị đẩy ra mép an toàn trong 30 ticks.
- **Thưởng Tỏa Sáng:** Tỏa Sáng trúng Bóng Mực đang `drain` được thưởng +15 điểm (thay vì +5).

### 3. Thay đổi Luật Thắng/Thua (Win Condition Overhaul)
- **Bỏ Thắng Sớm:** Thắp đủ 5/6/7 đèn không còn kết thúc game sớm.
- **Thắng tại Bình Minh (`dawn_survived`):**
  - Mây sống sót tới hết thời gian (`time_left_s <= 0`) VÀ số đèn đang sáng $\ge \lceil 0.6 \times \text{tổng đèn} \rceil$.
  - Ngưỡng: Đêm 1: 3/5 đèn; Đêm 2: 4/6 đèn; Đêm 3: 5/7 đèn.
- **Thua:** Mất hết Ngọn Lửa (`no_flames`) hoặc tới bình minh không đủ số đèn sáng tối thiểu (`dawn`).

### 4. Hệ thống Sức Chứa Tăng Dần (Dynamic Capacity)
- Sức chứa túi đom đóm: $Capacity = \min(20, 10 + 2 \times successful\_lights)$.

## Hậu Quả & Đánh Giá
- **Tương thích ngược:** Các kịch bản test cũ kỳ vọng game thắng ngay khi thắp đèn (`all_lit`) bị phá vỡ. Chúng ta đã cập nhật test cũ sang kiểm tra hành vi nạp/thắp đèn và thêm scenario kiểm tra luật thắng mới `dawn_survived`.
- **Hiệu năng:** Việc tính toán hao hụt nhiên liệu theo tick $1/60$ được tối ưu hóa số nguyên/float nhẹ, đảm bảo tốc độ mô phỏng vẫn đạt < 40ms cho 21,600 ticks.
