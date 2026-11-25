# Báo Cáo Đo Hiệu Năng Thực Tế Trên Trình Duyệt (Chromium + Web Worker + Legacy Cronbach)

- Trình duyệt: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/143.0.7499.4 Safari/537.36`
- Frontend Vite: `http://localhost:3000`
- Legacy Python Cronbach API: `http://localhost:4100/api/quantis/analyze/cronbach`

## 1. Baseline `computeProfile` (1 cột số)

| Cỡ mẫu ($N$) | Trung vị (ms) | Nhỏ nhất (ms) | Lớn nhất (ms) | Độ lệch chuẩn (ms) |
|:---:|:---:|:---:|:---:|:---:|
| 10,000 | 4.30 | 4.00 | 16.30 | 4.58 |
| 50,000 | 21.80 | 20.30 | 31.10 | 3.31 |
| 150,000 | 65.80 | 62.80 | 69.70 | 2.07 |

## 2. Hot-deck Imputation: Main Thread vs Web Worker (đo `requestAnimationFrame` thực tế)

| Cỡ mẫu ($N$) | Main Thread CPU (ms) | Main Thread rAF Max Gap (ms) | Web Worker End-to-End (ms) | Web Worker rAF Max Gap (ms) | Long Frames (>50ms) Worker |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 500 | 16.90 | 16.80 | 106.20 | 16.80 | 0 |
| 2,000 | 133.50 | 133.40 | 233.40 | 16.70 | 0 |
| 10,000 | 698.20 | 683.40 | 840.40 | 16.80 | 0 |
| 50,000 | 6678.10 | 6666.40 | 7229.80 | 57.90 | 0 |

> Thử nghiệm hủy tác vụ (`AbortController`) trên $N = 50,000$: kích hoạt hủy tại 150 ms, Worker dừng sau **164.2 ms** (`abortedProperly=True`).

## 3. Cronbach's Alpha: Browser TypeScript vs API Python Cũ (`/api/quantis/analyze/cronbach`)

| Số mục ($k$) | Cỡ mẫu ($N$) | Payload (KB) | Client TS (ms) | API Python cũ RTT (ms) | Tỷ lệ nhanh hơn | Sai khác $|\Delta \alpha|$ |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 5 | 200 | 5.4 | 1.25 | 57.44 | 46.0x | 1.25e-15 |
| 5 | 500 | 13.3 | 2.20 | 64.03 | 29.1x | 3.89e-15 |
| 10 | 500 | 25.5 | 4.00 | 75.81 | 19.0x | 1.48e-15 |
| 10 | 1,000 | 50.9 | 6.05 | 52.27 | 8.6x | 1.47e-15 |
| 10 | 2,000 | 101.7 | 8.60 | 81.28 | 9.5x | 1.73e-15 |
| 20 | 2,000 | 199.5 | 16.20 | 164.82 | 10.2x | 1.64e-15 |
| 20 | 5,000 | 498.3 | 40.70 | 372.95 | 9.2x | 1.05e-15 |
