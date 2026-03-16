# CodeRev AI — AI-Powered Code Review Platform

A full-stack code review platform with AI analysis, GitHub OAuth, real-time streaming, and gamification.

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite + TailwindCSS + Framer Motion + Recharts |
| Backend   | Node.js + Express + Socket.IO |
| Database  | MongoDB (reviews, users, repos, badges) |
| Storage   | Supabase (file storage, future real-time) |
| AI Engine | OpenRouter (Claude, GPT-4, Gemini, etc.) |
| Queue     | Bull + Redis (async AI processing) |
| Auth      | GitHub OAuth → JWT |

---

## Features

- **GitHub OAuth** — one-click login, repo access via GitHub API
- **AI Code Reviews** — bugs, security (OWASP), performance, best practices
- **Codebase Memory** — AI learns your patterns over time per repo
- **PR Risk Scoring** — blast radius, complexity delta, file churn
- **One-Click Auto-Fix** — AI generates ready-to-apply patches
- **Secrets Detection** — API keys, tokens, passwords in diffs
- **Compliance Mode** — HIPAA, PCI, SOC2 rule packs
- **Tech Debt Heatmap** — riskiest files from review history
- **Suggested Tests** — AI generates test cases for changed functions
- **Real-time Streaming** — WebSocket updates as AI processes reviews
- **Team Leaderboard** — quality scores, review counts, fix rates
- **Badges & Gamification** — streaks, milestones, skill badges
- **Severity Tuning** — mute noisy categories per user preference
- **Custom Style Guide** — team-specific AI review instructions
- **Webhook Support** — auto-review on every PR push

---

## Setup

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (for queue — optional, falls back to direct processing)
- GitHub OAuth App
- OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys))
- Supabase project (for storage)

### 2. GitHub OAuth App

1. Go to GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. Set:
   - **Homepage URL**: `http://localhost:5173`
   - **Callback URL**: `http://localhost:5000/api/auth/github/callback`
3. Copy Client ID and Client Secret

### 3. Environment Variables

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coderev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=anthropic/claude-sonnet-4
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

### 4. Install & Run

```bash
# Install all dependencies
npm run install:all

# Or install separately:
cd backend && npm install
cd frontend && npm install

# Start both servers
npm run dev

# Or start separately:
cd backend && npm run dev     # → http://localhost:5000
cd frontend && npm run dev    # → http://localhost:5173
```

### 5. Seed Badges

After first run:
```bash
curl -X POST http://localhost:5000/api/badges/seed
```

---

## Architecture

```
┌─────────────────┐     GitHub OAuth      ┌──────────────────┐
│   React Frontend │ ◄────────────────────► │  Express Backend  │
│   (Vite :5173)  │     JWT + REST API     │  (Node :5000)    │
│                 │     WebSocket (live)   │                  │
└─────────────────┘                        └────────┬─────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────┐
                    │                               │                   │
             ┌──────▼──────┐               ┌────────▼──────┐  ┌────────▼──────┐
             │   MongoDB   │               │  Bull + Redis  │  │  Anthropic    │
             │  (Reviews,  │               │  (Async Queue) │  │  Claude API   │
             │  Users,     │               └───────────────┘  └───────────────┘
             │  Repos,     │
             │  Badges)    │               ┌───────────────┐
             └─────────────┘               │   Supabase    │
                                           │  (Storage)    │
                                           └───────────────┘
```

### Review Processing Flow

```
User triggers review
      │
      ▼
POST /api/reviews
      │
      ▼
Fetch diff from GitHub API
      │
      ▼
Create Review (status: pending)
      │
      ▼
Enqueue to Bull (Redis)
      │
      ▼
Worker picks up job
      │
      ▼
Call OpenRouter API
(with codebase memory + style guide)
      │
      ▼
Parse structured JSON response
      │
      ▼
Update Review (status: completed)
      │
      ▼
Emit WebSocket event to user
      │
      ▼
Frontend updates in real-time
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/github` | Start GitHub OAuth |
| GET | `/api/auth/github/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Repositories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/repos` | List connected repos |
| GET | `/api/repos/github` | List GitHub repos |
| POST | `/api/repos/connect` | Connect a repo |
| GET | `/api/repos/:id` | Get repo details |
| GET | `/api/repos/:id/prs` | List PRs |
| DELETE | `/api/repos/:id` | Disconnect repo |

### Reviews
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reviews` | Create review from PR |
| POST | `/api/reviews/manual` | Create from pasted diff |
| GET | `/api/reviews` | List reviews |
| GET | `/api/reviews/:id` | Get review details |
| PATCH | `/api/reviews/:id/issues/:issueId` | Accept/dismiss issue |
| POST | `/api/reviews/:id/issues/:issueId/autofix` | Generate auto-fix |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/summary` | Dashboard summary |
| GET | `/api/analytics/trends` | Issue trends |
| GET | `/api/analytics/categories` | Category breakdown |
| GET | `/api/analytics/heatmap/:repoId` | Tech debt heatmap |
| GET | `/api/analytics/leaderboard` | Team leaderboard |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/github` | GitHub webhook receiver |

---

## Supabase Setup

1. Create a new Supabase project
2. Create a storage bucket named `review-artifacts`
3. Set bucket policy to private
4. Copy URL, anon key, and service role key to `.env`

The app uses Supabase for:
- Storing large diff files (>5MB)
- Future: real-time subscriptions as Redis alternative

---

## Production Deployment

### Environment
- Set `NODE_ENV=production`
- Use a strong random `JWT_SECRET`
- Use MongoDB Atlas or similar managed DB
- Use Redis Cloud or Upstash for queue
- Update `FRONTEND_URL` and `GITHUB_CALLBACK_URL` to production URLs

### Build frontend
```bash
cd frontend && npm run build
# Serve dist/ from Express or CDN
```

---

## Extending

### Add a new AI check
Edit `backend/services/aiService.js` — add fields to the JSON schema prompt and handle them in the review model. You can also change `OPENROUTER_MODEL` in `.env` to use any model available on OpenRouter (e.g., `openai/gpt-4o`, `google/gemini-2.5-pro`, etc.).

### Add a new badge
Edit `backend/models/Badge.js` — add to `BADGES` array and handle in `backend/routes/badges.js`.

### Add multi-model consensus
The `aiModelsUsed` field on reviews is ready for this. With OpenRouter, you can call multiple models by running parallel requests with different `OPENROUTER_MODEL` values in `queueService.js`, merge results, and only report issues where majority agree.
