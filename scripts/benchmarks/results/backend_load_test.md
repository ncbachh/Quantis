# Báo Cáo Kiểm Thử Chịu Tải Backend Python (FastAPI Load Testing)

## 1. Cấu Hình Thử Nghiệm
- **Đích kiểm thử**: `http://localhost:4000/api/quantis/analyze` (trực tiếp container `quantis-python`, không qua proxy trung gian).
- **Cấu hình container**: `['uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000']` (1 Uvicorn worker, Python `3.12.16`).
- **Kịch bản tải**: Kiểm thử bão hòa vòng kín không thời gian nghỉ (closed-loop zero think-time) với $C \in [1, 10, 25, 50, 100]$ người dùng ảo gửi liên tục trong 10 giây (timeout đọc 30 giây).
- **Dữ liệu**: khao-sat.csv (197 valid rows cycled to 500), 10 biến Likert + `GPA`.

## 2. Kết Quả Endpoint OLS + Chẩn Đoán Vi Phạm ($N = 500$)

| Tải ($C$) | Tổng Req | Thành công | Lỗi (%) | Thông lượng (RPS) | p50 (ms) | p95 (ms) | p99 (ms) | CPU Peak | RAM |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| C = 1 | 78 | 78 | 0.0% | 6.87 | 126.6 | 165.2 | 455.7 | 0.23% | 164MiB / 7.446GiB |
| C = 10 | 68 | 68 | 0.0% | 5.58 | 1597.6 | 2614.2 | 2744.5 | 18.97% | 169.8MiB / 7.446GiB |
| C = 25 | 82 | 82 | 0.0% | 6.46 | 3824.4 | 4850.1 | 6281.1 | 114.41% | 175.4MiB / 7.446GiB |
| C = 50 | 97 | 97 | 0.0% | 6.10 | 6206.9 | 15591.3 | 15778.7 | 108.85% | 182.1MiB / 7.446GiB |
| C = 100 | 163 | 163 | 0.0% | 6.13 | 7287.9 | 26356.4 | 26489.5 | 117.34% | 182.4MiB / 7.446GiB |

## 3. Kết Quả Endpoint PAF + Parallel Analysis ($N = 500$)

| Tải ($C$) | Tổng Req | Thành công | Lỗi (%) | Thông lượng (RPS) | p50 (ms) | p95 (ms) | p99 (ms) | CPU Peak | RAM |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| C = 1 | 35 | 35 | 0.0% | 3.08 | 280.8 | 410.0 | 1136.2 | 2.39% | 184.3MiB / 7.446GiB |
| C = 10 | 22 | 22 | 0.0% | 1.90 | 5151.9 | 6203.0 | 6208.2 | 40.35% | 184.4MiB / 7.446GiB |
| C = 25 | 25 | 25 | 0.0% | 1.95 | 12627.0 | 12733.3 | 12756.8 | 148.46% | 185MiB / 7.446GiB |
| C = 50 | 50 | 50 | 0.0% | 1.99 | 20336.6 | 25013.9 | 25034.6 | 164.34% | 188.2MiB / 7.446GiB |
| C = 100 | 100 | 40 | 60.0% | 1.30 | 20651.7 | 22765.6 | 22908.9 | 164.36% | 198MiB / 7.446GiB |

## 4. Phân Tích Tổng Hợp Từ Số Liệu Thực Đo
- **OLS + Chẩn đoán**: Ở $C = 1$, $p_{50} = 126.6$ ms (6.87 req/s). Khi tăng đồng thời lên $C = 50$ và $C = 100$, thông lượng giữ quanh 6.10–6.13 req/s (bão hòa đơn tiến trình Uvicorn + GIL), độ trễ trung vị tăng tuyến tính lên 6206.9 ms ($C=50$) và 7287.9 ms ($C=100$) với tỷ lệ lỗi 0.0%.
- **PAF + Parallel Analysis (500 hoán vị)**: Nặng CPU hơn đáng kể; $p_{50}$ tăng từ 280.8 ms ($C=1$, 3.08 req/s) lên 20336.6 ms ($C=50$, lỗi 0.0%). Ở tải bão hòa $C = 100$, hàng đợi vượt ngưỡng timeout 30s khiến tỷ lệ lỗi đạt **60.0%** (60/100 req, chi tiết `{'ReadTimeout': 60}`).
- **Tài nguyên container**: Bộ nhớ RAM giữ ổn định trong suốt phép đo (OLS peak `182.4MiB / 7.446GiB`, PAF peak `198MiB / 7.446GiB`), không rò rỉ bộ nhớ.
