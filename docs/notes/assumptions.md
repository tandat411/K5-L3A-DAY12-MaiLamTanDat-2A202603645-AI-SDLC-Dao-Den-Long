# Tài Liệu Giả Định Kỹ Thuật (Assumptions) — Phase 3: Ticket-03

## 1. Acceptance Criteria theo Ticket-03 (DoD)
- **AC-1 (Nhiên Liệu Đèn):**
  - Đèn vừa thắp có `fuel = 100`.
  - Giảm $1/60$ fuel mỗi tick khi `lit = true`.
  - Châm dầu: Khi `lit = true` và `fuel < 100`, nạp `min(carried, ceil((100 - fuel)/10))`. Mỗi đom đóm tăng 10 fuel.
  - Khi `fuel <= 0`: Chuyển `lit = false`, `deposited = 0`, phát `lantern_out`.
  - Thắp lại (`ever_lit = true`): Chỉ cần 5 đom đóm.
- **AC-2 (Bóng Mực Hút Dầu):**
  - Khi `fuel < 30`: Mất vùng an toàn 6m.
  - Bóng Mực `wander` tìm đến đèn sáng có `fuel < 30` gần nhất. Cách $\le 2$m chuyển sang `drain`, đứng yên và hút 5 fuel/s (5/60 mỗi tick).
  - Phát `fuel_drain` mỗi 60 ticks khi đang hút.
  - Khi đèn được châm lên $\ge 30$: Đẩy quái trong 6m ra ngoài trong 30 ticks.
- **AC-3 (Luật Thắng Mới):**
  - Không kết thúc game khi thắp đủ đèn.
  - Thắng khi `time_left_s <= 0` và số đèn sáng $\ge \lceil 0.6 \times tổng \rceil$ (Đêm 1: 3/5; Đêm 2: 4/6; Đêm 3: 5/7). Lý do: `dawn_survived`.
  - Thua khi `flames <= 0` (`no_flames`) hoặc hết giờ không đủ đèn (`dawn`).
- **AC-4 (Sức Chứa Đom Đóm Động):**
  - $Capacity = \min(20, 10 + 2 \times successful\_lights)$.
- **AC-5 (Điểm Số Mới):**
  - Nạp đom đóm: +5/con.
  - Thắp lần đầu: +100.
  - Thắp lại: +40.
  - Tỏa sáng: +5 (nếu quái đang drain: +15).
  - Thắng: +50/ngọn lửa + (50 + floor(fuel)) mỗi đèn sáng.

## 2. Xử lý hồi quy các test cũ
- Test `Deposit and Win Scenario` ở Phase 1-2 kiểm tra thắng ngay khi thắp đèn (`all_lit`). Vì Ticket-03 đã thay thế luật `all_lit` bằng `dawn_survived`, test này được cập nhật để kiểm tra hành vi nạp đủ đèn và thắp sáng, trong khi luật thắng mới được kiểm chứng qua scenario `dawn_survived` của Phase 3.
