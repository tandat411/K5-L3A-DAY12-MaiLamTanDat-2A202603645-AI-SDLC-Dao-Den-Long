# Đảo Đèn Lồng — Game 3D AI SDLC (Lab Day 12)

> **Video Demo (dưới 5 phút):** Sẽ được đính kèm tại GitHub Release `v1.0.0` và cập nhật link ở đầu README khi hoàn thành Phase 4.

Dự án game 3D theo kiến trúc **Simplicity First (/andrej-karpathy)** cho Lab Day 12 — AI SDLC.

---

## 1. Giới Thiệu Gameplay (Đêm 1 – Đảo Bến)
Người chơi điều khiển **Mây**, người giữ đèn nhỏ tuổi trên đảo tròn giữa biển mây. Sương đen đã nuốt hết ánh sáng hòn đảo.
- **Nhiệm vụ:** Thu thập các đốm sáng (**đom đóm**) rải rác trên đảo, mang về nạp và thắp sáng **5 Đèn Lồng Lớn** (L1 đến L5).
- **Mối nguy:** **Bóng Mực** lẩn khuất trong bóng tối đuổi theo Mây. Chạm phải chúng sẽ mất ngọn lửa sinh mệnh (máu) và làm rơi đom đóm.
- **Kỹ năng Tỏa Sáng (Pulse):** Mây tiêu hao 1 đom đóm mang theo để phát ra sóng ánh sáng làm choáng và đẩy lùi Bóng Mực xung quanh.
- **Vùng An Toàn:** Các Đèn Lớn khi đã được thắp sáng sẽ tạo vùng bảo vệ mà Bóng Mực không thể xâm nhập.
- **Kết thúc:** Thắp đủ 5 đèn -> **Chiến thắng**. Mất hết 3 ngọn lửa hoặc hết thời gian -> **Thất bại**.

---

## 2. Hướng Dẫn Cài Đặt & Chạy (Tối Đa 3 Lệnh)

Yêu cầu môi trường: **Node.js >= 18** (đã test mượt mà trên macOS và Linux).

### Lệnh 1: Cài đặt (Không phụ thuộc thư viện ngoài)
```bash
npm install
```

### Lệnh 2: Chạy kiểm thử tự động (6 tests, bao gồm tính tất định & Test Contract)
```bash
npm test
```

### Lệnh 3: Trải nghiệm Game 3D trực quan
Mở trực tiếp file `src/index.html` trong trình duyệt hoặc chạy máy chủ cục bộ:
```bash
npx serve . -l 3000
```
Truy cập: [http://localhost:3000/src/](http://localhost:3000/src/)

---

## 3. Điều Khiển (Controls)

| Phím | Hành Động | Ghi Chú |
|---|---|---|
| `W`, `A`, `S`, `D` / Mũi tên | Di chuyển Mây | Góc nhìn thứ ba 3D |
| `E` | Nạp đom đóm vào Đèn Lớn | Khi đứng gần chân cột đèn ($\le 2.5m$) |
| `Space` / `F` | Tỏa Sáng (Pulse) | Tốn 1 đom đóm mang theo, đẩy lùi & choáng quái $\le 6.0m$ |

---

## 4. Chế Độ Headless & Test Contract v1.0

Game tích hợp sẵn chế độ chạy không giao diện theo đúng **Test Contract v1.0**:
```bash
node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/pickup.json --inputs tests/scenarios/inputs_pickup.json --ticks 60 --out out.jsonl
```
- Định dạng xuất: Chuỗi dòng JSONL (Snapshot mỗi 10 ticks, Events tức thì, End line bắt buộc).
- 100% tất định (Deterministic) nhờ bộ sinh ngẫu nhiên Mulberry32 đồng bộ.

---

## 5. Quy Tắc Tính Điểm (Score System)

- **Nhặt 1 đom đóm:** `+10 điểm`
- **Thắp sáng 1 Đèn Lớn:** `+100 điểm`
- **Tỏa sáng làm choáng 1 Bóng Mực:** `+20 điểm`
- **Thưởng khi Thắng:**
  - `+1 điểm` cho mỗi giây còn lại ($\lfloor time\_left\_s \rfloor \times 1$)
  - `+50 điểm` cho mỗi ngọn lửa sinh mệnh còn giữ được ($flames \times 50$)

---

## 6. Sáng Tạo Của Tôi (My Creations)
- **Hình tượng Mây thuần Việt:** Tạo hình Mây đội nón lá tre đan kèm chiếc đèn lồng nhỏ phát sáng dẫn lối.
- **Hiệu ứng sóng ánh sáng động (Pulse Ring Animation):** Vòng hào quang vàng cam mở rộng thực tế khi Mây kích hoạt kỹ năng tỏa sáng.
- **Vùng bảo hộ đèn lồng:** Cơ chế đẩy và ngăn chặn Bóng Mực tiến vào phạm vi ánh sáng của các đèn đã thắp, tạo nơi trú ẩn chiến thuật cho người chơi.
- **Headless Contract Safe:** Các tính năng hiển thị và mở rộng không can thiệp hay làm lệch định dạng dữ liệu đầu ra của Test Contract headless.
