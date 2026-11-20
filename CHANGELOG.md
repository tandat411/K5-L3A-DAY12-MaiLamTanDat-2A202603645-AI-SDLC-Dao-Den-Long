# CHANGELOG — Breaking Changes in Phase 3 (Ticket-03)

Toàn bộ các thay đổi phá vỡ tương thích (breaking changes) và luật thay thế trong Phase 3:

## 1. Luật cốt lõi bị thay thế (Core Rule Replacements)
- **[THAY THẾ] "Đèn đã sáng không nhận thêm đom đóm"** -> **Nhiên liệu đèn**: Đèn sáng liên tục hao hụt 1.0 fuel/s. Khi `fuel < 100`, Mây có thể bấm tương tác để châm thêm dầu (10 fuel/đom đóm). Khi `fuel <= 0`, đèn tắt (`lantern_out`).
- **[THAY THẾ] "Thắp đèn luôn cần 10 đom đóm"** -> **Thắp lại chỉ cần 5**: Đèn đã từng sáng (`ever_lit = true`) sau khi tắt chỉ cần 5 đom đóm để thắp lại.
- **[THAY THẾ] "Bóng Mực không bao giờ vào vùng an toàn"** -> **Đèn yếu bị hút dầu**: Khi `fuel < 30`, đèn mất vùng an toàn. Bóng Mực `wander` tìm tới và chuyển sang `drain` hút 5 fuel/s.
- **[THAY THẾ] "Thắng ngay khi tất cả đèn sáng (`all_lit`)"** -> **Thắng tại bình minh (`dawn_survived`)**: Không còn thắng sớm. Game chỉ thắng khi sống sót qua đêm và số đèn sáng $\ge 60\%$ tổng số đèn.
- **[THAY THẾ] "Toàn bộ công thức tính điểm cũ"**:
  - Nạp đom đóm vào đèn: `+5` (thay vì +10).
  - Thắp lần đầu: `+100`.
  - Thắp lại: `+40`.
  - Tỏa Sáng trúng Bóng Mực: `+5` (nếu đang drain: `+15`).
  - Thưởng thắng: Mỗi đèn đang sáng được `+50 + floor(fuel)`; mỗi Ngọn Lửa còn lại được `+50`. Bỏ điểm thưởng giây còn lại.

## 2. Test Contract v1.2 Changes
- `contract_version` chuyển thành `"1.2"`.
- Bổ sung các thông số tuning mới: `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`.
- Thời gian các đêm rút ngắn: Đêm 1: 240s, Đêm 2: 270s, Đêm 3: 300s.
- Bổ sung sự kiện: `refuel`, `lantern_out`, `fuel_drain`. Sự kiện `lantern_lit` thêm cờ `relight: true|false`.
- Lý do kết thúc thắng: `dawn_survived` (bỏ `all_lit`).
