# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users:
- Undergraduate and graduate students learning quantitative research methods, conducting coursework, preparing graduation theses, and needing guided assistance.
- Academic researchers, lecturers, and faculty members in economics, business, management, and social sciences conducting empirical research and publishing peer-reviewed studies.

Their situation:
- Conducting empirical research, analyzing survey and secondary data, testing hypotheses, and writing academic reports or theses.
- Seeking an accessible, web-native alternative or companion to legacy commercial software (SPSS, Stata) with modern UX and immediate AI guidance.

## Product Purpose

Quantis is an AI-augmented quantitative analysis and statistics research platform. It exists to democratize rigorous empirical data analysis in higher education and academic research by eliminating complex installations, high licensing costs, and steep software learning curves.

Success means students and researchers can reliably navigate the full quantitative workflow—from data cleaning and variable specification to running 50+ statistical methods, understanding diagnostic tests, and generating accurate, reproducible APA-compliant reports with verified numbers.

## Positioning

A comprehensive academic research suite tightly integrated with the National Economics University (NEU) AI Portal ecosystem (`research.neu.edu.vn`), official dataset archives, and Writium open-science pre-registration.

Quantis uniquely combines:
1. Zero-install, browser-first privacy and speed for standard data operations and tests.
2. Full SPSS-standard metadata support (Data View vs. Variable View, custom missing value codes, value labels, measurement scales).
3. Hybrid server-grade Python computation for advanced econometrics (panel data with Fixed/Random Effects, SEM/CFA/PLS-SEM, MICE imputation).
4. In-situ AI research assistant that interprets computed numbers and drafts APA narratives while never fabricating statistical results.

## Operating Context

- **Deployment Models**:
  - Standalone web app (browser `localStorage` or PostgreSQL backend authentication).
  - Embedded in NEU AI Portal (`/embed/quantis`) with single sign-on / header-based user context (`X-User-Id`).
- **Data Formats**:
  - Direct browser import: CSV, TSV, JSON, TXT.
  - Server-assisted parsing: Excel (.xlsx, .xls), SPSS (.sav), Stata (.dta), SAS (.sas7bdat), R (.rds, .RData), NEU Archive.
- **Workflow Cadence**:
  - Data ingestion & inspection -> Variable definition & missing value specification -> Data preparation & transformation -> Exploratory & hypothesis testing -> Data visualization -> AI explanation & APA writeup -> Open science pre-registration & reproducible workflow tracking.
- **Language & Cultural Context**:
  - Full bilingual Vietnamese and English interface with 23 embedded statistical terminology tooltips tailored to university research standards.

## Capabilities and Constraints

- **Capabilities**:
  - Over 50 statistical methods across 10 functional groups: Correlation (5), Hypothesis testing (22), Reliability analysis (Cronbach's alpha), Regression (OLS, Logistic, Poisson, Ridge), Factor analysis (EFA, PCA), SEM (Mediation, Moderation, Path, CFA, PLS-SEM), Machine Learning (K-means, multi-class classification), Bayesian (Beta-Binomial), and Panel Data (Pooled OLS, Fixed Effects, Random Effects, Hausman test).
  - SPSS-style Data View and Variable View with inline editing, keyboard navigation, value label toggling, and missing value exclusion from all calculations.
  - 13 interactive chart types with PNG and clipboard export.
  - Integrated Open Science protocols and Writium synchronization.
- **Constraints**:
  - Data scale ceiling: Up to 50,000 rows in client-side memory; up to 100,000 rows for Python backend analysis (`QUANTIS_ANALYSIS_MAX_ROWS`).
  - MICE imputation is currently deterministic single imputation (IterativeImputer with BayesianRidge, Rubin's rules multi-imputation pending).
  - Stata/SAS tagged missing codes (`.a`–`.z`) require further empirical file validation.
  - Heavy calculations (panel, SEM, CFA, MICE) require an active Python backend service.

## Brand Commitments

- **Product Name**: Quantis.
- **Vietnamese Identity**: Phân tích định lượng (NEU AI Portal alias `quantis`).
- **Institutional Alignment**: National Economics University (Đại học Kinh tế Quốc dân - NEU).
- **Tone of Voice**: Rigorous, objective, academic, clear, and pedagogically supportive.
- **AI Ethics & Boundary**: Explicit disclaimer across all interfaces that AI is strictly an interpretive aid ("AI diễn giải kết quả và có thể sai sót, cần người nghiên cứu kiểm chứng"); calculation numbers are never produced by LLMs.

## Evidence on Hand

- **Codebase Truth**: Complete React 18 + TypeScript + Zustand + Tailwind CSS v4 frontend with 173 Vitest tests, and Python FastAPI backend with Pytest suite.
- **Sample Datasets**: Built-in seed datasets in `src/sampleDatasets.ts` and `src/sample-data.ts`.
- **Open Science Protocols**: Research protocol definitions in `src/writiumResearchProtocols.ts` and `src/OpenScienceProtocolPanel.tsx`.
- **Documentation**: Comprehensive functional documentation in `README.md`, `docs/FEATURES.md`, `docs/QUANTIS-DATABASE.md`, and `docs/QUANTIS-PORTAL-AND-SURVEYLAB.md`.

## Product Principles

1. **Statistical Truth Over AI Hallucination**: Every figure, test statistic, p-value, and confidence interval is computed deterministically; AI explains and structures academic narratives based solely on computed facts.
2. **Academic Rigor with Low Cognitive Friction**: Provide familiar SPSS/Stata conventions (Variable View, missing code exclusion, measurement scales) inside a modern, instant, zero-install web application.
3. **Pedagogical Guidance**: Scaffold student understanding through contextual terminology explanations, assumption checks, and APA 7th style writeup templates.
4. **Reproducibility by Design**: Ensure workflows from raw data ingestion to final statistical conclusions can be saved, inspected, and shared according to Open Science standards.

## Accessibility & Inclusion

- Bilingual Vietnamese and English support across all UI elements and statistical tooltips.
- Visual clarity for missing values (light pink) and non-numeric values in numeric columns (light yellow with warning indicators).
- Responsive adaptation supporting mobile and tablet screens (`100dvh`, overlay navigation, horizontal scroll toolbars) alongside dense desktop analytical views.
