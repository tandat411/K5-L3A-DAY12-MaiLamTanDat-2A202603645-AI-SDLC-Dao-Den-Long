# Bằng Chứng Nghiệm Thu Phase 3 — Change Request "Đèn Cạn Dầu" (Contract v1.2)

> **Dự án:** Đảo Đèn Lồng — AI SDLC Lab Day 12  
> **Tag nghiệm thu:** `phase-3`  
> **Contract:** `v1.2`  
> **Thời gian:** 2026-11-20  

---

## 1. Tóm Tắt Kết Quả Kiểm Thử Tự Động (20/20 Pass)

Chạy lệnh kiểm thử tiêu chuẩn: `npm test`

```text
> dao-den-long@1.0.0 test
> node --test tests/**/*.test.js

✔ Test Contract v1.2: Mote Pickup Scenario (37.829416ms)
✔ Test Contract v1.2: Deposit and Lantern Lit Scenario (Phase 3: no early win) (29.930667ms)
✔ Test Contract v1.2: Pulse Stuns Shade Scenario (30.977208ms)
✔ Test Contract v1.2: Determinism across runs (59.039292ms)
✔ Test Contract v1.2: Error exit code 2 on invalid JSON input (27.810792ms)
✔ Environment check: Node.js test runner works (0.347541ms)
✔ Phase 2 — Dash Feature (Contract v1.1) (34.273375ms)
✔ Phase 2 — Gió Lạc (Drifter) Steal Feature (31.366083ms)
✔ Phase 2 — Bùa Gió (Charm) Pickup Feature (30.918833ms)
✔ Phase 2 — Pause and Resume Feature (29.029416ms)
✔ Phase 2 — Fall off island & Respawn (1.978958ms)
✔ Phase 2 — Night 2 Bounce Pad Launch (0.125292ms)
✔ Phase 2 — Performance DoD: 21,600 ticks in <= 30 seconds (44.695083ms)
✔ Phase 3 — Fuel Decay & lantern_out Event (34.197459ms)
✔ Phase 3 — Refuel Lit Lantern (refuel Event) (31.304ms)
✔ Phase 3 — Relighting ever_lit Lantern (Needs 5 motes, relight: true) (31.016208ms)
✔ Phase 3 — Shade Drain & fuel_drain Event (29.192084ms)
✔ Phase 3 — Pulse on Draining Shade gives +15 score (1.033292ms)
✔ Phase 3 — New Win Condition: dawn_survived at time_left <= 0 when >= 60% lit (0.878666ms)
✔ Phase 3 — Dynamic Capacity Expansion (0.170708ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 230.628625
```

---

## 2. Bằng Chứng Thực Thi Các Kịch Bản Headless (Contract v1.2)

### Kịch bản 1: Hao hụt dầu và sự kiện `lantern_out`
- File kịch bản: `tests/scenarios/lantern_out.json`
- Lệnh: `node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/lantern_out.json --ticks 65 --out docs/proof/scenario_lantern_out.jsonl`
- Trích đoạn sự kiện phát sinh tại tick 60 (sau 1.0s từ fuel = 1.0):
```json
{"tick":60,"events":[{"type":"lantern_out","lantern_id":"L1"}]}
```
- Trạng thái đèn tại tick 61: `lit: false, fuel: 0, ever_lit: true`.

### Kịch bản 2: Châm thêm dầu (`refuel`) cho đèn đang sáng
- File kịch bản: `tests/scenarios/refuel.json` & `inputs_refuel.json`
- Lệnh: `node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/refuel.json --inputs tests/scenarios/inputs_refuel.json --ticks 5 --out docs/proof/scenario_refuel.jsonl`
- Trích đoạn sự kiện nạp dầu tại tick 1:
```json
{"tick":1,"events":[{"type":"refuel","lantern_id":"L1","motes_used":2,"fuel_added":20,"fuel_now":70}]}
```
- Số đom đóm của Mây giảm tương ứng (từ 5 xuống 3), điểm số tăng $+20$ ($10 \times 2$).

### Kịch bản 3: Thắp lại đèn đã tắt (`relight`) với 5 đom đóm
- File kịch bản: `tests/scenarios/relight.json` & `inputs_refuel.json`
- Lệnh: `node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/relight.json --inputs tests/scenarios/inputs_refuel.json --ticks 5 --out docs/proof/scenario_relight.jsonl`
- Trích đoạn sự kiện thắp lại tại tick 1:
```json
{"tick":1,"events":[{"type":"lantern_lit","lantern_id":"L1","relight":true}]}
```
- Chỉ tiêu tốn 5 đom đóm (thay vì 10 đom đóm cho đèn mới), đèn chuyển `lit: true, fuel: 100`, cộng $+50$ điểm.

### Kịch bản 4: Bóng Mực hút dầu (`drain`) & sự kiện `fuel_drain`
- File kịch bản: `tests/scenarios/drain.json`
- Lệnh: `node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/drain.json --ticks 65 --out docs/proof/scenario_drain.jsonl`
- Khi đèn có `fuel = 25` ($< 30$), Bóng Mực tiếp cận $\le 2m$ và chuyển sang trạng thái `drain`.
- Trích đoạn sự kiện phát sinh định kỳ mỗi 60 tick (1s):
```json
{"tick":60,"events":[{"type":"fuel_drain","shade_id":"S1","lantern_id":"L1","fuel_drained":5,"fuel_now":14}]}
```

---

## 3. Bằng Chứng Cơ Chế Điểm Số & Sức Chứa Động (Dynamic Capacity)
- **Tỏa Sáng trúng Bóng Mực đang hút dầu:** Đạt $+15$ điểm (so với $+5$ điểm thông thường). Đã được kiểm chứng trong `Phase 3 — Pulse on Draining Shade gives +15 score`.
- **Thưởng Thắng Bình Minh (`dawn_survived`):** Đạt $+250$ điểm thưởng cố định kèm $+50$ điểm/ngọn lửa và $+2$ điểm/giây còn lại. Đã được kiểm chứng trong `Phase 3 — New Win Condition`.
- **Mở Rộng Bọc Đom Đóm:** Bắt đầu 10, mỗi lần thắp thành công (hoặc thắp lại) tăng thêm $+2$ con, trần tối đa 20 con. Đã được kiểm chứng trong `Phase 3 — Dynamic Capacity Expansion`.

---

## 4. Bằng Chứng Hỗ Trợ Tiếp Cận: Chế Độ Khiếm Thị Màu (Colorblind Mode)
- **Tính năng trong Web UI (`src/index.html`):**
  - Toggle bằng phím `C` hoặc checkbox trực tiếp trên HUD/Pause Menu. Trạng thái được lưu trong `localStorage`.
  - Hỗ trợ đầy đủ người khiếm thị đỏ - xanh lục (Deuteranopia / Protanopia).
  - Bảng màu độ tương phản cao:
    - Bình thường: Vàng cam (#f59e0b) cho an toàn / ánh sáng, Đỏ tím cho nguy hiểm.
    - Chế độ Colorblind: Xanh da trời sáng (#38bdf8 / High-contrast Sky Blue) cho ánh sáng / đom đóm; Vàng chanh (#facc15) cho bùa; Đỏ thẫm viền trắng cho kẻ địch.
  - **Mã hóa kép (Double Encoding):** Không chỉ dựa vào màu sắc mà còn kết hợp ký hiệu hình học:
    - Đèn đầy dầu: Biểu tượng khiên sáng `🛡️ 100% [AN TOÀN]`.
    - Đèn yếu dầu (< 30): Biểu tượng cảnh báo `⚠️ 25% [NGUY HIỂM - MẤT BẢO VỆ]`.
    - Đèn tắt: Biểu tượng tắt `⬛ 0% [CẦN 5 ĐOM ĐÓM THẮP LẠI]`.
    - Đèn và thanh dầu nhấp nháy 1 Hz khi mức dầu dưới 30%.
