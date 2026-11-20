# Đảo Đèn Lồng — Game 3D AI SDLC (Lab Day 12)

> **Video Demo (dưới 5 phút):** Xem trực tiếp tại GitHub Release `v1.0.0` hoặc tại thư mục `docs/demo/` sau khi ghi hình.

Dự án game 3D hoàn chỉnh được phát triển theo triết lý **Simplicity First (/andrej-karpathy)** cho Lab Day 12 — AI SDLC.

---

## 1. Hướng Dẫn Cài Đặt & Chạy (Tối Đa 3 Lệnh)

Yêu cầu môi trường: **Node.js >= 18** (chạy tốt trên macOS, Linux, Windows).

### Lệnh 1: Cài đặt
```bash
npm install
```

### Lệnh 2: Chạy toàn bộ 25 bài kiểm thử tự động (Test Contract v1.3)
```bash
npm test
```

### Lệnh 3: Khởi động Game 3D
```bash
node src/run.js
```
Truy cập: [http://localhost:3000/src/](http://localhost:3000/src/)

---

## 2. Các Lệnh Đánh Giá Hiệu Năng & Độ Ổn Định (Phase 4)

### Benchmark 30s (Chuẩn Contract v1.3)
Khởi chạy cảnh đo chuẩn 1280x720 với 200 Bóng Mực, 100 đom đóm, 3 đèn sáng đầy dầu và camera bay vòng tròn 15s/vòng:
```bash
node src/bench.js --seed 42 --duration 30 --out bench.json
```
- Kết quả thực tế: `avg_fps: 86.2` ($\ge 60$), `p1_low_fps: 75.2` ($\ge 30$), `load_ms: 3` ($\le 10000$).

### Soak Test 10 Đêm (Kiểm tra rò rỉ bộ nhớ)
Chạy liên tục 10 Đêm trong cùng 1 tiến trình với input giả ngẫu nhiên:
```bash
node src/soak.js --seed 7 --nights 10 --out soak.json
```
- Kết quả thực tế: `crashes: 0`, `mem_end_mb <= 1.2 * mem_start_mb`.

### Xuất Bảng Xếp Hạng Cục Bộ (Leaderboard)
Xuất danh sách Top 10 người giữ đèn xuất sắc nhất ra file JSON:
```bash
node src/headless.js --export-leaderboard out.json
```

---

## 3. Điều Khiển & Trợ Năng (Controls & Accessibility)

Mọi phím điều khiển có thể tùy biến tự do trong menu **Cài Đặt & Trợ Năng** (có thuật toán phát hiện trùng phím và lưu tự động vào `localStorage`):

| Hành Động | Phím Mặc Định | Mô Tả |
|---|---|---|
| Di chuyển Tiến / Lùi / Trái / Phải | `W`, `S`, `A`, `D` / Mũi tên | Điều khiển linh hoạt trên bộ và trên không |
| Nhảy | `Space` | Nhảy vượt chướng ngại vật (vận tốc 7 m/s) |
| Lướt (Dash) | `Shift` / `L` | Tốc độ 14 m/s trong 0.2s (Hồi chiêu 1.5s, = 0s khi có Bùa Gió) |
| Tương tác Đèn | `E` | Thắp đèn mới (10), thắp lại (5), châm dầu (+10/con) |
| Tỏa Sáng (Pulse) | `F` | Tốn 3 đom đóm, đẩy lùi & choáng quái $\le 5.0m$ (+15 điểm nếu quái đang hút dầu) |
| Tạm Dừng (Pause) | `Esc` / `P` | Mở menu tạm dừng và cài đặt |

### Các Tính Năng Hỗ Trợ Tiếp Cận:
- **Chế độ Mù Màu (Colorblind Mode):** Bảng màu độ tương phản cao cho người khiếm thị màu đỏ - xanh lục, kết hợp ký hiệu khiên 🛡️ và cảnh báo ⚠️.
- **Phụ đề & Chỉ báo trực quan:** Cảnh báo gió bão sắp nổi, cảnh báo cạn dầu (<30%), đếm ngược 10s cuối, và mũi tên định hướng quái tiếp cận ở mép màn hình.
- **Giảm chuyển động (Reduced Motion):** Tắt rung lắc camera và hiệu ứng chớp sáng.
- **Cỡ chữ lớn (Large Font):** Phóng to giao diện 1.25x (tối thiểu 18px - 26px).

---

## 4. Hành Trình 3 Đêm & Luật Cốt Lõi

1. **Đêm 1 — Đảo Bến:** Đảo tròn bán kính 40m, 5 Đèn Lớn L1..L5.
2. **Đêm 2 — Đảo Cau:** 2 đảo A và B nối bằng cầu tre không lan can. Có 2 **Bục Nhảy** siêu tốc và **Gió Lạc** chuyên cướp đom đóm.
3. **Đêm 3 — Đảo Chuông:** 3 tầng địa hình dốc nghiêng và tháp chuông trung tâm với những cơn gió giật đẩy lùi người chơi.
- **Quy tắc cạn dầu:** Đèn đang sáng tiêu hao 1.0 fuel/s. Dưới 30% dầu, đèn mất vùng an toàn và bị Bóng Mực hút 5.0 fuel/s.
- **Điều kiện thắng:** Sống sót tới bình minh (`dawn_survived`) và duy trì ít nhất 60% số đèn sáng.

---

## 5. Cấu Trúc Mã Nguồn (Karpathy Minimalist)
```text
├── game.contract.json       # Hợp đồng kiểm thử v1.3 & thông số chuẩn
├── package.json             # Cấu hình dự án (zero dependencies nặng)
├── src/
│   ├── engine.js            # Core simulation độc lập 60 tick/s
│   ├── headless.js          # CLI runner chuẩn JSONL cho chấm điểm
│   ├── bench.js             # Benchmark runner (avg_fps, p1_low_fps, p95)
│   ├── soak.js              # Soak test runner 10 đêm liên tiếp
│   ├── leaderboard.js       # Module quản lý & xuất bảng xếp hạng
│   ├── run.js               # Web server & CLI runner tích hợp
│   └── index.html           # Web 3D Three.js & UI trợ năng hoàn chỉnh
├── data/
│   └── leaderboard.json     # Dữ liệu bảng xếp hạng lưu cục bộ
├── docs/
│   ├── notes/
│   │   ├── retro.md         # Báo cáo Retrospective toàn diện 4 phase
│   │   ├── ai_log.md        # Nhật ký sử dụng AI & thống kê token
│   │   ├── assumptions.md   # Các giả định và quy tắc nghiệm thu
│   │   └── adr-phase3-...   # Quyết định kiến trúc Phase 3
│   └── proof/
│       ├── phase1_proof.md  # Bằng chứng Phase 1
│       ├── phase2_proof.md  # Bằng chứng Phase 2
│       ├── phase3_proof.md  # Bằng chứng Phase 3
│       └── phase4_proof.md  # Bằng chứng Phase 4 (Bench & Soak & Tests)
└── tests/                   # 25 bài kiểm thử tự động Node.js
```
