# Tái hiện ca minh họa khóa luận Quantis

Thư mục này lưu dữ liệu và hai script phục vụ ca minh họa, đối chiếu kết quả thống kê và dựng hình cho khóa luận.

## Các tệp trong thư mục

| Tệp | Mục đích |
| --- | --- |
| `data/khao-sat.csv` | Dữ liệu đầu vào cho script: 200 dòng quan sát, 25 cột. |
| `data/khao-sat-diem-trung-binh.csv` | Dữ liệu đã lọc và tính điểm: 197 dòng, 27 cột; dùng để nhập vào phiên bản cũ khi so sánh giao diện trước và sau nâng cấp. |
| `run-khao-sat.ts` | Gọi mã frontend để đọc dữ liệu, áp dụng mã khuyết, tính Alpha/PCA, Recode, tính điểm, tổng hợp, thử Undo và đo thời gian `computeProfile`. |
| `analyze-khao-sat.py` | Đọc kết quả bước TypeScript, gọi API PAF/MICE/OLS bằng `TestClient`, đối chiếu với NumPy và tạo ba hình. |

Script khai báo giá trị `7` của `TS4` là mã khuyết và thiết lập mức đo ordinal cho các mục TS/NT.

Tệp tính điểm giữ 197 dòng có đủ dữ liệu ở cả 10 mục `TS1`–`TS5`, `NT1`–`NT5` sau khi áp dụng mã khuyết. Ba dòng còn lại bị loại do thiếu ít nhất một mục. Hai cột bổ sung được tính như sau:

- `DIEM_TS = MEAN([TS1], [TS2], [TS3], [TS4], [TS5])`.
- `DIEM_NT = MEAN([NT1], [NT2], [NT3], [NT4], [NT5])`.

Trong 197 dòng này, một dòng thiếu GPA nên mẫu hồi quy OLS còn 196 dòng. Hai script chỉ cần `data/khao-sat.csv` làm đầu vào; chúng tự tính điểm lại khi chạy.

## Chuẩn bị môi trường

Cần Node.js, npm và Python cùng các phụ thuộc của Quantis. Các lệnh dưới đây dùng PowerShell và được chạy từ **thư mục gốc repository Quantis**.

```powershell
npm ci
python -m venv .tmp/thesis-venv
.\.tmp\thesis-venv\Scripts\Activate.ps1
python -m pip install -r backend-python/requirements.txt -r backend-python/requirements-dev.txt matplotlib
```

`vite-node` được cài cùng cây phụ thuộc frontend qua `npm ci`. Matplotlib cần được cài bổ sung để dựng hình. Script Python gọi ứng dụng FastAPI trong cùng tiến trình qua `TestClient`, nên không cần khởi động server frontend hoặc backend riêng.

## Chạy ca minh họa

Tạo thư mục đầu ra trước, rồi chạy lần lượt hai bước:

```powershell
New-Item -ItemType Directory -Force .tmp/thesis-results | Out-Null
npm exec -- vite-node scripts/thesis/run-khao-sat.ts scripts/thesis/data/khao-sat.csv .tmp/thesis-results/user-demo-frontend.json
python scripts/thesis/analyze-khao-sat.py .tmp/thesis-results
```

Có thể thay `.tmp/thesis-results` bằng thư mục khác; đường dẫn JSON ở bước đầu và thư mục truyền cho bước sau phải tương ứng. Giữ tên tệp trung gian là `user-demo-frontend.json` vì script Python đọc theo tên này.

## Kết quả và phép đối chiếu

| Tệp đầu ra | Nội dung |
| --- | --- |
| `user-demo-frontend.json` | Dữ liệu trung gian, kết quả frontend, thông tin Undo và thời gian đo. |
| `user-demo-summary.json` | Kết quả tổng hợp và các phép tính tham chiếu. |
| `fig-4-1.png` | Trị riêng quan sát và ngưỡng Parallel Analysis của PAF. |
| `fig-4-2.png` | Điểm TS trung bình theo năm học kèm khoảng tin cậy 95%. |
| `fig-4-3.png` | Phần dư theo GPA dự đoán của mô hình OLS. |

Script Python kiểm tra số bộ dữ liệu MICE, việc giữ nguyên giá trị quan sát và điền đủ các mục TS/NT; đồng thời đối chiếu Alpha, trị riêng PCA và hệ số OLS bằng NumPy. Ngưỡng sai khác tuyệt đối lần lượt là `1e-10`, `1e-8` và `1e-8`. Nếu một điều kiện kiểm tra không đạt, script sẽ dừng với lỗi.

Thời gian đo `computeProfile` phụ thuộc máy và trạng thái thực thi, nên có thể khác số liệu trong báo cáo.