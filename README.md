# VietDub Studio 🎬

Ứng dụng web hỗ trợ dịch video, ghép phụ đề và lồng tiếng tự động sử dụng AI. Hệ thống bao gồm Frontend (React + Vite) và Backend (FastAPI + Python).

## 🛠️ Yêu cầu hệ thống
- **Python** (phiên bản 3.10 trở lên)
- **Node.js** (phiên bản 18 trở lên)
- **FFmpeg** (Đã cài đặt và thêm vào biến môi trường PATH)

---

## 🚀 Hướng dẫn tự chạy (bằng Docker)

Dự án này đã được cấu hình sẵn Docker để có thể khởi chạy toàn bộ hệ thống chỉ với một lệnh duy nhất.

### 1️⃣ Yêu cầu tiên quyết
- Đã cài đặt **Docker** và **Docker Desktop** (nếu dùng Windows/Mac).
- Đảm bảo Docker đang chạy ngầm trên máy.
- File cấu hình `backend/.env` đã được nhập đúng API Key.

### 2️⃣ Khởi động toàn bộ hệ thống
Mở Terminal / Command Prompt tại thư mục gốc của dự án (`video1`), chạy lệnh sau:
```bash
docker-compose up -d --build
```

Lệnh này sẽ tự động tải các image cần thiết, cài đặt môi trường Python cho Backend (port 8000), đóng gói Frontend bằng Nginx (port 80), và khởi chạy cả 2 dịch vụ. 
Quá trình build lần đầu có thể mất vài phút.

### 3️⃣ Cách dừng hệ thống
Khi không muốn dùng nữa, gõ lệnh:
```bash
docker-compose down
```

---

## 🎯 Sử dụng
- Mở trình duyệt và truy cập: **http://localhost** (vì đã chạy trên port 80 nên không cần gõ 5173 nữa).
- Tải video lên ở Bước 1 và làm theo các bước trên màn hình.
- Các file video, âm thanh sau khi xử lý sẽ được lưu giữ tự động trong thư mục `backend/storage` trên máy bạn.
