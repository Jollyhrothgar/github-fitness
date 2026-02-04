# GitHub Fitness Project Instructions

## Version Management

**Always bump the version in `package.json` when pushing changes:**

- **Patch** (0.x.Y): Bug fixes, small changes
- **Minor** (0.X.0): New features, significant changes
- **Major** (X.0.0): Breaking changes

After editing `package.json`, run `npm install --package-lock-only` to sync `package-lock.json`.

## Tech Stack

- React + TypeScript + Vite
- TailwindCSS + shadcn/ui
- IndexedDB (via idb) for local storage
- GitHub Gist sync for cloud backup
- PWA with service worker

## Key Files

- `src/lib/storage.ts` - Database and localStorage management
- `src/data/seedExercises.ts` - Default exercise definitions
- `src/lib/github-sync.ts` - GitHub Gist synchronization
