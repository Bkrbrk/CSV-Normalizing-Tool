<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- DataPilot is fully client-side: CSV parsing, cleaning and export run in the browser with no backend, so user data never leaves the device.
- Pure data logic lives in `src/lib/datapilot/` (no React); UI in `src/components/datapilot/`. Keep logic pure and covered by `datapilot.test.ts`.
- "Missing" is defined once in `isMissing` (blank/whitespace only); every metric and action must use it so counts stay consistent.
- Cleaning functions never mutate input; history stores per-step snapshots over a frozen original so undo/reset are exact.
