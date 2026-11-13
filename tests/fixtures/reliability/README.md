# Statistical reference scripts

These scripts independently calculate expected results for the TypeScript tests.
They are development tools and are not required to run the application or Vitest.

## Reliability

`reliability_reference.py` uses NumPy, pandas, and SciPy to calculate Cronbach's
alpha, standardized alpha, Feldt confidence intervals, item statistics, and
correlations for a fixed 12-row, 5-item Likert fixture. It also prints results
without reverse-coding Q3 and for constant-item and two-item cases.

From the repository root, with Python 3 available:

```sh
python -m venv tests/fixtures/reliability/.venv
```

Activate the environment on Windows PowerShell:

```powershell
.\tests\fixtures\reliability\.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:

```sh
source tests/fixtures/reliability/.venv/bin/activate
```

Then install the reference dependencies and run the script:

```sh
python -m pip install -r tests/fixtures/reliability/requirements.txt
python tests/fixtures/reliability/reliability_reference.py
```

Expected values are copied manually into
`src/utils/__tests__/reliability.test.ts`; Vitest does not execute Python.
If the fixture or statistical definition changes, review the Python output and
update the matching TypeScript fixture and expectations together. Do not update
expected values solely to make a failing test pass.

Run the reliability unit tests with:

```sh
npm test -- src/utils/__tests__/reliability.test.ts
```
