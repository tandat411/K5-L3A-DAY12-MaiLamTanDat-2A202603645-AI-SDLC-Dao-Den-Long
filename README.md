# Đảo Đèn Lồng — Game 3D AI SDLC (Lab Day 12)

> **Video Demo (dưới 5 phút):** Sẽ được đính kèm tại GitHub Release `v1.0.0` và cập nhật link ở đầu README khi hoàn thành Phase 4.

Dự án game 3D theo kiến trúc **Simplicity First (/andrej-karpathy)** cho Lab Day 12 — AI SDLC.

---

## 1. Giới Thiệu Gameplay (Hành Trình 3 Đêm)
Người chơi điều khiển **Mây**, người giữ đèn nhỏ tuổi vượt qua 3 đêm thử thách trên các hòn đảo giữa biển mây:
- **Đêm 1 — Đảo Bến:** Đảo tròn bán kính 40m, thắp sáng và duy trì 5 Đèn Lớn L1..L5.
- **Đêm 2 — Đảo Cau:** Hai hòn đảo A và B (bán kính 28m) nối bằng cầu tre không lan can. Có 2 **Bục Nhảy** siêu tốc bắn qua lại giữa 2 đảo, có **Bùa Gió** và sự xuất hiện của **Gió Lạc**. Duy trì 6 Đèn Lớn.
- **Đêm 3 — Đảo Chuông:** Hòn đảo 3 tầng (Y=0, Y=3, Y=6) với tháp chuông trung tâm, 2 dốc nghiêng và bục nhảy lên đỉnh. Có gió mạnh giật từng cơn đẩy lùi người chơi. Duy trì 7 Đèn Lớn.

### Kỹ năng & Cơ chế đặc trưng (Phase 3 — Contract v1.2):
- **Cơ chế Đèn Cạn Dầu (Ticket-03):**
  - Mỗi đèn chứa tối đa **100 đơn vị dầu**, hao hụt tự nhiên **1.0/giây**.
  - **Châm dầu (Refuel):** Nhấn `E` tại đèn đang sáng để nạp thêm dầu ($+10$ dầu / 1 đom đóm).
  - **Hết dầu:** Đèn tắt (`fuel = 0`, `lantern_out`), mất vùng an toàn.
  - **Thắp lại:** Đèn đã từng sáng (`ever_lit`) chỉ cần **5 đom đóm** để thắp lại đầy dầu.
- **Bóng Mực Hút Dầu (Drain):** Khi đèn có `fuel < 30`, đèn mất vùng an toàn. Bóng Mực ở trạng thái `wander` sẽ tiếp cận và chuyển sang `drain`, hút liên tục **5 fuel/giây**. Tỏa sáng xua đuổi quái đang hút dầu nhận ngay $+15$ điểm.
- **Điều Kiện Thắng Mới (`dawn_survived`):** Không còn chiến thắng sớm khi thắp hết đèn! Người chơi phải sống sót tới khi hết giờ (`time_left_s <= 0`) và có ít nhất **60% số đèn** trên đảo đang sáng.
- **Mở Rộng Sức Chứa Động:** Bắt đầu với sức chứa 10 đom đóm; mỗi lần thắp sáng thành công một ngọn đèn, túi của Mây tăng thêm $+2$ con (tối đa 20 con).
- **Chế Độ Khiếm Thị Màu (Colorblind Mode):** Nhấn phím `C` để chuyển sang bảng màu độ tương phản cao, kết hợp mã hóa kép (icon cảnh báo 🛡️ / ⚠️ và nhịp chớp 1Hz khi dưới 30% dầu).
- **Di chuyển & Nhảy:** Tốc độ 6.0 m/s, nhảy vận tốc 7.0 m/s với trọng lực chuẩn $-20$ m/s².
- **Lướt (Dash):** Phím `Shift` hoặc `L`. Lướt 14 m/s trong 0.2s, giữ nguyên cao độ trên không.
- **Tỏa Sáng (Pulse):** Phím `Space` hoặc `F`. Tốn 3 đom đóm, làm choáng Bóng Mực trong 5m và đẩy lùi 4m.
- **Bùa Gió (Charm):** Nhặt lá bùa đỏ giúp tăng tốc lên 7.2 m/s và lướt không cần hồi chiêu trong 10 giây.
- **Kẻ địch:**
  - **Bóng Mực (Shades):** Đuổi bắt khi Mây ở gần; hút dầu khi đèn yếu (< 30).
  - **Gió Lạc (Drifters):** Dải lụa bay lượn lẹ làng, lao vào cướp tối đa 3 đom đóm khi Mây mang $\ge 5$ con.

---

## 2. Hướng Dẫn Cài Đặt & Chạy (Tối Đa 3 Lệnh)

Yêu cầu môi trường: **Node.js >= 18** (chạy tốt trên cả macOS và Linux).

### Lệnh 1: Cài đặt
```bash
npm install
```

### Lệnh 2: Chạy toàn bộ 20 bài kiểm thử tự động (Test Contract v1.2)
```bash
npm test
```

### Lệnh 3: Trải nghiệm Game 3D trực quan
Mở file `src/index.html` trong trình duyệt hoặc chạy máy chủ web:
```bash
npx serve . -l 3000
```
Truy cập: [http://localhost:3000/src/](http://localhost:3000/src/)

---

## 3. Điều Khiển (Controls)

| Phím | Hành Động | Ghi Chú |
|---|---|---|
| `W`, `A`, `S`, `D` / Mũi tên | Di chuyển Mây | Điều khiển linh hoạt cả trên mặt đất và trên không |
| `Space` | Nhảy | Chỉ nhảy được khi chạm đất |
| `Shift` / `L` | Lướt (Dash) | 14 m/s trong 0.2s (Hồi chiêu 1.5s, = 0s khi có Bùa Gió) |
| `E` | Tương tác Đèn Lớn | Thắp đèn mới (10), thắp lại (5), châm thêm dầu (+10/con) |
| `F` | Tỏa Sáng (Pulse) | Tốn 3 đom đóm, đẩy lùi & choáng quái $\le 5.0m$ (+15 điểm nếu quái đang hút dầu) |
| `C` | Chế độ Khiếm thị màu | Bật/tắt palette tương phản cao cho Deuteranopia/Protanopia |
| `Esc` / `P` | Tạm Dừng (Pause) | Dừng logic game, mở menu cài đặt/chơi lại |

---

## 4. Chế Độ Headless & Test Contract v1.2

```bash
# Chạy Đêm 1 với Contract v1.2
node src/headless.js --seed 42 --night 1 --ticks 120 --out out.jsonl

# Chạy kịch bản hao dầu và tắt đèn
node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/lantern_out.json --ticks 65 --out out.jsonl

# Chạy kịch bản châm thêm dầu
node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/refuel.json --inputs tests/scenarios/inputs_refuel.json --ticks 5 --out out.jsonl

# Chạy kịch bản Bóng Mực hút dầu
node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/drain.json --ticks 65 --out out.jsonl
```
- Đầu ra JSONL đáp ứng đúng chuẩn schema Test Contract v1.2: Snapshot đầy đủ các mảng `lanterns` (với thuộc tính `fuel`, `ever_lit`), `motes`, `shades` (với trạng thái `drain`), `drifters`, `charms`, `wind`, và trạng thái người chơi.
- Hiệu năng: 21,600 ticks hoàn thành trong ~32ms (nhanh gấp ~900 lần yêu cầu $\le 30$s).

---

## 5. Quy Tắc Tính Điểm Cập Nhật (Score System v1.2)

- **Nạp đom đóm thắp đèn mới:** `+10 điểm / con`
- **Thắp sáng 1 Đèn Lớn mới:** `+100 điểm`
- **Châm dầu cho đèn đang sáng:** `+10 điểm / con`
- **Thắp lại 1 Đèn Lớn đã tắt:** `+50 điểm`
- **Tỏa sáng trúng Bóng Mực thường:** `+5 điểm`
- **Tỏa sáng trúng Bóng Mực đang hút dầu:** `+15 điểm`
- **Thưởng Thắng Bình Minh (`dawn_survived`):**
  - `+250 điểm` thưởng giữ đảo sáng đến bình minh
  - `+2 điểm` cho mỗi giây thời gian còn lại ($\lfloor time\_left\_s \rfloor \times 2$)
  - `+50 điểm` cho mỗi Ngọn Lửa sinh mệnh còn lại ($flames \times 50$)
- **Tổng điểm game:** Tổng điểm các Đêm đã vượt qua.

---

## 6. Sáng Tạo Của Tôi (My Creations)
- **Hệ thống âm thanh thuần Web Audio Synthesizer:** Tự tổng hợp âm thanh nhặt đom đóm (chime), tỏa sáng (sawtooth sweep), thắp đèn (harmonic chord), dash (whoosh) bằng Web Audio API mà không cần tải bất kỳ file mp3 bên ngoài nào.
- **Hiệu ứng sóng ánh sáng động (Pulse Ring Animation):** Vòng hào quang vàng cam mở rộng thực tế khi Mây kích hoạt kỹ năng tỏa sáng.
- **Tạo hình Mây & Nón lá 3D:** Thiết kế hình học tối giản, thuần Việt với nón lá và đèn mini dẫn lối.
- **Headless Contract Safe:** Mọi mở rộng mỹ thuật và hiệu ứng đều không can thiệp hay làm lệch định dạng dữ liệu đầu ra của Test Contract headless.
