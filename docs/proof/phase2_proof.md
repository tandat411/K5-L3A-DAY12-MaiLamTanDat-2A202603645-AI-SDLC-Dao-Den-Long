# Bằng Chứng Kiểm Chứng (Verification Proof) — Phase 2: Ticket-02 (Contract v1.1)

Tài liệu này ghi lại toàn bộ bằng chứng kiểm chứng của Phase 2, bao gồm các tính năng mới và bộ kiểm thử chống hồi quy (Regression Test).

## 1. Kết Quả Chạy Kiểm Thử Tự Động (13/13 Tests Pass)
- Lệnh chạy: `npm test`
- Số lượng test: 13 tests (toàn bộ 6 test chuẩn hóa + 7 test tính năng mới)
- Thời gian thực thi: ~250ms (vượt xa chỉ tiêu DoD: 21,600 ticks trong $\le 30$s, engine hoàn thành 21,600 ticks trong ~32ms).

```text
> dao-den-long@1.0.0 test
> node --test tests/**/*.test.js

✔ Test Contract v1.1: Mote Pickup Scenario (35.89ms)
✔ Test Contract v1.1: Deposit and Win Scenario (Ticket-02 lantern_cost = 10) (29.14ms)
✔ Test Contract v1.1: Pulse Stuns Shade Scenario (Ticket-02 pulse_cost = 3) (27.55ms)
✔ Test Contract v1.1: Determinism across runs (88.74ms)
✔ Test Contract v1.1: Error exit code 2 on invalid JSON input (26.44ms)
✔ Environment check: Node.js test runner works (0.30ms)
✔ Phase 2 — Dash Feature (Contract v1.1) (33.92ms)
✔ Phase 2 — Gió Lạc (Drifter) Steal Feature (30.00ms)
✔ Phase 2 — Bùa Gió (Charm) Pickup Feature (27.19ms)
✔ Phase 2 — Pause and Resume Feature (56.03ms)
✔ Phase 2 — Fall off island & Respawn (1.77ms)
✔ Phase 2 — Night 2 Bounce Pad Launch (0.12ms)
✔ Phase 2 — Performance DoD: 21,600 ticks in <= 30 seconds (32.53ms)
ℹ tests 13 | pass 13 | fail 0
```

## 2. Bằng Chứng Kịch Bản Headless (Contract v1.1)

### Kịch bản 1: Kỹ Năng Lướt (Dash) (`scenario_dash.jsonl`)
- Kích hoạt tại tick 5 khi đang di chuyển:
```json
{"type":"event","tick":6,"name":"dash","data":{}}
```
- Vận tốc đạt 14 m/s trong 12 ticks, thời gian hồi chiêu `dash_cd_s` được kích hoạt 1.5s và giảm dần đều.

### Kịch bản 2: Gió Lạc (Drifter) Đuổi & Cướp Đom Đóm (`scenario_drifter.jsonl`)
- Mây mang 6 đom đóm ($\ge 5$). Gió Lạc D1 phát hiện chuyển từ `idle` sang `chase` với tốc độ 7 m/s.
- Khi chạm Mây ($XZ \le 1.2$m):
```json
{"type":"event","tick":34,"name":"drifter_steal","data":{"drifter_id":"D1","amount":3,"carried":3}}
```
- D1 cướp 3 đom đóm, Mây còn 3 đom đóm. D1 chuyển sang trạng thái `flee` bay ra xa Mây trong 240 ticks.

### Kịch bản 3: Nhặt Bùa Gió (Charm) (`scenario_charm.jsonl`)
- Mây tiến đến vị trí (35,0,0) nhặt Bùa Gió C1:
```json
{"type":"event","tick":11,"name":"charm_picked","data":{"charm_id":"C1","charm_ticks":600}}
```
- `player.charm_s` duy trì 10 giây (600 ticks), tốc độ chạy tăng lên 7.2 m/s và lướt không bị hồi chiêu.

### Kịch bản 4: Tạm Dừng & Tiếp Tục (Pause / Resume) (`scenario_pause.jsonl`)
- Kích hoạt `pause: true` tại tick 5:
```json
{"type":"event","tick":6,"name":"paused","data":{}}
{"type":"snapshot","tick":10,"sim_tick":5,"night":1,"state":"paused",...}
```
- Trong trạng thái paused, `tick` vẫn tăng nhưng `sim_tick` và thời gian đứng yên. Khi kích hoạt tiếp tại tick 15:
```json
{"type":"event","tick":16,"name":"resumed","data":{}}
```

## 3. Bằng Chứng Hiệu Năng (DoD Performance)
- Yêu cầu: Mô phỏng 1 Đêm đầy đủ (tối đa 21,600 ticks) phải xong trong $\le 30$ giây.
- Kết quả thực tế: Đạt **32.5ms** (~660,000 ticks/giây trên Node.js v22).
