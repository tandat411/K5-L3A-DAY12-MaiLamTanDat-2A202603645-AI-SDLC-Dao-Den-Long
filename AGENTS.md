# AGENTS.md — Hướng Dẫn Vận Hành Agent (Karpathy Guidelines)

## 1. Triết Lý Cốt Lõi (Simplicity First)
- **First-Principles:** Tối giản mã nguồn, zero unnecessary dependencies. Giải quyết bài toán trực diện nhất.
- **Tách biệt Logic và Hiển thị:** Logic game độc lập 100% với canvas/WebGL để chạy headless test contract tuyệt đối tất định (deterministic).
- **Surgical Changes:** Chỉ chỉnh sửa đúng phạm vi yêu cầu, không refactor lan man.
- **Bằng chứng thật:** Mọi tính năng phải có test hoặc scenario headless chứng minh; không giả lập kết quả.

## 2. Lệnh Cơ Bản (Phase 2 - Contract v1.1)
- Kiểm tra môi trường: `node -v`
- Chạy toàn bộ test: `npm test`
- Chạy headless contract v1.1: `node src/headless.js --seed 42 --night 1 --ticks 60 --out out.jsonl`
- Chạy Đêm 2, 3: `node src/headless.js --seed 42 --night 2 --ticks 60 --out out.jsonl`
- Khởi động web 3D: `npx serve .` hoặc mở trực tiếp `src/index.html`

## 3. Quy Ước Thứ Tự Tick Trong Engine (Bắt buộc theo Ticket-02)
1. Đọc input (xử lý pause trước; nếu vừa tạm dừng thì dừng bước ở đây).
2. Giảm các bộ đếm: thời gian, hồi chiêu, bất tử, choáng, bùa, TTL đom đóm rơi, hồi bùa.
3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi khỏi đảo.
4. Nhặt đom đóm và bùa.
5. Tương tác với đèn.
6. Cập nhật vùng an toàn.
7. Tỏa Sáng.
8. Di chuyển Bóng Mực và Gió Lạc.
9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (xét theo id tăng dần).
10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch (thực thể mới chỉ tương tác được từ tick sau).
11. Xét thắng/thua.
12. Ghi snapshot nếu tới lượt.

## 4. Quy Ước Commit & Tag
- Commit nhỏ, rõ mục đích (`feat:`, `fix:`, `test:`, `docs:`).
- Tag đúng hạn: `phase-1`, `phase-2`, `phase-3`, `phase-4`.
