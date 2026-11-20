# AGENTS.md — Hướng Dẫn Vận Hành Agent (Karpathy Guidelines)

## 1. Triết Lý Cốt Lõi (Simplicity First)
- **First-Principles:** Tối giản mã nguồn, zero unnecessary dependencies. Giải quyết bài toán trực diện nhất.
- **Tách biệt Logic và Hiển thị:** Logic game độc lập 100% với canvas/WebGL để chạy headless test contract tuyệt đối tất định (deterministic).
- **Surgical Changes:** Chỉ chỉnh sửa đúng phạm vi yêu cầu, không refactor lan man.
- **Bằng chứng thật:** Mọi tính năng phải có test hoặc scenario headless chứng minh; không giả lập kết quả.

## 2. Lệnh Cơ Bản
- Kiểm tra môi trường: `node -v`
- Chạy toàn bộ test: `npm test`
- Chạy headless contract: `node src/headless.js <scenario.json>`
- Khởi động web 3D: `npx serve .` hoặc mở trực tiếp `src/index.html`

## 3. Quy Ước Commit & Tag
- Commit nhỏ, rõ mục đích (`feat:`, `fix:`, `test:`, `docs:`).
- Tag đúng hạn: `phase-1`, `phase-2`, `phase-3`, `phase-4`.
