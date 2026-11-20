# Tài Liệu Giả Định Kỹ Thuật (Assumptions) — Phase 1: PRD-0

Dưới đây là các giả định thiết kế và kỹ thuật được xác định rõ ràng theo nguyên tắc Karpathy trước khi code:

## 1. Hệ tọa độ & Đo lường
- Không gian 3 chiều: Trục Y hướng lên trên, mặt phẳng mặt đất đảo tại Y = 0.
- Vị trí xuất phát của Mây: `(0, 0, 0)`.
- Mọi phép đo khoảng cách cho va chạm và tương tác (nhặt đom đóm, nạp đèn, xua quái, va chạm quái) đều được tính trên mặt phẳng ngang XZ: $d = \sqrt{(x_1 - x_2)^2 + (z_1 - z_2)^2}$.
- "Trong bán kính $r$": $d \le r$.
- Tọa độ trong file output JSONL được làm tròn 3 chữ số thập phân (`toFixed(3)` / làm tròn $10^{-3}$).

## 2. Thông số Gameplay (Tuning)
- `player_speed`: 6.0 m/s (tương đương 0.1 m / tick ở 60 ticks/s).
- `carry_capacity`: 5 (số đom đóm mang tối đa).
- `lantern_cost`: 3 (số đom đóm cần nạp để thắp sáng 1 đèn).
- `lantern_count_night1`: 5 đèn (L1, L2, L3, L4, L5) bố trí tròn quanh đảo ở bán kính R = 25m.
- `pickup_radius`: 1.5m. Khi Mây bước vào phạm vi đom đóm và túi chưa đầy (`carried < carry_capacity`), đom đóm tự động được nhặt.
- `interact_radius`: 2.5m quanh chân đèn. Khi nhấn `interact` (rising edge false -> true), Mây nạp toàn bộ số đom đóm đang mang vào đèn cho đến khi đủ `lantern_cost`.
- `pulse_cost`: 1 đom đóm. Mây phải có ít nhất 1 đom đóm đang mang để kích hoạt tỏa sáng.
- `pulse_radius`: 6.0m. Làm choáng mọi Bóng Mực trong bán kính 6m.
- `pulse_stun_s`: 3.0s (180 ticks).
- `pulse_push_m`: 3.0m (đẩy lùi Bóng Mực ra xa Mây thêm 3m).
- `pulse_cooldown_s`: 1.0s (60 ticks).
- `night1_duration_s`: 180s (3 phút).
- `flames`: 3 (máu khởi điểm của Mây).
- `invuln_s`: 2.0s (120 ticks bất tử sau khi bị Bóng Mực đánh trúng).
- `hit_drop_ratio`: 0.5 (rơi $\lfloor carried \times 0.5 \rfloor$ đom đóm khi bị chạm).
- `safe_radius`: 5.0m. Vùng an toàn quanh Đèn Lớn ĐÃ THẮP (`lit = true`). Bóng Mực không thể tiến vào vùng an toàn này.
- `shade_speed`: 3.5 m/s.
- `shade_hit_radius`: 1.0m.
- `fall_enabled`: false (không có cơ chế rơi vực ở Phase 1).

## 3. Hệ thống điểm số (Score)
- Nhặt 1 đom đóm: +10 điểm (`per_mote: 10`).
- Thắp sáng 1 đèn: +100 điểm (`per_lantern: 100`).
- Làm choáng 1 Bóng Mực: +20 điểm (`per_stun: 20`).
- Khi Thắng (all 5 lanterns lit):
  - Cộng điểm thời gian còn lại: $\lfloor time\_left\_s \rfloor \times 1$ (`per_second_left: 1`).
  - Cộng điểm máu còn lại: $flames \times 50$ (`per_flame_left: 50`).

## 4. Tính tất định (Determinism)
- Sử dụng thuật toán sinh số ngẫu nhiên Mulberry32 với seed nguyên từ tham số `--seed`.
- Toàn bộ việc sinh đom đóm ngẫu nhiên, sinh Bóng Mực và ID tự sinh đều đi qua PRNG này, đảm bảo 2 lần chạy cùng seed + cùng inputs sẽ cho output giống nhau 100%.
