# DataPilot

**Clean, profile, and explore CSV data in your browser.**

DataPilot turns messy spreadsheet exports into datasets you can understand and use. Inspect data quality, apply reversible cleaning steps, compare the result with the original, and export a cleaned CSV.

## Features

- **Import:** drag and drop a CSV or choose a file, with a 10 MB size limit and UTF-8 support.
- **Quality overview:** row and column counts, missing cells, exact duplicate rows, and completeness.
- **Data explorer:** searchable, paginated tables with original and current views.
- **Column profiles:** inferred types, missing and unique counts, numeric statistics, and common values.
- **Cleaning:** trim whitespace, remove duplicates using selected columns, drop rows with missing values, and fill blanks with a custom value, mean, or median.
- **Reversible workflow:** undo, return to an earlier step, or reset to the original dataset.
- **Charts:** missing values by column, numeric distributions, and category frequencies, with table alternatives.
- **Export:** cleaned CSV with optional spreadsheet formula protection and a UTF-8 BOM for Excel.
- **Built-in demo:** 64 retail orders with duplicates, blanks, whitespace, quoted notes, and Unicode text.

Missing values are blank or whitespace-only cells. Values such as `0`, `false`, and `N/A` are preserved.

## Try the workflow

1. Open the app and select **Load demo**.
2. Inspect **Overview**, **Data**, and **Profile**.
3. In **Clean**, select all columns and apply **Trim whitespace**, then **Remove duplicates**.
4. Use **History** to inspect changes or undo a step.
5. Explore **Charts**, then download the result from **Export**.

When removing duplicates using only some columns, rows are compared using those columns and the first matching row is kept.

## Run locally

Use a current Node.js LTS release and npm:

```sh
git clone https://github.com/Bkrbrk/csv-quality-garden.git
cd csv-quality-garden
npm install
npm run dev
```

The repository also includes a Bun lockfile. With Bun installed, use `bun install --frozen-lockfile` and `bun run dev` instead.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the automated tests |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Tech stack

React 19 · TypeScript · TanStack Start / Router · Vite · Tailwind CSS · shadcn/ui · Papa Parse · Recharts · Vitest · React Testing Library

## Project structure

```text
src/
  components/datapilot/   Workspace and feature screens
  components/ui/          Shared UI components
  lib/datapilot/          CSV, analysis, cleaning, history, and demo logic
  routes/                Application routes and document metadata
  test/                  Shared test setup and routing tests
```

Data transformations are pure functions. The original dataset is retained as an immutable baseline, while history snapshots support undo and reset.

## Data handling and limitations

- CSV parsing, analysis, cleaning, and export run in browser memory; these operations do not require a data upload or login.
- Reloading or closing the tab clears the dataset and cleaning history. Export before leaving.
- Input is decoded as UTF-8, the first row is used as headers, and exported files use commas.
- Short rows are padded with blanks. **The current importer drops fields beyond the header width with a warning.** Check import warnings and fix inconsistent row widths before using important data.
- Numeric mean/median fill requires every non-missing value in the selected column to be numeric.
- Each cleaning step retains a dataset snapshot; large datasets and long histories can use significant memory.
- External font requests and hosting-provided services are separate from the CSV processing pipeline.

## Development notes

The current build uses `@lovable.dev/vite-tanstack-config`. Replacing this preset requires a tested build configuration migration; deleting it alone breaks the Vite configuration. See [docs/maintenance.md](docs/maintenance.md) for branding and hosting details.
