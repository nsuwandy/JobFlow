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

## OAuth Callback URLs

When setting up OAuth providers, use these callback URLs:

**Google:** `https://your-domain.com/api/auth/callback/google`  
**GitHub:** `https://your-domain.com/api/auth/callback/github`

For local dev: `http://localhost:3000/api/auth/callback/google` (or `/github`)


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
