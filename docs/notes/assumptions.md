# Tài Liệu Giả Định Kỹ Thuật (Assumptions) & Acceptance Criteria — Phase 2

## 1. Acceptance Criteria theo Ticket-02 (DoD)
- **AC-1 (Di chuyển, Nhảy & Lướt):**
  - Tốc độ chạy 6.0 m/s (khi có Bùa Gió: 7.2 m/s).
  - Nhảy: $v_y = 7.0$ m/s, $g = -20$ m/s², chỉ nhảy khi grounded.
  - Lướt: 14 m/s trong 12 ticks (0.2s), hồi chiêu 90 ticks (1.5s). Lướt trên không giữ nguyên độ cao ($v_y = 0$). Có Bùa Gió hồi chiêu = 0.
- **AC-2 (Đom đóm & Đèn lồng):**
  - Sức chứa 10 đom đóm. Nhặt khi $XZ \le 1.0$m và $|Y_{player} - Y_{mote}| \le 1.5$m.
  - Đèn cần 10 đom đóm. Tương tác trong 2.0m. Chọn đèn gần nhất chưa thắp.
  - Vùng an toàn 6m quanh đèn sáng: Bóng Mực không thể tiến vào.
- **AC-3 (Tỏa Sáng):**
  - Tốn 3 đom đóm, hồi chiêu 3s (180 ticks), bán kính 3D $\le 5.0$m từ tâm $(pos.x, pos.y + 0.8, pos.z)$.
  - Choáng 120 ticks, 15 ticks đầu bị đẩy tổng 4m. Cộng +5 điểm/quái trúng chiêu.
- **AC-4 (Bóng Mực & Bị Đánh & Rơi Vực):**
  - Tốc độ 4.0 m/s (Đêm 3: 4.5 m/s). Phát hiện 12m, bỏ đuổi 18m.
  - Va chạm $XZ \le 1.0$m và $\Delta Y \le 1.5$m: Mất 1 Flame, rơi $\lfloor carried/2 \rfloor$ đom đóm ra vành 1.5–2.5m (tồn tại 480 ticks), bất tử 90 ticks, quái recoil 2m trong 60 ticks.
  - Rơi khỏi đảo ($Y < -10$): Mất 1 Flame, mất TOÀN BỘ đom đóm (`lost: carried`). Đợi 60 ticks rồi hồi sinh tại (0,0,0), bất tử 90 ticks. Hết Flame thì thua ngay.
- **AC-5 (Gió Lạc - Drifter):**
  - Tối đa 2 con, xuất hiện ở Đêm 2 và 3. Tốc độ 7 m/s (idle 2 m/s).
  - Khi Mây có $\ge 5$ đom đóm và cách $\le 15$m: đuổi.
  - Chạm $XZ \le 1.2$m: cướp $\min(3, carried)$ đom đóm rồi flee 240 ticks.
  - Tỏa Sáng trúng: nếu đang chase chuyển flee không cướp; nếu đang flee thả lại toàn bộ đom đóm đã cướp tại chỗ.
- **AC-6 (Bùa Gió - Charm):**
  - Đêm 2 tại (35,0,0); Đêm 3 tại (30,0,25) và (-30,0,25).
  - Tác dụng 600 ticks: Tốc độ 7.2 m/s, lướt không hồi chiêu. Hồi lại sau 2700 ticks.
- **AC-7 (Bản đồ 3 Đêm & Bục Nhảy):**
  - Đêm 1: Đảo tròn bán kính 40m, 5 đèn.
  - Đêm 2: Hai đảo bán kính 28m tại (0,0,0) và (70,0,0) nối bằng cầu tre $x \in [26, 44], z \in [-2, 2]$. 2 bục nhảy tại (20,0,18) và (50,0,-18) bắn Mây sang đảo đối diện ($V_y = 14$, $V_{horizontal} = 24$). 6 đèn.
  - Đêm 3: Đảo 3 tầng (Y=0, Y=3, Y=6) bán kính 45m. Dốc tại 30° và 150°. Bục nhảy tại (0,3,13) bắn lên tầng 2 ($V_y = 12, V_z = -8$). Gió thổi mỗi 30s kéo dài 5s (đẩy 2 m/s). 7 đèn.
- **AC-8 (Tạm dừng - Pause):**
  - Nhấn `pause`: logic dừng, `state: "paused"`, `sim_tick` không tăng, `tick` vẫn tăng.

## 2. Thay đổi so với Phase 1 (Migration Notes)
- `carry_capacity`: từ 5 lên 10.
- `lantern_cost`: từ 3 lên 10.
- `pulse_cost`: từ 1 lên 3.
- `safe_radius`: từ 5m lên 6m.
- `time_left_s`: Đêm 1 là 300s (thay vì 180s ở Phase 1).
- Trạng thái Bóng Mực chuẩn hóa: `spawning`, `wander`, `chase`, `recoil`, `stunned`.
