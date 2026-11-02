# Csv Quality Garden

Create a complete working portfolio-quality application named DataPilot. English modern professional UI for CSV data cleaning and analysis. Build the real app, not a landing page or mockup. Local browser processing, no login or backend needed. Distinctive polished analytics workspace: dark navy sidebar, light slate canvas, teal/cyan accent, refined typography, clear spacing, responsive accessible keyboard friendly controls and labels, focus states. CSV drag/drop and file picker, robust quoted/newline/UTF-8/BOM CSV parsing (PapaParse recommended), validate invalid/empty files, practical 10 MB limit and clear errors. Immediately usable built-in messy retail sales demo dataset and download demo CSV. Dashboard metrics computed from actual current data: rows, columns, missing cells, duplicate rows, completeness. Paginated searchable table with original/current views, column type inference and profile (numeric/text/boolean/date, null count, unique values and numeric stats). Cleaning actions with explicit selected columns: trim whitespace; remove exact duplicate rows; drop rows with missing values; fill missing with custom value or numeric mean/median only valid numeric columns. Consistent missing definition blank/whitespace only, preserve 0 and false. Immutable original baseline, undo each action and reset; meaningful history; before/after quality and row count comparisons. Charts derived live from data: missingness by column, numeric histogram, category frequency with column selectors and useful empty states. Export actual cleaned CSV with correct quoting and Unicode handling and safe spreadsheet formula treatment disclosed. All buttons functional, no fake stats, no nonfunctional navigation. Include helpful onboarding, privacy/local processing explanation, accessible chart alternatives. Implement meaningful unit tests for parsing, missing and duplicate calculation, cleaning, undo, CSV roundtrip, plus build check. Run browser flow tests if available for demo -> clean -> undo -> export and mobile. Name project DataPilot. Finish implementation and report exact tests run/results and limitations.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d640edcf-4ac0-49a1-a1e0-3b9f0499972b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
