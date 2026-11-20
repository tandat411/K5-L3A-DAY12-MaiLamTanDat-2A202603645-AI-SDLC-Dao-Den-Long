# CHANGELOG — Nhật Ký Thay Đổi Các Phiên Bản

Toàn bộ quá trình phát triển qua 4 phase của dự án Đảo Đèn Lồng (AI SDLC):

---

## [1.0.0] - Phase 4: Phát Hành Sản Phẩm (Contract v1.3)
### Added
- **Chế độ Benchmark chuẩn hóa (`src/bench.js`):**
  - Cảnh đo chuẩn 1280x720 với 200 Bóng Mực wander, 100 đom đóm, 3 đèn sáng đầy dầu.
  - Camera xoay vòng bán kính 30m, cao 15m, chu kỳ 15s/vòng quanh gốc tọa độ.
  - Đo 30s sau 3s warmup, xuất file `bench.json` với các chỉ số `avg_fps`, `p1_low_fps`, `frame_ms_p95`, `peak_mem_mb`.
- **Soak Test độ ổn định bộ nhớ (`src/soak.js`):**
  - Chạy 10 Đêm liên tục trong cùng tiến trình (xoay vòng Đêm 1 → 2 → 3), input ngẫu nhiên theo seed.
  - Đo `mem_start_mb` và `mem_end_mb`, đảm bảo 0 crash và `mem_end_mb <= 1.2 * mem_start_mb`.
- **Bảng xếp hạng cục bộ (Local Leaderboard):**
  - Lưu trữ Top 10 người giữ đèn xuất sắc nhất (sắp xếp điểm giảm dần, ưu tiên thời gian sớm hơn).
  - Giao diện nhập tên (3–12 ký tự `[A-Za-z0-9_]`) sau khi hoàn thành hoặc thua cuộc.
  - Lệnh CLI xuất bảng xếp hạng: `node src/headless.js --export-leaderboard out.json`.
- **Bộ tính năng Trợ Năng (Accessibility):**
  - Tùy biến đổi phím đầy đủ 9 hành động với thuật toán phát hiện trùng phím và nút khôi phục mặc định.
  - Phụ đề thông báo trực quan: cảnh báo gió nổi, cảnh báo cạn dầu (<30%), đếm ngược 10s cuối.
  - Mũi tên định hướng mép màn hình chỉ vị trí Bóng Mực đang tiếp cận.
  - Tùy chọn Giảm chuyển động (tắt rung camera/chớp màn hình) và Cỡ chữ lớn (1.25x).
- **Test Contract v1.3:** Thêm `bench_cmd` và `soak_cmd` vào `game.contract.json`.

---

## [0.3.0] - Phase 3: Change Request "Đèn Cạn Dầu" (Contract v1.2)
### Changed
- **Nhiên liệu đèn:** Đèn sáng liên tục tiêu hao 1.0 fuel/s. Khi cạn dầu (`fuel <= 0`), đèn chuyển tắt và phát sự kiện `lantern_out`.
- **Châm dầu (`refuel`):** Bấm tương tác tại đèn đang sáng nạp +10 fuel/đom đóm.
- **Thắp lại đèn cũ:** Đèn từng sáng (`ever_lit = true`) chỉ tốn 5 đom đóm để thắp lại đầy dầu.
- **Bóng Mực hút dầu (`drain`):** Khi đèn có `fuel < 30`, đèn mất vùng an toàn; Bóng Mực tiếp cận sẽ đứng yên hút 5 fuel/s và phát sự kiện `fuel_drain`.
- **Điều kiện thắng mới (`dawn_survived`):** Bỏ chiến thắng sớm khi thắp hết đèn; người chơi phải sống sót hết giờ với $\ge 60\%$ đèn đang sáng.
- **Bọc đom đóm động:** Tăng sức chứa thêm +2 con sau mỗi lần thắp đèn thành công (tối đa 20).
- **Chế độ khiếm thị màu (Colorblind mode):** Palette độ tương phản cao và mã hóa biểu tượng kép.

---

## [0.2.0] - Phase 2: Chuẩn Hóa Số Liệu & Mở Rộng 3 Đêm (Contract v1.1)
### Added
- **Mở rộng 3 Đêm:**
  - Đêm 1: Đảo Bến (R = 40m).
  - Đêm 2: Đảo Cau (2 đảo nối bằng cầu tre, 2 bục nhảy liên đảo).
  - Đêm 3: Đảo Chuông (3 tầng địa hình nghiêng, tháp chuông trung tâm, gió bão giật từng cơn).
- **Kỹ năng Lướt (Dash):** 14 m/s trong 0.2s, hồi chiêu 1.5s, giữ nguyên độ cao trên không.
- **Vật thể & Thực thể mới:**
  - Bùa Gió (Charm): Tăng tốc 7.2 m/s và lướt không hồi chiêu trong 10s.
  - Gió Lạc (Drifter): Cướp đom đóm khi Mây mang $\ge 5$ con.
  - Rơi khỏi đảo: Mất máu và hồi sinh tại điểm an toàn gần nhất.
- **Hệ thống âm thanh thuần Web Audio:** Tự tổng hợp hiệu ứng sfx nhặt đom đóm, lướt, tỏa sáng, nạp đèn.

---

## [0.1.0] - Phase 1: Bản Khởi Đầu PRD-0 (Contract v1.0)
### Added
- Đảo Bến Đêm 1 với 5 Đèn Lớn và đom đóm rải rác.
- Động cơ vật lý và luật chơi độc lập 100% với WebGL (`GameEngine` 60 tick/s).
- Trình mô phỏng dòng lệnh headless xuất JSONL định chuẩn hợp đồng chấm điểm tự động.
- Giao diện 3D Web Three.js góc nhìn người thứ ba (Third-person camera).
