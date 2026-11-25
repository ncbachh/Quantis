# Báo Cáo Đo Lường và So Sánh Hồi Quy Tuyến Tính OLS: Dual-Mode Architecture

## Bảng So Sánh Hiệu Năng Theo Quy Mô Dữ Liệu

| Cỡ Mẫu ($N$) | Request / Response (KB) | Client TS OLS ($T_{client}$) | Backend Python RTT ($T_{backend}$) | Tỷ Lệ Tốc Độ | Sai lệch $\max|\Delta \hat{\beta}|$ | Sai lệch $\max|\Delta p|$ |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **N = 500** | 26.9 / 83.8 KB | 2.80 ms | 119.4 ± 10.5 ms | **42.6x** | 1.73e-14 | 6.45e-39 |
| **N = 2,000** | 107.3 / 326.7 KB | 4.20 ms | 163.6 ± 109.5 ms | **39.0x** | 1.69e-13 | 1.16e-146 |
| **N = 10,000** | 536.0 / 699.5 KB | 14.40 ms | 837.1 ± 40.4 ms | **58.1x** | 2.76e-13 | 0.00e+00 |
| **N = 50,000** | 2679.8 / 706.5 KB | 112.60 ms | 3503.1 ± 191.6 ms | **31.1x** | 6.10e-13 | 0.00e+00 |

## Kết Luận Kiến Trúc
1. **Client TypeScript (`computeOLS`)**: Đạt độ trễ **2.80 ms** ở $N = 500$ và **112.60 ms** ở $N = 50.000$ trên trình duyệt, không cần kết nối mạng, dùng cho chế độ chỉ có trình duyệt (`!analysisBackendAvailable`).
2. **Backend Python (`/api/quantis/analyze/ols`)**: Độ trễ RTT từ **119.4 ms** ($N = 500$) đến **3503.1 ms** ($N = 50.000$) do chi phí tuần tự hóa JSON và tính đầy đủ 4 nhóm chẩn đoán kinh tế lượng (Breusch-Pagan, Ramsey RESET, Shapiro-Wilk/Jarque-Bera, Cook's D/DFFITS/Leverage, HC3, VIF).
