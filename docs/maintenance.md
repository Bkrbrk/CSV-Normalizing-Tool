# Maintenance

## Product identity

The product name is **DataPilot**. The package name is `datapilot`, and the browser icon is `public/favicon.svg`.

Recommended GitHub repository name: `datapilot`.

To rename the repository, open its **Settings → General → Repository name** and enter `datapilot`. After renaming, update the clone URL and directory name in README.md. This change set does not rename the GitHub repository.

## Hosting badge

The “Edit with Lovable” overlay is controlled by the hosting platform, separately from this application's favicon.

For Lovable-hosted publishing, the documented setting is **Project settings → General → Publishing → Hide Lovable badge**, available on Pro plans and above:
https://docs.lovable.dev/features/projects/settings

Changing repository files does not toggle that account setting. If moving to another host, inspect and test the production build for platform-injected scripts and overlays.

## Remaining platform integration

The Vite configuration imports `@lovable.dev/vite-tanstack-config`. It supplies the TanStack Start, React, Tailwind, alias, and production build integration. Do not simply remove the dependency.

A full migration should replace the preset with explicit compatible Vite/TanStack/Nitro configuration, review platform-specific error reporting, regenerate the lockfile, and verify tests, production build, and browser flows on the target host.

The `.lovable/project.json` template metadata file is removed in this change set. A future platform edit may recreate it. This removal is not equivalent to disconnecting Git sync.

## Git history

Keep published history intact while Git sync is connected. Use new commits; avoid force pushes and rewriting published commits.
