# MICE Đa Nhập Liệu (Multiple Imputation) và Gộp Ước Lượng Theo Luật Rubin - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng MICE Đa nhập liệu ($m$ bộ dữ liệu hoàn chỉnh, `sample_posterior=True`) và tổng hợp ước lượng theo luật Rubin (Rubin's Rules) cho Thống kê mô tả và Hồi quy tuyến tính (OLS), lưu trữ theo mô hình Imputed Dataset Bundle với Sparse Delta để tối ưu hóa bộ nhớ trình duyệt.

**Architecture:** Mở rộng Python backend để `IterativeImputer` chạy $m$ phiên lặp ngẫu nhiên với posterior sampling, trả về mảng $m$ bộ dữ liệu cùng các tham số Rubin; mở rộng `run_ols` để nhận $m$ bảng và gộp hệ số theo Barnard-Rubin (1999). Ở frontend, lưu trữ Bundle dưới dạng Sparse Delta (chỉ lưu các ô khuyết và mảng $m$ giá trị điền) để không vượt quota 5MB của LocalStorage; DataGrid cung cấp thanh điều hướng xem từng bộ $(0..m)$ ở chế độ Read-Only, và `RegressionTab` tự động phát hiện Bundle để hiển thị bảng hồi quy gộp Rubin.

**Tech Stack:** Python 3.13, FastAPI, scikit-learn (IterativeImputer, BayesianRidge), statsmodels (OLS), scipy.stats (phân phối t), React 19, TypeScript, Zustand 5, Tailwind CSS, Vitest, Pytest.

**Spec:** [`docs/superpowers/specs/2026-10-28-mice-multiple-imputation-design.md`](file:///C:/Users/Ku%20Bach/Desktop/khoa-luan/Quantis/.worktrees/issue-8/docs/superpowers/specs/2026-10-28-mice-multiple-imputation-design.md)

## Global Constraints

- Không đọc, ghi hoặc tham chiếu tới branch cũ `feature/issue-8-mice-multiple-imputation` hay các file SPEC-08 cũ.
- Tham số $m$ bị kẹp trong khoảng $2 \le m \le 20$ (mặc định 5).
- Tham số `max_iter` bị kẹp trong khoảng $1 \le max\_iter \le 50$ (mặc định 10).
- Giá trị nội suy kẹp trong khoảng $[min\_obs, max\_obs]$ của từng cột quan sát được.
- Tôn trọng mã khuyết SPSS (discrete & range missing codes) đã khai báo trong metadata.
- Giữ nguyên độ tương thích ngược với các API endpoint hiện có (`/impute-mice` và `/ols`).

## Review Focus

1. **Khác biệt ngẫu nhiên giữa $m$ bộ**: Khi $m \ge 2$, các giá trị điền vào cùng một ô khuyết giữa các bộ phải khác nhau (`sample_posterior=True`) dẫn tới $B > 0$, trừ khi cột không có ô khuyết.
2. **Độ chính xác của công thức Rubin**: $\bar{Q}$, $\bar{U}$, $B$, $T$, $SE$, $\nu_{adj}$, FMI $\lambda$ và 95% CI phải khớp chính xác với công thức Barnard & Rubin (1999).
3. **An toàn bộ nhớ LocalStorage (Sparse Delta)**: Chuyển đổi và lưu trữ trong Zustand store không được nhân bản $m$ mảng 2D lớn làm sập `localStorage.setItem` (`QuotaExceededError`).
4. **Tính nhất quán khi xem DataGrid**: Chuyển đổi giữa Bộ 0 (Gốc) và các Bộ $1..m$ phải cập nhật chính xác các ô hiển thị tương ứng, đồng thời DataGrid ở chế độ Read-Only để không làm sai lệch tham số Rubin.
5. **Hồi quy OLS gộp Rubin**: Khi đưa MICE Bundle vào OLS, kết quả phải trả về đúng số dòng hệ số $\bar{\beta}$, $SE(\bar{\beta})$ lớn hơn SE của từng bộ đơn lẻ (do cộng thêm phương sai ngoại $(1+1/m)B$), kèm bậc tự do điều chỉnh $\nu_{adj}$ riêng cho từng biến.

---

### Task 1: Backend - MICE Đa Nhập Liệu & Thống Kê Mô Tả Gộp Rubin

**Files:**
- Modify: `backend-python/analysis_impl.py:1845-1994`
- Modify: `backend-python/routes_analyze.py:69-80,1190-1205`
- Test: `backend-python/test_mice_imputation.py`

**Interfaces:**
- Consumes: `rows: list`, `columns: list[str] | None`, `variables: dict | None`, `max_iter: int`, `m: int = 5`, `random_state: int = 42`
- Produces: 
  ```python
  {
      "imputedDatasets": list[list[list[str]]], # m bộ hoàn chỉnh
      "imputedColumns": list[str],
      "m": int,
      "iterations": int,
      "rubinStatistics": list[{
          "column": str, "missingCount": int, "originalMean": float | None, "originalStd": float | None,
          "pooledMean": float, "withinVariance": float, "betweenVariance": float, "totalVariance": float,
          "rubinSe": float, "df": float, "fmi": float, "ciLower": float, "ciUpper": float
      }],
      # Tương thích ngược:
      "rows": list[list[str]], # bộ thứ nhất (index 0)
      "statistics": list[dict],
  }
  ```

- [ ] **Step 1: Write the failing tests in `backend-python/test_mice_imputation.py`**

Thêm các test:
- `test_run_mice_imputation_m_datasets_distinct`: kiểm tra $m=3$ trả về 3 bộ dữ liệu, các ô khuyết nhận giá trị khác nhau giữa các bộ ($B > 0$).
- `test_rubin_descriptive_statistics_formulas`: kiểm tra kết quả tính Rubin Statistics $\bar{Q}$, $\bar{U}$, $B$, $T$, $SE$, $\nu_{adj}$, FMI $\lambda$, 95% CI trên dữ liệu kiểm thử chuẩn đối chiếu với công thức giải tích.
- `test_mice_api_endpoint_with_m`: gọi `/api/quantis/analyze/impute-mice` với payload `{ rows, columns, m: 3 }`, kiểm tra status 200 và response có `imputedDatasets` độ dài 3 và `rubinStatistics`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend-python/test_mice_imputation.py -k "test_run_mice_imputation_m_datasets_distinct" -v`  
Expected: FAIL (tham số `m` chưa được hỗ trợ hoặc `imputedDatasets` chưa có).

- [ ] **Step 3: Implement `sample_posterior=True`, $m$ runs, và tính toán Rubin statistics trong `analysis_impl.py` và `routes_analyze.py`**

- Trong `analysis_impl.py`:
  - Thêm helper `_compute_rubin_descriptive(imputed_dfs, original_numeric_df)` tính các metric theo Barnard & Rubin (1999).
  - Cập nhật `run_mice_imputation`: kẹp $2 \le m \le 20$; chạy $m$ vòng lặp với `estimator=BayesianRidge(sample_posterior=True)` và `random_state=random_state + i`.
  - Sinh ra danh sách $m$ bảng `imputedDatasets`, tính `rubinStatistics`, giữ lại trường `rows = imputedDatasets[0]` và `statistics` để tương thích ngược.
- Trong `routes_analyze.py`:
  - Mở rộng `MiceImputeBody` thêm trường `m: int = 5`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend-python/test_mice_imputation.py -v`  
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-python/analysis_impl.py backend-python/routes_analyze.py backend-python/test_mice_imputation.py
git commit -m "feat(backend): implement MICE multiple imputation with posterior sampling and Rubin descriptive pooling"
```

---

### Task 2: Backend - Hồi Quy Tuyến Tính (OLS) Gộp Theo Luật Rubin

**Files:**
- Modify: `backend-python/analysis_impl.py:492-540`
- Modify: `backend-python/routes_analyze.py:545-560`
- Test: `backend-python/test_mice_imputation.py`

**Interfaces:**
- Consumes: `rows: list`, `y_col: str`, `x_cols: list[str]`, `imputed_datasets: list[list[list[str]]] | None = None`
- Produces: 
  ```python
  {
      "coefficients": dict[str, float],
      "intercept": float,
      "r2": float,
      "adjR2": float,
      "se": dict[str, float],
      "tStat": dict[str, float],
      "pValue": dict[str, float],
      "ciLower": dict[str, float],
      "ciUpper": dict[str, float],
      "n": int,
      "df": float,
      "s2": float,
      "yName": str,
      "xNames": list[str],
      "rubinPooled": bool,
      "rubinDf": dict[str, float],       # nu_adj riêng cho từng biến
      "fmi": dict[str, float],           # Fraction of missing information
      "withinVar": dict[str, float],
      "betweenVar": dict[str, float]
  }
  ```

- [ ] **Step 1: Write the failing tests in `backend-python/test_mice_imputation.py`**

Thêm các test:
- `test_run_ols_rubin_pooling`: chuẩn bị $m=5$ bộ dữ liệu giả lập có độ biến thiên giữa các bộ; chạy `run_ols(rows=[], y_col="y", x_cols=["x1", "x2"], imputed_datasets=datasets)`.
- Xác nhận:
  - `result["rubinPooled"] is True`
  - $SE_j > \sqrt{\bar{U}_j}$ (do cộng thêm phương sai ngoại $(1+1/m)B_j$).
  - Bậc tự do `rubinDf[j]` là số thực $> 0$.
  - $p$-value được tính từ `scipy.stats.t.sf` với bậc tự do `rubinDf[j]`.
- `test_ols_api_with_imputed_datasets`: kiểm tra POST `/api/quantis/analyze/ols` với body có `imputed_datasets`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend-python/test_mice_imputation.py -k "test_run_ols_rubin_pooling" -v`  
Expected: FAIL (chưa có tham số `imputed_datasets` trong `run_ols`).

- [ ] **Step 3: Implement OLS Rubin pooling trong `analysis_impl.py` và `routes_analyze.py`**

- Trong `analysis_impl.py`:
  - Cập nhật `run_ols`: nếu `imputed_datasets` có dữ liệu ($m \ge 2$), fit OLS trên từng bộ $l \in \{1..m\}$;
  - Áp dụng công thức Rubin tính $\bar{\beta}_j$, $\bar{U}_j$, $B_j$, $T_j$, $SE_j$, $\nu_{adj, j}$, $t_j$, $p_j$, FMI $\lambda_j$, 95% CI;
  - Tính mean $R^2$ và mean Adj $R^2$.
- Trong `routes_analyze.py`:
  - Cập nhật `OLSBody` thêm trường `imputed_datasets: list[list[list[Any]]] | None = None`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend-python/test_mice_imputation.py -v`  
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-python/analysis_impl.py backend-python/routes_analyze.py backend-python/test_mice_imputation.py
git commit -m "feat(backend): implement OLS linear regression Rubin pooling with Barnard-Rubin adjusted df"
```

---

### Task 3: Frontend Data Model & Store - Sparse Delta Imputed Bundle

**Files:**
- Modify: `src/types.ts:32-55`
- Modify: `src/stores/useDataStore.ts`
- Test: `src/stores/__tests__/bundleDataStore.test.ts`

**Interfaces:**
- Produces: 
  - `ImputationSparseCell`: `{ rowIndex: number; values: string[] }`
  - `ImputationMeta`: `{ bundleId: string; m: number; activeImputationIndex: number; imputedColumns: string[]; rubinStatistics?: RubinColumnStatistic[]; sparsePatches: Record<string, ImputationSparseCell[]>; originalRows: string[][] }`
  - `Dataset.imputationMeta?: ImputationMeta`, `Dataset.readOnly?: boolean`
  - `useDataStore.getState().setActiveImputationIndex(datasetId: string, index: number)`
  - `useDataStore.getState().cloneBundleAsStandardDataset(datasetId: string, index: number)`

- [ ] **Step 1: Write the failing tests in `src/stores/__tests__/bundleDataStore.test.ts`**

Viết test kiểm tra:
1. Thêm một dataset có `imputationMeta` (Sparse Delta) vào `useDataStore`.
2. Gọi `setActiveImputationIndex(id, 1)`: kiểm tra `dataset.data` và `preview` được vá đúng giá trị của bộ 1 tại các ô khuyết, các ô không khuyết giữ nguyên.
3. Gọi `setActiveImputationIndex(id, 0)`: kiểm tra `dataset.data` khôi phục lại bảng gốc có ô khuyết.
4. Kiểm tra các hàm `updateCell`, `addRow`, `removeRow` bị chặn hoặc không thay đổi khi `dataset.readOnly === true`.
5. Gọi `cloneBundleAsStandardDataset(id, 1)`: sinh ra một dataset mới độc lập có `readOnly = false` và không có `imputationMeta`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/__tests__/bundleDataStore.test.ts`  
Expected: FAIL (types và actions chưa tồn tại).

- [ ] **Step 3: Implement types trong `src/types.ts` và actions trong `src/stores/useDataStore.ts`**

- Khai báo các interface `ImputationSparseCell`, `RubinColumnStatistic`, `ImputationMeta` trong `src/types.ts`.
- Mở rộng `Dataset` với `imputationMeta?: ImputationMeta` và `readOnly?: boolean`.
- Trong `useDataStore.ts`:
  - Thêm action `setActiveImputationIndex`.
  - Thêm action `cloneBundleAsStandardDataset`.
  - Guard các thao tác sửa ô / dòng khi `dataset.readOnly` là true.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/__tests__/bundleDataStore.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/stores/useDataStore.ts src/stores/__tests__/bundleDataStore.test.ts
git commit -m "feat(store): add Imputed Dataset Bundle model with Sparse Delta storage and read-only guards"
```

---

### Task 4: Frontend API & Transform Tab - Luồng Đa Nhập Liệu & Báo Cáo Rubin

**Files:**
- Modify: `src/api.ts:2020-2076`
- Modify: `src/features/data/TransformTab.tsx`
- Modify: `src/i18n.ts`
- Test: `src/features/data/__tests__/transformTabMice.test.tsx`

**Interfaces:**
- Consumes: `analyzeMiceImputation(rows, columns, variables, maxIter, m)`
- Produces: `MiceImputationResponse` chứa `imputedDatasets` và `rubinStatistics`.
- Lưu kết quả vào `dataStore` dưới dạng Bundle có Sparse Delta.

- [ ] **Step 1: Write the failing tests in `src/features/data/__tests__/transformTabMice.test.tsx`**

Viết test kiểm tra:
1. Khi chọn action `fill_mice` trong TransformTab, hiển thị input "Số bộ dữ liệu (m)" có giá trị mặc định là 5, cho phép nhập từ 2 đến 20.
2. Mock API `analyzeMiceImputation` trả về 3 bộ dữ liệu kèm `rubinStatistics`.
3. Bấm nút "Áp dụng":
   - Bảng Báo cáo Rubin hiển thị đúng các cột: Biến số, Số ô khuyết, Mean gốc, Mean gộp (Rubin), Rubin SE, Var nội (W), Var ngoại (B), df, FMI (%), KTC 95%.
   - Một dataset Bundle mới được thêm vào `dataStore` với cờ `readOnly: true` và `imputationMeta.sparsePatches` được dựng chính xác.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/data/__tests__/transformTabMice.test.tsx`  
Expected: FAIL (input `m` và bảng Rubin chưa được hỗ trợ trong TransformTab).

- [ ] **Step 3: Implement API, UI TransformTab và i18n**

- Trong `src/api.ts`:
  - Cập nhật interface `MiceImputationResponse` hỗ trợ `imputedDatasets`, `m`, `rubinStatistics`.
  - Cập nhật hàm `analyzeMiceImputation` nhận thêm tham số `m?: number`.
- Trong `src/i18n.ts`: Thêm các chuỗi tiếng Việt và tiếng Anh cho tham số $m$ và các cột bảng Rubin.
- Trong `src/features/data/TransformTab.tsx`:
  - Thêm state `miceM: number` (mặc định 5).
  - Thêm input điều khiển $m$.
  - Viết helper chuyển $m$ bảng kết quả từ backend thành cấu trúc Sparse Delta `sparsePatches`.
  - Tạo Dataset Bundle lưu vào store với `readOnly: true`.
  - Nâng cấp bảng Báo cáo MICE hiển thị đầy đủ các cột Rubin.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/data/__tests__/transformTabMice.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api.ts src/features/data/TransformTab.tsx src/i18n.ts src/features/data/__tests__/transformTabMice.test.tsx
git commit -m "feat(transform): integrate MICE multiple imputation UI with Rubin descriptive report and sparse delta saving"
```

---

### Task 5: Frontend DataGrid - Thanh Điều Hướng Bundle & Highlight Ô Điền

**Files:**
- Modify: `src/features/data/grid/DataView.tsx` (hoặc thanh header DataGrid)
- Modify: `src/features/data/grid/DataGrid.tsx`
- Modify: `src/i18n.ts`
- Test: `src/features/data/grid/__tests__/bundleDataGrid.test.tsx`

**Interfaces:**
- Consumes: `selectedDataset.imputationMeta`, `selectedDataset.readOnly`
- Produces: Thanh chuyển đổi `[📋 Gốc (m=0)] [ Bộ 1 ] [ Bộ 2 ] ... [ Bộ m ]`, nút nhân bản, và highlight màu nền cho các ô thuộc `sparsePatches`.

- [ ] **Step 1: Write the failing tests in `src/features/data/grid/__tests__/bundleDataGrid.test.tsx`**

Viết test kiểm tra:
1. Khi dataset có `imputationMeta`: render thanh chọn bộ dữ liệu gồm nút Gốc và $m$ nút bộ điền.
2. Bấm vào nút "Bộ 2": gọi `setActiveImputationIndex(dataset.id, 2)`.
3. Hiển thị badge "Chỉ đọc (MICE Bundle)" kèm nút "Nhân bản để chỉnh sửa".
4. Bấm "Nhân bản để chỉnh sửa": gọi `cloneBundleAsStandardDataset`.
5. Các ô nằm trong tọa độ `sparsePatches` khi ở bộ $1..m$ có class highlight riêng (ví dụ `bg-brand/10` hoặc `dark:bg-brand/20`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/data/grid/__tests__/bundleDataGrid.test.tsx`  
Expected: FAIL (thanh điều khiển và highlight chưa có).

- [ ] **Step 3: Implement thanh điều hướng Bundle và highlight ô trong DataGrid**

- Tạo component con `BundleNavigationBar.tsx` trong `src/features/data/grid/`.
- Tích hợp vào `DataView.tsx` phía trên bảng DataGrid khi `dataset.imputationMeta` tồn tại.
- Trong `DataGrid.tsx`: bổ sung hàm kiểm tra ô có thuộc `sparsePatches` của cột hay không để thêm class highlight và tooltip "Giá trị nội suy (Bộ {i})".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/data/grid/__tests__/bundleDataGrid.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/data/grid/ src/i18n.ts
git commit -m "feat(datagrid): add MICE bundle switcher bar, read-only indicator, and imputed cell highlighting"
```

---

### Task 6: Frontend Regression Tab - Hồi Quy Tuyến Tính Gộp Rubin

**Files:**
- Modify: `src/api.ts:556-575`
- Modify: `src/features/analysis/tabs/RegressionTab.tsx`
- Modify: `src/i18n.ts`
- Test: `src/features/analysis/tabs/__tests__/regressionRubin.test.tsx`

**Interfaces:**
- Consumes: `analyzeOLS(rows, yCol, xCols, imputedDatasets)`
- Produces: Hiển thị banner MICE Bundle, bảng kết quả OLS có các cột Rubin (df điều chỉnh, FMI %, Rubin SE, $t$, $p$, 95% CI).

- [ ] **Step 1: Write the failing tests in `src/features/analysis/tabs/__tests__/regressionRubin.test.tsx`**

Viết test kiểm tra:
1. Khi dataset được chọn có `imputationMeta`:
   - Hiển thị banner thông báo: "Đa nhập liệu MICE ($m=5$): Kết quả hồi quy OLS sẽ tự động áp dụng quy tắc gộp Rubin."
2. Khi bấm "Chạy OLS", API `analyzeOLS` được gọi kèm mảng $m$ bảng dữ liệu tái tạo từ Sparse Delta.
3. Khi `olsResult.rubinPooled === true`:
   - Bảng kết quả hiển thị thêm cột `df (Rubin)` và `FMI (%)`.
   - Copy TSV sao chép đúng các cột Rubin.
   - Các mô hình Logistic / Poisson / Ridge hiển thị ghi chú: "Phân tích trên bộ dữ liệu đang hiển thị (Bộ {active}). Quy tắc Rubin hiện áp dụng cho OLS."

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/analysis/tabs/__tests__/regressionRubin.test.tsx`  
Expected: FAIL (tham số `imputedDatasets` và giao diện Rubin chưa được hỗ trợ trong `RegressionTab`).

- [ ] **Step 3: Implement OLS Rubin pooling trong `api.ts`, `RegressionTab.tsx` và `i18n.ts`**

- Trong `src/api.ts`: Cập nhật `analyzeOLS` nhận thêm `imputedDatasets?: string[][][]`.
- Trong `RegressionTab.tsx`:
  - Viết helper tái tạo $m$ bảng từ `dataset.imputationMeta` (áp Sparse Delta lên `originalRows`).
  - Gửi `imputedDatasets` khi chạy OLS nếu dataset là Bundle.
  - Render bảng kết quả OLS thích ứng: hiển thị thêm `df` và `FMI` khi `olsResult.rubinPooled` là true.
  - Bổ sung thông tin giải thích quy tắc Barnard-Rubin (1999).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/analysis/tabs/__tests__/regressionRubin.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api.ts src/features/analysis/tabs/RegressionTab.tsx src/i18n.ts src/features/analysis/tabs/__tests__/regressionRubin.test.tsx
git commit -m "feat(regression): integrate OLS linear regression with Rubin pooling for MICE bundles"
```

---

### Task 7: Kiểm Thử Toàn Diện Hệ Thống & Kiểm Tra Hồi Quy (Full System Verification)

**Files:**
- Test: Toàn bộ test suite Backend (Pytest) và Frontend (Vitest).

- [ ] **Step 1: Chạy toàn bộ backend test suite**

Run: `cd backend-python && pytest -v`  
Expected: Tất cả các test (bao gồm `test_mice_imputation.py`, `test_descriptive_nonnumeric.py`, `test_parse_file.py`, `test_panel.py`) PASS 100%.

- [ ] **Step 2: Chạy toàn bộ frontend test suite**

Run: `npx vitest run`  
Expected: Tất cả các test files PASS 100%.

- [ ] **Step 3: Kiểm tra TypeScript build**

Run: `npx tsc --noEmit`  
Expected: Không có bất kỳ lỗi type nào (0 errors).

- [ ] **Step 4: Commit và chuẩn bị nghiệm thu**

```bash
git commit --allow-empty -m "chore: complete MICE multiple imputation and Rubin pooling implementation and verification"
```
