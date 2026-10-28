# Thiết Kế Chi Tiết: MICE Đa Nhập Liệu (Multiple Imputation) và Gộp Ước Lượng Theo Luật Rubin

**Ngày tạo:** 2026-10-28  
**Tác giả:** Antigravity & ncbachh  
**Trạng thái:** Hoàn tất rà soát Builder Check & Chờ phê duyệt của người dùng  
**Mã Issue:** [#8 - MICE: bật sample_posterior / đa nhập liệu đúng nghĩa (m bộ dữ liệu + gộp Rubin)](https://github.com/Lampx83/Quantis/issues/8)  
**Nhánh:** `feature/issue-8-mice-multiple-imputation-NEW`

---

## 1. Bối cảnh & Mục tiêu (Intent & Why)

### 1.1. Hiện trạng & Vấn đề
Hiện tại, chức năng MICE trong Quantis (`IterativeImputer` kết hợp `BayesianRidge`) đang chạy ở chế độ tất định (`sample_posterior=False`), chỉ sinh ra **duy nhất 1 bộ dữ liệu đã điền**.
Về mặt phương pháp luận thống kê:
- Việc điền đơn bội (single imputation) coi các giá trị dự báo như thể chúng là giá trị quan sát thực tế.
- Bỏ qua độ bất định nội suy (imputation uncertainty) dẫn đến sai số chuẩn (Standard Error - $SE$) của các ước lượng sau đó bị đánh giá thấp (underestimated), khoảng tin cậy bị thu hẹp giả tạo và tỷ lệ sai lầm loại I (Type I error rate) tăng cao.

### 1.2. Mục tiêu (Goals)
1. **Đa nhập liệu thực thụ**: Bật `sample_posterior=True` trong `BayesianRidge`, sinh ra $m$ bộ dữ liệu hoàn chỉnh ($m \ge 2$, mặc định $m = 5$, kẹp trong khoảng $2 \le m \le 20$) với các random seed khác nhau.
2. **Tổng hợp theo luật Rubin (Rubin's Rules)**:
   - **Báo cáo mô tả chi tiết tại Transform Tab**: Tổng hợp thống kê mô tả gộp (Mean gộp $\bar{Q}$, Rubin SE, phương sai nội bộ $W$, phương sai giữa các bộ $B$, bậc tự do điều chỉnh $\nu_{adj}$, Fraction of Missing Information - FMI, và Khoảng tin cậy 95%).
   - **Hồi quy tuyến tính gộp (Linear Regression OLS)**: Trong `RegressionTab`, tự động phát hiện MICE Bundle và chạy OLS trên cả $m$ bộ, gộp các hệ số hồi quy $\bar{\beta}$, sai số chuẩn Rubin $SE(\bar{\beta})$, bậc tự do điều chỉnh $\nu_{adj}$ (Barnard & Rubin 1999), giá trị $t$, $p$-value, FMI và $R^2$ gộp.
3. **Cấu trúc lưu trữ Imputed Dataset Bundle (Phương án 1 với Sparse Delta)**:
   - Nhóm $m$ bộ dữ liệu con và bộ dữ liệu gốc trong 1 thực thể Bundle duy nhất ở Store.
   - Sử dụng cơ chế **Sparse Delta (độ lệch thưa)** chỉ lưu tọa độ các ô khuyết và mảng $m$ giá trị điền để tiết kiệm >95% bộ nhớ, bảo vệ hạn mức 5MB của LocalStorage.
   - Dataset Bundle được đặt ở chế độ **Chỉ đọc (Read-only)** trên DataGrid để bảo vệ tính toàn vẹn toán học của các tham số Rubin đã tính. Có nút "Nhân bản thành dataset thường" nếu người dùng muốn sửa dữ liệu.
   - Cho phép người dùng chuyển đổi xem từng bộ $(0, 1, \dots, m)$ trên DataGrid với đánh dấu ô được điền.

### 1.3. Phi mục tiêu & Giới hạn (Non-goals & Anti-goals)
- **Non-goals**: 
  - Không mở rộng tab Thống kê mô tả độc lập (`DescriptiveStatsView.tsx`) thành phân tích gộp động (giữ nguyên bảng Rubin trực quan đầy đủ tại `TransformTab.tsx`).
  - Không triển khai kiểm định ma trận đa biến ANOVA $F$-test ($D_1/D_2$ statistics) do phức tạp và không nằm trong cấu trúc OLS hiện tại của Quantis.
  - Các mô hình hồi quy khác (Logistic, Poisson, Ridge) chạy trên bộ dữ liệu đang chọn và hiển thị ghi chú minh bạch rằng luật Rubin đang áp dụng cho OLS.
- **Anti-goals**: 
  - Không tạo ra $m$ dòng dataset riêng biệt làm rối sidebar dataset.
  - Không sửa đổi hay phụ thuộc vào bất kỳ mã nguồn hay tài liệu nào từ nhánh cũ `feature/issue-8-mice-multiple-imputation` / SPEC-08.
  - Không làm suy giảm hiệu năng đối với các dataset vừa và lớn (cần cơ chế kẹp $m$ từ 2–20, $max\_iter$ từ 1–50).

---

## 2. Các phương án kiến trúc & Lý do chọn Phương án 1

Trong giai đoạn Brainstorming, 3 phương án đã được xem xét:
1. **Phương án 1 (Imputed Dataset Bundle)**: Nhóm $m$ bộ dữ liệu trong 1 Dataset Bundle mẹ - con, tích hợp xem nhanh trên DataGrid và tự động gộp Rubin ở tab Phân tích.
2. **Phương án 2 (Flat Multi-Datasets)**: Tạo ra $m$ dataset rời rạc trên danh sách. (Bị loại vì làm tràn giao diện và bắt người dùng ghép thủ công).
3. **Phương án 3 (Direct In-Analysis MICE Pooling)**: Chỉ chạy MICE gộp ngầm trong tab Phân tích mà không lưu các bộ dữ liệu ra Data tab. (Bị loại vì người dùng không kiểm tra hay xuất được các bộ dữ liệu đã điền).

**Lựa chọn:** Phương án 1 được chọn vì phản ánh đúng chuẩn của các phần mềm thống kê hàng đầu thế giới (SPSS `Split by Imputation_`, Stata `mi`, R `mice`), cân bằng hoàn hảo giữa tính toàn vẹn dữ liệu và trải nghiệm người dùng gọn gàng.

---

## 3. Cơ sở toán học: Luật Rubin (Rubin's Rules Formulation)

Giả sử có $m$ bộ dữ liệu hoàn chỉnh được sinh từ phân phối hậu nghiệm predictive distribution: $Y^{(1)}, Y^{(2)}, \dots, Y^{(m)}$.

### 3.1. Ước lượng điểm gộp (Pooled Point Estimate)
Với tham số quan tâm $Q$ (trung bình cột hoặc hệ số hồi quy $\beta_j$), trên mỗi bộ $l \in \{1, \dots, m\}$, mô hình ước lượng được $\hat{Q}^{(l)}$:
$$\bar{Q} = \frac{1}{m} \sum_{l=1}^{m} \hat{Q}^{(l)}$$

### 3.2. Phương sai và Sai số chuẩn (Variance & Standard Error)
1. **Phương sai nội bộ (Within-imputation variance $\bar{U}$)**:
   $$\bar{U} = \frac{1}{m} \sum_{l=1}^{m} U^{(l)}$$
   Trong đó $U^{(l)} = \widehat{\text{Var}}(\hat{Q}^{(l)})$ (với trung bình là $s_l^2 / n$, với hồi quy là phần tử đường chéo của ma trận hiệp phương sai sai số $\widehat{\text{Cov}}(\hat{\beta}^{(l)})$).

2. **Phương sai giữa các bộ (Between-imputation variance $B$)**:
   $$B = \frac{1}{m - 1} \sum_{l=1}^{m} (\hat{Q}^{(l)} - \bar{Q})^2$$

3. **Phương sai tổng hợp (Total variance $T$)**:
   $$T = \bar{U} + \left(1 + \frac{1}{m}\right) B$$

4. **Sai số chuẩn Rubin (Rubin SE)**:
   $$SE = \sqrt{T}$$

### 3.3. Bậc tự do điều chỉnh (Degrees of Freedom)
Áp dụng hiệu chỉnh cỡ mẫu hữu hạn của **Barnard & Rubin (1999)** để tránh phóng đại bậc tự do khi cỡ mẫu thực tế $n$ vừa phải:
- Bậc tự do thuần của Rubin (1987):
  $$\nu_m = (m - 1) \left( 1 + \frac{\bar{U}}{(1 + 1/m)B} \right)^2$$
- Bậc tự do khi dữ liệu quan sát đầy đủ: $\nu_0 = n - k$ (với trung bình thì $k=1$, hồi quy thì $k$ là số tham số).
- Bậc tự do ước lượng từ dữ liệu quan sát:
  $$\nu_{obs} = \left( \frac{\nu_0 + 1}{\nu_0 + 3} \right) \nu_0 (1 - \gamma), \quad \text{với } \gamma = \frac{(1 + 1/m)B}{T}$$
- Bậc tự do gộp cuối cùng:
  $$\nu_{adj} = \begin{cases} \frac{\nu_m \cdot \nu_{obs}}{\nu_m + \nu_{obs}} & \text{khi } B > 0 \\ \nu_0 & \text{khi } B = 0 \end{cases}$$

### 3.4. Các chỉ số phụ trợ
- **Gia tăng tương đối của phương sai (Relative increase in variance $r$)**:
  $$r = \frac{(1 + 1/m)B}{\bar{U}}$$
- **Tỷ lệ thông tin bị thiếu (Fraction of Missing Information - FMI $\lambda$)**:
  $$\lambda = \frac{r + 2 / (\nu_{adj} + 3)}{r + 1}$$
- **Khoảng tin cậy 95%**:
  $$CI_{95\%} = \left[ \bar{Q} - t_{crit}(\nu_{adj}, 0.975) \cdot SE, \quad \bar{Q} + t_{crit}(\nu_{adj}, 0.975) \cdot SE \right]$$

---

## 4. Đặc tả kỹ thuật Backend (Python)

### 4.1. File `backend-python/analysis_impl.py`
Mở rộng hàm `run_mice_imputation`:
```python
def run_mice_imputation(
    rows: list,
    columns: list[str] | None = None,
    variables: dict[str, dict] | None = None,
    max_iter: int = 10,
    m: int = 5,
    random_state: int = 42,
) -> dict:
```
- **Xác thực tham số**:
  - `m = max(2, min(20, int(m)))` (mặc định 5).
  - `max_iter = max(1, min(50, int(max_iter)))` (mặc định 10).
- **Cấu hình IterativeImputer**:
  - `estimator=BayesianRidge(sample_posterior=True)`
  - Vòng lặp chạy $m$ lần với `random_state = random_state + i` ($i = 0 \dots m-1$).
  - Mỗi vòng lặp sinh ra 1 ma trận `imputed_array_i` và ép dải giá trị kẹp trong $[min\_val, max\_val]$ quan sát được của cột.
  - Tôn trọng các mã khuyết định trước trong `variables` (SPSS discrete & range missing codes).
- **Tính toán Rubin Descriptive Statistics**:
  - Tính $\bar{Q}$, $\bar{U}$, $B$, $T$, $SE$, $\nu_{adj}$, FMI $\lambda$, 95% CI cho từng cột số được nội suy.
- **Dữ liệu trả về**:
  ```python
  return {
      "imputedDatasets": [out_rows_1, out_rows_2, ..., out_rows_m],
      "imputedColumns": numeric_target_cols,
      "m": m,
      "iterations": max_iter,
      "rubinStatistics": rubin_stats,  # Danh sách metric theo Rubin
  }
  ```

### 4.2. File `backend-python/analysis_impl.py`: Hỗ trợ Hồi quy tuyến tính gộp Rubin
Thêm hàm hoặc mở rộng `calculate_linear_regression`:
- Hỗ trợ tham số `imputed_datasets: list[list[list[str]]] | None = None`.
- Nếu có `imputed_datasets` ($m$ bảng):
  - Chạy OLS độc lập trên từng bảng $l \in \{1, \dots, m\}$.
  - Thu thập các vector hệ số $\hat{\beta}^{(l)}$ và ma trận hiệp phương sai sai số $\widehat{\text{Cov}}(\hat{\beta}^{(l)})$.
  - Áp dụng công thức Rubin (Mục 3) để tính:
    - $\bar{\beta}_j$, $SE_j(\bar{\beta})$, bậc tự do riêng cho từng hệ số $\nu_{adj, j}$, $t_j = \bar{\beta}_j / SE_j$, $p$-value dựa trên phân phối Student-t với $\nu_{adj, j}$, FMI $\lambda_j$ và 95% CI.
    - $R^2$ gộp: Giá trị trung bình $R^2$ trên $m$ mô hình.
    - Model summary gộp: $R^2$, Adj $R^2$, $n$, số tham số.
- Trả về cấu trúc kết quả hồi quy chuẩn có gắn kèm cờ `rubinPooled: True`, bảng coefficients gồm các cột Rubin (`withinVar`, `betweenVar`, `rubinDf`, `fmi`).

### 4.3. File `backend-python/routes_analyze.py`
- Cập nhật `MiceImputeBody`:
  ```python
  class MiceImputeBody(BaseModel):
      rows: list
      columns: list[str] | None = None
      variables: dict[str, dict] | None = None
      max_iter: int = 10
      m: int = 5
      random_state: int = 42
  ```
- Cập nhật `LinearRegressionBody` để nhận thêm `imputed_datasets: list[list[list[Any]]] | None = None`.

---

## 5. Đặc tả kỹ thuật Frontend (React / TypeScript)

### 5.1. Mở rộng Model dữ liệu (`src/types.ts`) với Cơ chế Sparse Delta
Để không làm tràn giới hạn 5MB của LocalStorage trình duyệt, cấu trúc Bundle lưu dữ liệu dạng độ lệch thưa (Sparse Delta):
```typescript
export interface ImputationSparseCell {
  rowIndex: number;          // Vị trí dòng (0-indexed trong dataRows)
  values: string[];          // Mảng m giá trị tương ứng cho m bộ nội suy
}

export interface ImputationMeta {
  bundleId: string;               // UUID định danh nhóm bundle
  m: number;                      // Số lượng bộ dữ liệu (vd: 5)
  activeImputationIndex: number;  // 0: Gốc, 1..m: Bộ điền i
  imputedColumns: string[];       // Danh sách các cột đã nội suy
  rubinStatistics?: RubinColumnStatistic[]; // Thống kê Rubin tính sẵn
  // Sparse delta: map từng cột khuyết sang danh sách các ô được điền
  sparsePatches: Record<string, ImputationSparseCell[]>;
  // Bảng dữ liệu gốc ban đầu chứa các ô khuyết
  originalRows: string[][];
}

export interface RubinColumnStatistic {
  column: string;
  missingCount: number;
  originalMean?: number | null;
  originalStd?: number | null;
  pooledMean: number;
  withinVariance: number;
  betweenVariance: number;
  totalVariance: number;
  rubinSe: number;
  df: number;
  fmi: number;
  ciLower: number;
  ciUpper: number;
}
```
Mở rộng `Dataset`:
```typescript
export interface Dataset {
  // ... các trường hiện có
  imputationMeta?: ImputationMeta;
  readOnly?: boolean;             // Khóa chỉnh sửa nếu là bundle
}
```

### 5.2. Store (`src/stores/useDataStore.ts`)
Thêm các action hỗ trợ bundle:
- `setActiveImputationIndex(datasetId: string, index: number)`:
  Chuyển đổi view hiển thị giữa `0` (Bộ gốc), `1..m` (Bộ nội suy tương ứng).
  Dựng nhanh bảng dữ liệu `dataset.data` và `preview` từ `originalRows` áp các patch của `sparsePatches` tại index tương ứng mà không phải lưu $m$ bảng đầy đủ trong LocalStorage.
- Khóa các thao tác đột biến (`updateCell`, `addRow`, `removeRow`, `removeVariable`) khi `dataset.readOnly === true`.
- Bổ sung helper `cloneBundleAsStandardDataset(datasetId: string, index: number)` cho phép người dùng tách một bộ thành dataset độc lập nếu muốn chỉnh sửa tự do.

### 5.3. Giao diện Transform Tab (`src/features/data/TransformTab.tsx`)
- Thêm input chọn **Số bộ dữ liệu $m$ (Imputations)**:
  - Kiểu number, giới hạn từ 2 đến 20, mặc định là 5.
  - Kèm nhãn giải thích: *"MICE Đa nhập liệu sinh $m$ bộ dữ liệu với random seeds khác nhau và gộp kết quả theo luật Rubin"*.
- Nâng cấp **Bảng Báo cáo MICE**:
  - Hiển thị đầy đủ bảng Rubin: `Biến số`, `Số ô khuyết`, `Mean (gốc)`, `Mean gộp (Rubin)`, `SE (Rubin)`, `Var nội (W)`, `Var ngoại (B)`, `Bậc tự do (df)`, `FMI (%)`, `KTC 95%`.
- Lưu kết quả: Tạo ra một Dataset Bundle mới trong `dataStore` với tên `[Tên gốc] (MICE m={m})`.

### 5.4. Giao diện DataGrid (`src/features/data/grid/DataView.tsx` hoặc header DataGrid)
Khi `selectedDataset.imputationMeta` tồn tại:
- Hiển thị thanh công cụ chọn bộ dữ liệu:
  `[📋 Bộ gốc (m=0)] [ Bộ 1 ] [ Bộ 2 ] [ ... ] [ Bộ m ]`
- Cung cấp badge trạng thái: *"MICE Bundle: $m$ imputations"*.
- Tùy chọn làm nổi bật (highlight nền nhẹ) các ô đã được điền ở các bộ $1..m$ để người dùng phân biệt được ô gốc và ô nội suy.

### 5.5. Giao diện Hồi quy tuyến tính (`src/features/analysis/tabs/RegressionTab.tsx`)
- Khi dataset được chọn có `imputationMeta`:
  - Hiển thị thông báo/badge: *"Bộ dữ liệu Đa nhập liệu MICE ($m={m}$). Phân tích sẽ tự động áp dụng quy tắc gộp Rubin."*
  - Payload gửi tới API `/regression-linear` đính kèm mảng `imputed_datasets = selectedDataset.imputationMeta.imputedDatasets`.
- Render bảng kết quả hồi quy gộp:
  - Bảng hệ số: `Biến`, `Hệ số B (Pooled)`, `Rubin SE`, `t`, `df (Rubin)`, `Sig. (p)`, `FMI`, `95% CI`.
  - Bổ sung chú thích giải thích rõ phương pháp gộp Rubin (Barnard-Rubin 1999 adjusted degrees of freedom).

### 5.6. Quốc tế hóa (`src/i18n.ts`)
Bổ sung đầy đủ nhãn tiếng Việt và tiếng Anh cho:
- Số bộ dữ liệu $m$ (`transformTab.mice.mLabel`, `transformTab.mice.mHelp`).
- Các cột của bảng Rubin: `rubinMean`, `rubinSe`, `withinVar`, `betweenVar`, `df`, `fmi`, `ci`.
- Các nhãn trong DataGrid và Regression tab.

---

## 6. Kế hoạch Kiểm thử (Verification & Test Strategy)

### 6.1. Backend Tests (`backend-python/test_mice_imputation.py`)
1. **Kiểm tra tính ngẫu nhiên & khác biệt của $m$ bộ**:
   - Chạy `run_mice_imputation` với $m=5$. Xác nhận cả 5 bộ trả về đều đầy đủ dữ liệu (không còn NaN).
   - Xác nhận giữa các bộ $1..5$, các giá trị điền vào các ô khuyết khác nhau ($B > 0$).
2. **Kiểm tra tính chính xác của công thức Rubin**:
   - So sánh kết quả tính tay $\bar{Q}$, $\bar{U}$, $B$, $T$, $SE$, $\nu_{adj}$ trên một ma trận kiểm thử chuẩn với kết quả từ hàm backend.
3. **Kiểm tra kẹp giới hạn**:
   - Giá trị điền không vượt quá min-max của cột.
   - Tham số $m$ bị kẹp trong $[2, 20]$, $max\_iter$ trong $[1, 50]$.
4. **Kiểm tra Hồi quy tuyến tính gộp Rubin**:
   - Tạo dữ liệu mô phỏng có missing, chạy hồi quy OLS trên từng bộ và kiểm tra bảng hồi quy gộp Rubin trả về đúng $\bar{\beta}$, $SE_{Rubin}$, $\nu_{adj}$, $p$-value.

### 6.2. Frontend Tests (`src/features/data/__tests__/transformTab.test.tsx`, `useDataStore.test.ts`)
1. Kiểm tra render và tương tác input $m$ trong `TransformTab`.
2. Kiểm tra việc tạo Bundle và chuyển đổi `activeImputationIndex` trong `useDataStore`.
3. Kiểm tra hiển thị bảng báo cáo thống kê Rubin trong TransformTab sau khi hoàn tất.
4. Kiểm tra RegressionTab gửi đúng mảng `imputed_datasets` khi phân tích dataset dạng Bundle.

---

## 7. Rủi ro & Giải pháp giảm thiểu (Risks & Mitigations)

| Rủi ro | Mức độ | Giải pháp giảm thiểu |
|---|---|---|
| **Bộ nhớ trình duyệt**: $m$ bộ dữ liệu với file 100.000 dòng có thể chiếm nhiều RAM trong Zustand | Trung bình | Kẹp $m \le 20$ (khuyến nghị mặc định $m=5$). Chỉ lưu mảng dữ liệu cốt lõi, không nhân bản các trường metadata không cần thiết. |
| **Ma trận suy biến (Singular Matrix)** khi fit BayesianRidge hoặc OLS | Thấp | Bọc xử lý ngoại lệ an toàn `LinAlgError`, tự động áp dụng regularization nhỏ hoặc fallback tính giả nghịch đảo (pseudoinverse) tương tự như code hiện tại của Quantis. |
| **Bậc tự do phân số ($\nu_{adj}$)** | Thấp | Dùng `scipy.stats.t.sf` / `scipy.stats.t.ppf` hỗ trợ bậc tự do thực (float degrees of freedom) hoàn toàn mượt mà. |
