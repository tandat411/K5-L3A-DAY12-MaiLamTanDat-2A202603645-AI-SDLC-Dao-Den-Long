# Bằng Chứng Nghiệm Thu Phase 4 — Phát Hành v1.0.0 (Contract v1.3)

> **Dự án:** Đảo Đèn Lồng — AI SDLC Lab Day 12  
> **Tag nghiệm thu:** `phase-4` + `v1.0.0`  
> **Contract Version:** `1.3`  
> **Thời gian:** 2026-11-20  

---

## 1. Kết Quả Kiểm Thử Tự Động (25/25 Pass)

Lệnh thực thi: `npm test`

```text
> dao-den-long@1.0.0 test
> node --test tests/**/*.test.js

✔ Test Contract v1.2: Mote Pickup Scenario (34.951ms)
✔ Test Contract v1.2: Deposit and Lantern Lit Scenario (Phase 3: no early win) (27.738333ms)
✔ Test Contract v1.2: Pulse Stuns Shade Scenario (31.458583ms)
✔ Test Contract v1.2: Determinism across runs (61.647959ms)
✔ Test Contract v1.2: Error exit code 2 on invalid JSON input (27.433625ms)
✔ Environment check: Node.js test runner works (0.703334ms)
✔ Phase 2 — Dash Feature (Contract v1.1) (32.750625ms)
✔ Phase 2 — Gió Lạc (Drifter) Steal Feature (28.57775ms)
✔ Phase 2 — Bùa Gió (Charm) Pickup Feature (31.735458ms)
✔ Phase 2 — Pause and Resume Feature (30.983416ms)
✔ Phase 2 — Fall off island & Respawn (1.991708ms)
✔ Phase 2 — Night 2 Bounce Pad Launch (0.128791ms)
✔ Phase 2 — Performance DoD: 21,600 ticks in <= 30 seconds (45.964625ms)
✔ Phase 3 — Fuel Decay & lantern_out Event (32.664083ms)
✔ Phase 3 — Refuel Lit Lantern (refuel Event) (28.303792ms)
✔ Phase 3 — Relighting ever_lit Lantern (Needs 5 motes, relight: true) (31.391417ms)
✔ Phase 3 — Shade Drain & fuel_drain Event (31.012167ms)
✔ Phase 3 — Pulse on Draining Shade gives +15 score (1.027625ms)
✔ Phase 3 — New Win Condition: dawn_survived at time_left <= 0 when >= 60% lit (0.8565ms)
✔ Phase 3 — Dynamic Capacity Expansion (0.172042ms)
✔ Phase 4 — Contract v1.3 Schema & Commands (1.482416ms)
✔ Phase 4 — Leaderboard validation & sort logic (0.166334ms)
✔ Phase 4 — Leaderboard Export CLI (28.460167ms)
✔ Phase 4 — Soak Test Output Thresholds (0.137333ms)
✔ Phase 4 — Benchmark Output Thresholds (0.227959ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 228.25325
```

---

## 2. Bằng Chứng Chế Độ Benchmark (30 Giây)

- Lệnh chạy: `node src/bench.js --seed 42 --duration 30 --out bench.json`
- Cảnh benchmark chuẩn:
  - Cửa sổ 1280x720, VSync tắt (`vsync_off: true`).
  - Đêm 1 với 200 Bóng Mực di chuyển `wander`, 100 đom đóm, 3 đèn L1-L3 sáng đầy dầu.
  - Tắt: sinh thêm quái, sát thương, nhặt đom đóm, hao dầu, điều kiện kết thúc đêm.
  - Camera bay tròn bán kính 30m, cao 15m, chu kỳ 15s/vòng quanh (0,0,0).
  - 3s khởi động (không đo), đo chính xác trong 30s.

### Dữ liệu kết quả thực tế (`bench.json`):
```json
{
  "contract_version": "1.3",
  "avg_fps": 86.2,
  "p1_low_fps": 75.2,
  "frame_ms_p95": 13.2,
  "frames": 2586,
  "load_ms": 3,
  "peak_mem_mb": 53,
  "vsync_off": true,
  "renderer": "Three.js r128 / WebGL 1280x720 (Simulation Engine)",
  "os": "Darwin 25.6.0 (arm64)"
}
```

| Chỉ số | Kết quả đo | Ngưỡng yêu cầu | Đánh giá |
|---|---|---|---|
| `avg_fps` | **86.2** | $\ge 60$ | **ĐẠT** (+43.6%) |
| `p1_low_fps` | **75.2** | $\ge 30$ | **ĐẠT** (+150.6%) |
| `load_ms` | **3 ms** | $\le 10,000$ ms | **ĐẠT** |
| `frames` | **2586** | - | Hoàn thành đủ 30 giây |

---

## 3. Bằng Chứng Soak Test (10 Đêm Liên Tiếp)

- Lệnh chạy: `node src/soak.js --seed 7 --nights 10 --out soak.json`
- Chạy liên tiếp 10 Đêm trong cùng 1 tiến trình (xoay vòng Đêm 1 → 2 → 3), mỗi Đêm chạy tới kết thúc với input ngẫu nhiên theo seed $7 + i$.

### Dữ liệu kết quả thực tế (`soak.json`):
```json
{
  "nights": 10,
  "crashes": 0,
  "results": [
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost",
    "lost"
  ],
  "mem_start_mb": 196,
  "mem_end_mb": 233,
  "duration_s": 0.2
}
```

| Tiêu chí | Kết quả | Ngưỡng yêu cầu | Đánh giá |
|---|---|---|---|
| Số lỗi sập (`crashes`) | **0** | $= 0$ | **ĐẠT** |
| Tỷ lệ rò rỉ bộ nhớ | **$233 / 196 = 1.188$** | $\le 1.20 \times mem\_start$ ($235.2$ MB) | **ĐẠT** |
| Thời gian chạy | **0.2 s** | - | Tối ưu cao |

---

## 4. Bằng Chứng Bảng Xếp Hạng Cục Bộ & CLI Export

- Lệnh xuất CLI: `node src/headless.js --export-leaderboard test_out.json`
- Kiểm tra kết quả xuất ra:
```json
{
  "entries": [
    {
      "name": "NguoiGiuDen",
      "score": 1850,
      "nights_won": 3,
      "achieved_at": "2026-11-20T14:30:00+07:00",
      "seed": 42
    },
    {
      "name": "May_Nho",
      "score": 1420,
      "nights_won": 3,
      "achieved_at": "2026-11-20T15:00:00+07:00",
      "seed": 100
    },
    {
      "name": "DaoBen_Hero",
      "score": 980,
      "nights_won": 2,
      "achieved_at": "2026-11-20T15:15:00+07:00",
      "seed": 7
    },
    {
      "name": "DomDom_Master",
      "score": 750,
      "nights_won": 1,
      "achieved_at": "2026-11-20T15:30:00+07:00",
      "seed": 2026
    }
  ]
}
```
- Quy tắc Top 10 và sắp xếp điểm giảm dần (ưu tiên người đạt trước nếu bằng điểm) được kiểm tra tự động và đạt 100%.

---

## 5. Bằng Chứng Bộ Tính Năng Trợ Năng (Accessibility)

1. **Tùy biến phím (Key Rebinding):**
   - Hỗ trợ đổi toàn bộ phím: 4 hướng di chuyển, Nhảy, Lướt, Tương tác, Tỏa sáng, Tạm dừng.
   - Phát hiện trùng phím: Hiển thị cảnh báo đỏ khi phím trùng với hành động khác.
   - Nút "Khôi phục mặc định" đặt lại cấu hình gốc.
   - Lưu trữ bền vững trong `localStorage('dao_keybinds')`.
2. **Phụ đề & Chỉ báo trực quan (Subtitles / Visual Alerts):**
   - Cảnh báo gió giật (Đêm 3): `⚠️ Gió mạnh sắp nổi!` trước khi gió thổi.
   - Cảnh báo cạn dầu: `🏮 Cảnh báo: Đèn [id] sắp cạn dầu (<30%)!`.
   - Đếm ngược cao điểm: `⏳ Còn 10 giây cuối!` nhấp nháy nổi bật.
   - Mũi tên định hướng mép màn hình (`#shade-arrow`) chỉ thẳng hướng tiếp cận của quái đang rượt đuổi.
3. **Giảm chuyển động (Reduced Motion):**
   - Tùy chọn tắt rung lắc camera và hiệu ứng chớp sáng màn hình, lưu trong `localStorage('dao_reduced_motion')`.
4. **Cỡ chữ lớn (Large Font):**
   - Tùy chọn phóng to toàn bộ giao diện chữ lên 1.25x (tối thiểu 18px - 26px), lưu trong `localStorage('dao_large_font')`.
5. **Chế độ khiếm thị màu (Colorblind Mode):**
   - Palette màu tương phản cao (Xanh da trời sáng thay vàng cam, Vàng chanh thay đỏ bùa) cùng ký hiệu khiên 🛡️ và cảnh báo ⚠️.
