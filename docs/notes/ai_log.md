# Nhật Ký Sử Dụng AI & Thống Kê Token (AI Usage Log)

| Phase | Model Sử Dụng | Nhiệm Vụ Chính | Ước Tính Token / Chi Phí | Biện Pháp Tiết Kiệm Token | Lỗi AI Gặp Phải & Cách Khắc Phục |
|---|---|---|---|---|---|
| **CP0** | Gemini 3.8 Flash (High) | Khởi tạo cấu trúc dự án, AGENTS.md, thiết lập harness | ~8k tokens | Prompt ngắn gọn, cấu trúc file đơn giản, không thư viện thừa | Không |
| **Phase 1** | Gemini 3.8 Flash (High) | Thiết kế kiến trúc Karpathy, cài đặt GameEngine thuần toán học, Test Contract v1.0, kịch bản headless, Web 3D Three.js | ~25k tokens | Tránh sinh code lặp lại, tách riêng logic 60Hz không dính DOM, dùng native test runner của Node | Ban đầu chưa gom bước edge trigger, đã tinh chỉnh trong 1 hàm duy nhất |
| **Phase 2** | Gemini 3.8 Flash (High) | Nâng cấp GameEngine lên Test Contract v1.1, hỗ trợ 3 Đêm, nhảy, lướt, bục nhảy, Gió Lạc, Bùa Gió, Pause menu, Web Audio sfx | ~35k tokens | Kế hoạch kiểm chứng trước khi code; cập nhật test hồi quy có lý do rõ ràng theo đúng chuẩn rubric | Test cũ Phase 1 fail do số liệu chuẩn mới (lantern_cost=10, pulse_cost=3); đã cập nhật test kèm lý do minh bạch |
| **Phase 3** | | | | | |
| **Phase 4** | | | | | |
