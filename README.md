# Notes

A responsive note-taking app built from the linked Figma file’s public preview and the matching Frontend Mentor challenge reference. Built with React, TypeScript, Vite, and Lucide icons.

## Run

From this folder:

```powershell
npm.cmd run dev
```

The existing workspace dependencies are linked into this app. On another machine, run `npm install` first.

## Check

```powershell
npm.cmd run lint
npm.cmd run build
```

## Features

- Create, edit, save, archive, restore, and permanently delete notes.
- Search titles, content, and tags; filter notes using the tag sidebar.
- Light, dark, and system color themes; sans-serif, serif, and monospace fonts.
- Responsive desktop, tablet, and mobile layouts.
- Confirmation dialogs and protection for unsaved changes.
- Browser storage for preferences and local-only mode, with a warning and unload protection when storage fails.
- Supabase login, sign-up, Google sign-in, forgot/reset password, change password, logout, and private per-account cloud notes.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and public anon/publishable key. Never put a service-role key in frontend environment variables.
3. Run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor to create the notes table and per-user row-level security policies.
4. Enable email/password sign-in under **Authentication → Providers → Email**. Under **Authentication → URL Configuration**, set the Site URL and add `http://127.0.0.1:5173` (and your deployed URL) to the redirect URLs so confirmation and password-reset links work.
   - Optional: enable **Google** under **Authentication → Providers** for the “Log in with Google” button.
5. Restart the Vite server. Users can then sign up or sign in; each account reads and writes only its own notes.

Without the two Supabase environment variables, the app continues in local-only mode and stores notes/preferences in this browser using `note-taking.notes.v1` and `note-taking.preferences.v1`. Local notes are not automatically imported into a new Supabase account. Fonts load from Google Fonts with system fallbacks.

The original `../ecommerce/` app is separate. Reference assets and browser QA screenshots are in the ignored `.reference/` folder. The individual Figma frame was inaccessible; the public file thumbnail and official challenge preview supplied the visual reference.
