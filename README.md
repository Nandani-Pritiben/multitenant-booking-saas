# multitenant-booking-saas

Multi-tenant appointment booking SaaS — React + Vite frontend, NestJS backend, Supabase PostgreSQL.

## Local Development

```bash
# Terminal 1 — backend (http://localhost:4000)
cd apps/api
npm install
npm run start:dev

# Terminal 2 — frontend (http://localhost:5173)
cd apps/web
npm install
npm run dev
```

The Vite dev server proxies `/api/*` → `http://localhost:4000` automatically.  
**Start the backend first**, otherwise the frontend will show proxy errors.

---

## Deployment (Two Vercel Projects, One GitHub Repo)

### Architecture

```
GitHub repo
  ├── apps/api   → Vercel Project "booking-api"   (Root Directory: apps/api)
  └── apps/web   → Vercel Project "booking-web"   (Root Directory: apps/web)

Browser → booking-web.vercel.app/         (React SPA)
Browser → booking-web.vercel.app/api/*    (proxied → booking-api.vercel.app/api/*)
```

Cookies are **first-party** — the browser only ever talks to one origin (`booking-web.vercel.app`).

---

### Step-by-step checklist

#### Before you start

- [ ] **Rotate secrets** — if your Supabase service-role key or SMTP password was ever shared outside your machine, regenerate them now in the Supabase and SendGrid dashboards.

#### 1. Push to GitHub

```bash
git push origin main
```

#### 2. Deploy the API project

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
2. **Root Directory:** `apps/api`
3. **Framework Preset:** Other
4. Leave Build / Output / Install commands blank (Vercel reads `apps/api/vercel.json`).
5. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_ANON_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `CORS_ORIGINS` | *(set after web is deployed — see step 4)* |
| `SMTP_HOST` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `apikey` |
| `SMTP_PASSWORD` | your SendGrid API key |
| `SMTP_FROM_EMAIL` | your verified sender email |
| `SMTP_FROM_NAME` | `Booking SaaS` |
| `LOG_LEVEL` | `info` |

6. Click **Deploy**.
7. Verify: open `https://<api-project>.vercel.app/api/health` — should return `{ "status": "ok" }`.

#### 3. Update the web project's API rewrite

Open `apps/web/vercel.json` and replace the placeholder with your real API URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-API-PROJECT.vercel.app/api/:path*"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit and push:

```bash
git add apps/web/vercel.json
git commit -m "config: set API project URL in web rewrite"
git push origin main
```

#### 4. Deploy the web project

1. Vercel → **Add New Project** → same repo.
2. **Root Directory:** `apps/web`
3. **Framework Preset:** Vite
4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `/api` |

5. Click **Deploy**.
6. Copy the web project URL (e.g. `https://booking-web.vercel.app`).

#### 5. Set CORS on the API project

Go back to the **API Vercel project** → Settings → Environment Variables:

```
CORS_ORIGINS = https://booking-web.vercel.app
```

Then **redeploy** the API project (Deployments → Redeploy).

#### 6. Configure Supabase

In the [Supabase dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:

- **Site URL:** `https://booking-web.vercel.app`
- **Redirect URLs:** `https://booking-web.vercel.app/**`

Apply database migrations from your local machine:

```bash
cd apps/api
npx supabase link --project-ref <your-supabase-project-ref>
npx supabase db push
```

#### 7. Smoke tests

- [ ] Sign up two users, confirm each sees only their own data (tenant isolation).
- [ ] Log out and log back in — session should restore correctly.
- [ ] Make a booking at `https://booking-web.vercel.app/booking/<slug>`.
- [ ] Check Vercel Function Logs for both projects.

---

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Build: `Cannot find module '../src/...'` | `rootDir` or `include` in tsconfig | Use `tsconfig.vercel.json` for the function |
| 404 on `/api/*` | Web rewrite placeholder not replaced | Update `apps/web/vercel.json` with real API URL |
| CORS error in browser | `CORS_ORIGINS` missing or wrong | Set it on the API Vercel project and redeploy |
| Cookie not sent | `SameSite`/`Secure` mismatch or `credentials: 'include'` missing | Both are already correct in the code; check `NODE_ENV=production` on API |
| 401 after login | Cookie path mismatch | Cookie `path: '/api'` is set; check API prefix is `api` |
| Cold-start timeout | First request takes > 10 s | Increase `maxDuration` in `apps/api/vercel.json` (max 60 s on Pro) |
