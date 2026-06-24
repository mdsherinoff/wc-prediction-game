# World Cup 2026 Prediction Pool

A simple prediction game for a friend group, built for the 2026 FIFA World Cup
(48 teams, 12 groups, Round of 32 to Final).

- Google sign-in (only invited friends can play)
- Group stage: predict the exact scoreline, 1 point if exact
- Knockouts: pick the winner (1 point) + bonus 2 points for exact score
- Bracket predictor: pick who advances each round, unlocks once groups finish
- Leaderboard
- Results sync automatically from football-data.org, with a manual admin
  fallback for when that's unavailable or wrong

Built for casual friend-group scale (tens of people), not high traffic - the
free tiers below comfortably handle that.

---

## 1. Prerequisites

- Node.js 20+
- A free Neon (or any Postgres) database - https://neon.tech
- A free football-data.org API key (free tier: 10 requests/minute, includes
  the World Cup) - https://www.football-data.org/client/register
- A Google Cloud project for OAuth credentials
- A Vercel account (free Hobby tier is fine) for deployment

---

## 2. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

### Database
Create a free Postgres database at neon.tech (or Supabase/Railway/etc.) and
paste the connection string into `DATABASE_URL`.

### Auth secret
```bash
npx auth secret
```
Paste the generated value into `AUTH_SECRET`.

### Google OAuth
1. Go to Google Cloud Console -> APIs & Services -> Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://YOUR_DOMAIN/api/auth/callback/google` (production, add once deployed)
4. Copy the Client ID and Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

### Restrict to friends only
Set `ALLOWED_EMAILS` to a comma-separated list of your friends' Google emails.
Leave it blank to allow anyone with a Google account to sign in (not
recommended for a friends-only pool).

### Admin access
Set `ADMIN_EMAILS` to your own email(s) - this gates `/admin` and the manual
result-entry tools.

### football-data.org
Sign up free, grab your API key, paste into `FOOTBALL_DATA_API_KEY`.

---

## 3. Create the database tables

```bash
npx prisma db push
```

## 4. Seed fixtures

This pulls all 104 World Cup matches (with whatever teams are known so far -
knockout-round matchups fill in as earlier rounds complete) from
football-data.org and loads them into your database:

```bash
npm run seed
```

You can re-run this safely later (e.g. once the Round of 32 finishes and
football-data.org publishes the Round of 16 matchups) to pull in newly
confirmed fixtures.

## 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## 6. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Or connect the GitHub repo in the Vercel dashboard. Either way:

1. Add all the same environment variables from your `.env` into the Vercel
   project's Environment Variables settings (Production + Preview).
2. Also add `CRON_SECRET` - any random 16+ character string. Vercel sends
   this automatically as a Bearer token when it triggers the cron job
   defined in `vercel.json`.
3. Update the Google OAuth Client's authorized redirect URI to include your
   real Vercel domain: `https://your-app.vercel.app/api/auth/callback/google`
4. Set `AUTH_URL` (and ideally a custom domain) to match your deployed URL.
5. Deploy.

The included `vercel.json` schedules a daily automatic sync at 06:00 UTC
(the free Hobby plan only allows once-daily cron jobs). During an actual
matchday, use the "Sync now" button on `/admin` to pull fresher results -
it's not rate-limited on your end and you can click it as often as you like
(football-data.org's free tier allows 10 requests/minute).

If you want more frequent automatic syncing without upgrading to Vercel Pro,
point an external scheduler (e.g. cron-job.org, GitHub Actions, or any
service that can do a scheduled HTTP call) at:

```
POST https://your-app.vercel.app/api/admin/sync-results
Header: x-sync-secret: <your SYNC_SECRET value>
```

---

## How scoring works

| Stage | What you predict | Points |
|---|---|---|
| Group stage | Exact scoreline | 1 point if exact, 0 otherwise (no partial credit for picking the right winner) |
| Knockouts (R32 to Final + 3rd place) | Winner, plus optional scoreline | 1 point for correct winner, +2 bonus if scoreline is also exact (max 3) |
| Bracket | Who advances at each round | 1 point per correct advancer pick, per round |

For knockout matches decided by penalties, the regulation/extra-time score is
what's graded for the "exact score" bonus - the shootout only decides the
winner.

## Locking rules

- Every match's prediction locks 1 hour before kickoff.
- Bracket picks for an entire round (e.g. all of Round of 16) lock 1 hour
  before the first match of that round kicks off - so you can't wait to see
  early results before locking in picks for later matches in the same round.

## Admin tools (`/admin`, gated by `ADMIN_EMAILS`)

- Sync results now - pulls from football-data.org, scores newly finished
  matches, and unlocks the bracket predictor once every group match is done.
- Manual result entry - a fallback to set/correct any match's score,
  status, and (for knockouts level after 90+ET) the penalty-shootout winner,
  in case the API is delayed, wrong, or down.

## Notes on data model / extending

- `prisma/schema.prisma` is the source of truth - `Match.slotKey` (e.g.
  `R32-7`, `QF-2`, `FINAL`) is how the bracket predictor and scoring engine
  reference "the winner of this specific knockout slot," since the actual
  teams in later rounds aren't known until earlier rounds finish.
- `lib/scoring.ts` has the point-calculation rules in one place if you want to
  tweak them (e.g. give partial credit, change the bonus amount, etc.)
- `lib/football-data.ts` and `prisma/seed.ts` are the only files that talk to
  football-data.org - swap in a different provider there if you ever outgrow
  the free tier.
