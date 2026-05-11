# JobFlow — Job Application Tracker

A full-stack job application tracker with a Kanban-style board, OAuth authentication, a stats dashboard, and automated email reminders.

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL (Neon) · Prisma · Tailwind CSS · NextAuth v5 · Resend · Vercel

---

## Features

- **OAuth Login** — Sign in with Google or GitHub via NextAuth
- **Kanban Board** — Drag-and-drop cards across Applied → Screening → Interview → Offer → Rejected
- **Job CRUD** — Add, edit, and delete applications with company, role, URL, date, status, and notes
- **Dashboard** — Total applications, response rate, offer rate, status breakdown, and recent activity
- **Email Reminders** — Daily cron job emails users about applications with no update in 7+ days (Resend)

---

## Local Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd JobFlow
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon.tech](https://neon.tech) — create a project, copy the connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID/SECRET` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials |
| `GITHUB_CLIENT_ID/SECRET` | GitHub → Settings → Developer Settings → OAuth Apps |
| `RESEND_API_KEY` | [Resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | A verified sender email on Resend |
| `CRON_SECRET` | Any random string — used to secure `/api/cron/reminders` |

### 3. Database

```bash
npm run db:push       # Push schema to Neon (no migration files)
# or
npm run db:migrate    # Run migrations (generates migration history)
```

### 4. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## OAuth Callback URLs

When setting up OAuth providers, use these callback URLs:

**Google:** `https://your-domain.com/api/auth/callback/google`  
**GitHub:** `https://your-domain.com/api/auth/callback/github`

For local dev: `http://localhost:3000/api/auth/callback/google` (or `/github`)

---

## Deployment on Vercel

1. Push your repo to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example` in Vercel's dashboard
4. Set `NEXTAUTH_URL` to your production URL (e.g. `https://jobflow.vercel.app`)
5. Deploy — the Vercel cron in `vercel.json` runs the reminder job daily at 9 AM UTC

---

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Authenticated app layout
│   │   ├── dashboard/   # Stats dashboard
│   │   └── kanban/      # Drag-and-drop board
│   ├── api/
│   │   ├── auth/        # NextAuth route handler
│   │   ├── jobs/        # CRUD endpoints
│   │   ├── dashboard/   # Stats endpoint
│   │   └── cron/        # Email reminders cron
│   └── login/           # Login page
├── components/
│   ├── jobs/            # Job modal form
│   ├── kanban/          # Kanban column & card
│   └── ui/              # Navbar, SessionProvider
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client singleton
│   └── types.ts         # Shared types & constants
└── proxy.ts             # Auth middleware
prisma/
└── schema.prisma        # DB schema
vercel.json              # Cron schedule
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Prisma generate + Next.js build
npm run db:push      # Push schema to DB (no migration)
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio
```
