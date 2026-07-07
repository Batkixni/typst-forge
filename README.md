# Typst Forge

A self-hosted, cloud-synced Typst editor with GitHub integration, auto-save, live preview, and team management.

一個自託管、雲端同步的 Typst 編輯器，整合 GitHub、自動存檔、即時預覽與使用者管理。

---

## Features / 功能

- **GitHub Sync** — Browse repos, edit files, commit directly to GitHub
- **Auto-save** — Local draft (keystroke) + GitHub commit (2s debounce)
- **Live Preview** — Auto-compile `.typ` files on every change, preview PDF in-browser
- **Binary Preview** — View images (PNG, JPG, SVG, WebP) and PDFs inline
- **File Management** — Create, rename, delete files and folders; upload images/fonts
- **Font Auto-loading** — Fonts in the project's `fonts/` directory are automatically available during compilation (from both GitHub and pending uploads), with server-side caching
- **Admin System** — First user becomes admin; toggle registration on/off; manage users
- **Project Creation** — Create new GitHub repos with `main.typ` scaffold from within the app
- **Mobile Responsive** — Three-panel layout adapts to single-panel + tab bar on small screens
- **Docker Deployment** — Multi-stage Dockerfile with Typst CLI pre-installed

---

## Quick Start / 快速開始

### Prerequisites / 前置需求

- Node.js 20+
- npm
- [GitHub OAuth App](https://github.com/settings/developers) with callback URL `http(s)://your-domain/api/auth/callback/github` and `repo` scope
- [Typst CLI](https://github.com/typst/typst/releases) (v0.12+) for local development

### Local Development / 本地開發

```bash
# Clone the repo
git clone https://github.com/your-username/typst-forge
cd typst-forge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Edit `.env.local`:

```env
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
AUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

```bash
# Run dev server (with webpack flag on Windows)
npm run dev

# Open http://localhost:3000
# First user to sign in becomes admin
```

> **Note**: On Windows, the SWC native binary may not work. The dev command uses `--webpack` to fallback to the WASM compiler automatically.

---

## Deployment / 部署

### Docker (Recommended)

```bash
# Build and start
docker compose up -d --build

# Or with custom environment file
docker compose --env-file .env.production up -d --build
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |
| `AUTH_SECRET` | NextAuth secret (run `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public URL, e.g. `https://typst.example.com` |

The Docker volume `typst-forge-data` persists the user database (`data/db.json`) and font cache (`data/fonts-cache/`).

### Manual / 手動部署

```bash
npm run build
npm start
```

Ensure Typst CLI is installed on the server. Set `NODE_ENV=production` and the same environment variables as above.

---

## Architecture / 架構

```
typst-editor/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/          # User & settings management
│   │   │   ├── auth/           # NextAuth route handler
│   │   │   ├── commit/         # Commit text + pending uploads to GitHub
│   │   │   ├── compile/        # Compile .typ → PDF (with font auto-loading)
│   │   │   ├── files/delete/   # Delete files from GitHub
│   │   │   ├── fonts/          # List available project fonts
│   │   │   ├── projects/       # Create GitHub repos
│   │   │   └── upload/         # Upload files (stored temporarily on server)
│   │   ├── editor/[...id]/     # Main editor (CodeMirror 6 + preview + file tree)
│   │   ├── projects/           # Project listing page
│   │   ├── admin/              # Admin dashboard
│   │   ├── page.tsx            # Landing page (init flow for first user)
│   │   └── layout.tsx          # Root layout with Navbar
│   ├── components/
│   │   ├── CodeEditor.tsx      # CodeMirror 6 with custom Typst syntax
│   │   ├── FileTree.tsx        # File browser with CRUD + upload
│   │   ├── PreviewPanel.tsx    # PDF/image/compiled Typst preview
│   │   ├── ResizablePanels.tsx # Drag-to-resize panel layout
│   │   ├── AuthGuard.tsx       # Session check wrapper
│   │   ├── LoginButton.tsx     # GitHub OAuth login
│   │   └── ...
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config (GitHub provider + admin check)
│   │   ├── db.ts               # JSON file DB for users & settings
│   │   ├── fonts.ts            # Font collection from GitHub + local uploads with caching
│   │   ├── github.ts           # Octokit wrapper (file tree, content, commit, blob)
│   │   └── utils.ts            # cn() helper
│   ├── store/
│   │   └── editor.ts           # Zustand store for editor state
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── data/                       # Persistent data (volume mount in Docker)
│   ├── db.json                 # User database & settings
│   ├── uploads/                # Pending file uploads
│   └── fonts-cache/            # Cached GitHub font files
├── Dockerfile                  # Multi-stage build with Typst CLI
├── docker-compose.yml          # Docker Compose config
└── .env.example                # Environment variable template
```

---

## Data Flow / 資料流程

### Compilation / 編譯

```
Editor content → POST /api/compile → collect fonts
  ├── Local pending uploads (data/uploads/<owner>/<repo>/fonts/)
  └── GitHub repo fonts/ (cached to data/fonts-cache/<owner>/<repo>/)
→ typst compile --font-path <fonts> → PDF → browser preview
```

### Auto-save / 自動存檔

```
Keystroke → localStorage draft (immediate)
         → 2s debounce → POST /api/commit → GitHub commit
Upload file → POST /api/upload → data/uploads/
Save button → POST /api/commit (text + uploads together) → GitHub + cleanup
```

### Auth / 驗證

```
GitHub OAuth → NextAuth signIn callback → check DB
  ├── First user ever → create as admin → allow
  ├── Existing user → allow
  └── Registration closed → deny → redirect with error
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/commit` | Commit file content + pending uploads to GitHub |
| POST | `/api/compile` | Compile Typst content to PDF (with auto font loading) |
| GET | `/api/fonts` | List available project fonts |
| POST | `/api/upload` | Upload file (stored temporarily on server) |
| POST | `/api/files/delete` | Delete file/folder from GitHub |
| POST | `/api/projects` | Create new GitHub repo with `main.typ` |
| GET | `/api/admin/users` | List all users (admin only) |
| POST | `/api/admin/settings` | Toggle registration (admin only) |

---

## Font Management / 字體管理

Place font files (`.ttf`, `.otf`, `.woff`, `.woff2`, `.pfb`, `.pfm`) in your project's `fonts/` directory on GitHub or upload them via the file tree.

- **On Compile**: Fonts are automatically collected from the GitHub repo's `fonts/` directory and any pending uploads
- **Caching**: Downloaded fonts are cached in `data/fonts-cache/` — only re-downloaded when the file changes (SHA mismatch)
- **Listing**: Click the **Fonts** button in the editor header to see all available font family names
- **Usage in Typst**: `#set text(font: "Font Family Name")`

將字體檔（`.ttf`、`.otf`、`.woff`、`.woff2`、`.pfb`、`.pfm`）放在專案的 `fonts/` 目錄（GitHub 上）或透過檔案樹上傳。

- **編譯時**：自動從 GitHub repo 的 `fonts/` 目錄與 pending uploads 收集字體
- **快取**：下載後快取在 `data/fonts-cache/`，僅在檔案變更（SHA 不同）時重新下載
- **查詢**：點擊編輯器 header 的 Fonts 按鈕可查看所有可用字體家族名稱
- **Typst 中使用**：`#set text(font: "字體家族名稱")`

---

## Admin / 管理員

- The first user to sign in is automatically granted **admin** role
- Access admin panel at `/admin` (shield icon button in top-right)
- Admins can toggle user registration on/off and view the user list

---

## Tech Stack / 技術棧

- **Next.js 16** (App Router, Webpack)
- **TypeScript**
- **Tailwind CSS v4**
- **CodeMirror 6** (custom Typst syntax mode)
- **NextAuth v5** (GitHub OAuth)
- **Zustand** (state management)
- **Octokit** (GitHub API)
- **Typst CLI** (compilation)
- **Docker** (deployment)

---

## License / 授權

MIT
