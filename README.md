# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js **20+** & npm installed — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating). This repo includes an **`.nvmrc`** (Node 22 LTS); with nvm: `nvm install` then `nvm use`.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: (Optional) Match the project's Node version if you use nvm.
nvm use

# Step 4: Install dependencies.
npm ci   # or: npm i

# Step 5: Environment — copy the example and add your Supabase keys.
cp .env.example .env
# Edit .env: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (Dashboard → Settings → API)

# Step 6: Start the development server.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Syllabus Upload Pipeline

### Architecture

1. **Upload Page** (`/upload`) — select a course, drag-drop a PDF (or use the demo/seed tool)
2. **PDF text extraction** — client-side via `pdfjs-dist`
3. **Edge Function** `process-syllabus` — hybrid parser (preprocess + heuristics + OpenAI structured extraction + deterministic normalization) that creates `extracted_items` rows
4. **Review UI** (`/upload?review=<id>`) — accept / edit / discard each extracted item
5. Accepted items flow into `assignments`, `courses.professor_email`, or `course_meetings`

### Required Supabase setup

| Step | Details |
|------|---------|
| Storage bucket | Create a **public or private** bucket called `syllabi` in Supabase → Storage. Add a policy allowing authenticated users to INSERT into their own path (`(bucket_id = 'syllabi') AND (auth.uid()::text = (storage.foldername(name))[1])`). |
| Edge Function deploy | `supabase functions deploy process-syllabus` |
| Environment variables | The frontend needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. The edge function uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` (auto-set by Supabase runtime), plus `OPENAI_API_KEY` and optional `OPENAI_MODEL` for structured extraction. |

### Running locally

**Frontend only (hosted Supabase):** `npm run dev` after `.env` is set — no Docker required.

**Full local stack (Postgres, Auth, Storage, edge functions):**

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and keep it running (`supabase start` uses containers).
2. From the repo root, use the Supabase CLI **pinned in this project** (via `npm` scripts — works with or without a global `supabase` install):

```sh
npm install

# Terminal A — local Supabase (wait until ready)
npm run supabase:start

# Optional: link a remote project for migrations/deploys
# supabase link --project-ref <your-project-ref>

# Terminal B — Vite app (http://localhost:8080 by default)
npm run dev

# Terminal C — serve the process-syllabus edge function against local stack
npm run supabase:functions:serve
```

Other useful scripts: `npm run supabase:status`, `npm run supabase:stop`. Deploy the function to hosted Supabase: `npm run supabase:functions:deploy` (after `supabase login` / `supabase link`).

**Security note:** `npm audit fix` is applied where safe. Remaining advisories tied to **Vite 5 / esbuild** are addressed by upgrading to **Vite 8+** (`npm audit fix --force`), which is a breaking change — plan that upgrade separately if needed.

### Testing the upload pipeline manually

1. Sign in (or sign up) at `/auth`
2. Go to `/courses` and create a course (e.g. "CS 301")
3. Go to `/upload`, select the course from the dropdown
4. **Option A — PDF upload:** drag-drop a syllabus PDF into the upload zone
5. **Option B — Demo seed:** click "Show demo / seed tool", review the sample text, click "Process Demo Text"
6. The pipeline runs: Uploading → Extracting → Processing → Ready
7. You are redirected to the Review UI showing extracted items grouped by kind
8. Accept, edit, or discard items. High-confidence items are visually marked "Auto-confirm suggested"
9. Verify: accepted assignments appear in `assignments` table; professor email updates `courses.professor_email`; meeting times appear in `course_meetings`

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
