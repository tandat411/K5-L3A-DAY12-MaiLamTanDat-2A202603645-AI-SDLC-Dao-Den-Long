# Bằng Chứng Kiểm Chứng (Verification Proof) — Phase 1: PRD-0

Tài liệu này ghi lại toàn bộ bằng chứng kiểm chứng khách quan của Phase 1, tuân thủ nguyên tắc "Không có bằng chứng thì chưa xong" (Karpathy Guidelines).

## 1. Kết Quả Chạy Kiểm Thử Tự Động (Automated Test Suite)
- Lệnh chạy: `npm test`
- Số lượng test: 6/6 tests pass (100%)
- Thời gian thực thi: ~230ms

```text
> dao-den-long@1.0.0 test
> node --test tests/**/*.test.js

✔ Test Contract v1.0: Mote Pickup Scenario (29.87ms)
✔ Test Contract v1.0: Deposit and Win Scenario (43.47ms)
✔ Test Contract v1.0: Pulse Stuns Shade Scenario (31.93ms)
✔ Test Contract v1.0: Determinism across runs (57.74ms)
✔ Test Contract v1.0: Error exit code 2 on invalid JSON input (29.42ms)
✔ Environment check: Node.js test runner works (0.58ms)
ℹ tests 6 | pass 6 | fail 0
```

## 2. Bằng Chứng Kịch Bản Headless (Test Contract Scenarios)

### Kịch bản 1: Mote Pickup (`scenario_pickup.jsonl`)
- File kịch bản: `tests/scenarios/pickup.json` + `tests/scenarios/inputs_pickup.json`
- Mây xuất phát tại `[0, 0, 0]`, đom đóm tại `[0, 0, 2]`. Mây di chuyển về phía trước nhặt đom đóm:
```json
{"type":"snapshot","tick":0,"sim_tick":0,"state":"playing","time_left_s":180,"score":0,"player":{"pos":[0,0,0],"flames":3,"carried":0},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":false,"deposited":0},{"id":"L2","pos":[23.776,0,7.725],"lit":false,"deposited":0},{"id":"L3","pos":[14.695,0,-20.225],"lit":false,"deposited":0},{"id":"L4","pos":[-14.695,0,-20.225],"lit":false,"deposited":0},{"id":"L5","pos":[-23.776,0,7.725],"lit":false,"deposited":0}],"shades":[],"motes_active":1}
{"type":"event","tick":5,"name":"mote_picked","data":{"carried":1}}
{"type":"snapshot","tick":10,"sim_tick":10,"state":"playing","time_left_s":179.833,"score":10,"player":{"pos":[0,0,1],"flames":3,"carried":1},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":false,"deposited":0},{"id":"L2","pos":[23.776,0,7.725],"lit":false,"deposited":0},{"id":"L3","pos":[14.695,0,-20.225],"lit":false,"deposited":0},{"id":"L4","pos":[-14.695,0,-20.225],"lit":false,"deposited":0},{"id":"L5","pos":[-23.776,0,7.725],"lit":false,"deposited":0}],"shades":[],"motes_active":0}
{"type":"end","ticks":60,"state":"playing","score":10}
```

### Kịch bản 2: Nạp Đèn Lớn & Chiến Thắng (`scenario_deposit_win.jsonl`)
- File kịch bản: `tests/scenarios/deposit_win.json` + `tests/scenarios/inputs_deposit.json`
- Đèn L2..L5 đã thắp. Mây mang 3 đom đóm đến L1 và nạp đom đóm:
```json
{"type":"snapshot","tick":0,"sim_tick":0,"state":"playing","time_left_s":180,"score":0,"player":{"pos":[0,0,24],"flames":3,"carried":3},"lanterns":[{"id":"L1","pos":[0,0,25],"lit":false,"deposited":0},{"id":"L2","pos":[23.776,0,7.725],"lit":true,"deposited":0},{"id":"L3","pos":[14.695,0,-20.225],"lit":true,"deposited":0},{"id":"L4","pos":[-14.695,0,-20.225],"lit":true,"deposited":0},{"id":"L5","pos":[-23.776,0,7.725],"lit":true,"deposited":0}],"shades":[],"motes_active":0}
{"type":"event","tick":6,"name":"deposit","data":{"lantern_id":"L1","amount":3,"deposited":3}}
{"type":"event","tick":6,"name":"lantern_lit","data":{"lantern_id":"L1"}}
{"type":"event","tick":6,"name":"game_over","data":{"result":"won","reason":"all_lit"}}
{"type":"end","ticks":6,"state":"won","score":429}
```

### Kịch bản 3: Tỏa Sáng (Pulse) & Đẩy Lùi Bóng Mực (`scenario_pulse.jsonl`)
- File kịch bản: `tests/scenarios/pulse.json` + `tests/scenarios/inputs_pulse.json`
- Mây có 1 đom đóm, Bóng Mực S1 tại `[0, 0, 4]`. Mây kích hoạt pulse xua quái:
```json
{"type":"event","tick":6,"name":"pulse","data":{"stunned_ids":["S1"]}}
```
- Bóng Mực S1 chuyển sang trạng thái `stunned` và bị đẩy lùi từ $Z = 4.0$ ra $Z > 7.0$.

## 3. Bằng Chứng Tính Tất Định (Determinism)
- Chạy 2 lần độc lập với `--seed 12345 --night 1 --ticks 120` sinh ra file `tests/out_det1.jsonl` và `tests/out_det2.jsonl`.
- Kết quả so sánh SHA256 / diff: Giống nhau 100% từng byte.
