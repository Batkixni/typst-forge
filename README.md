# Typst Forge

A self-hosted Typst editor with **local storage as the source of truth**, live SVG preview with scroll sync, and **optional** GitHub binding for manual commits.

一個自託管的 Typst 編輯器：**本地儲存為主**、即時 SVG 預覽與滾動同步，GitHub 僅為可選附屬功能（手動 commit）。

---

## Features / 功能

- **Local storage first** — 專案存在伺服器磁碟，`~600ms` 自動存檔，**不會**自動 commit 到 Git
- **Optional Git** — 可綁定 GitHub repo；綁定後才能手動 Commit & push / Pull
- **Live Preview** — 編輯時自動編譯為多頁 SVG；編譯中保留舊預覽
- **Scroll sync** — 編輯器滾動 ↔ 預覽跟隨；**點預覽可跳回原始碼**
- **Multi-file compile** — 從專案目錄編譯，`#import` 相對路徑可用
- **File management** — 建立／重新命名／刪除檔案與資料夾；上傳圖片／字體
- **Fonts** — 放在專案 `fonts/` 目錄，編譯時自動載入
- **Admin** — 首位登入者為 admin；可開關註冊
- **Docker** — 內建 Typst CLI

---

## Mental model / 心智模型

```
┌─────────────────────────────────────────────┐
│  Local disk (data/projects/…)               │  ← 真正的資料來源
│  Auto-save on every edit                    │
└──────────────────┬──────────────────────────┘
                   │  optional, manual only
                   ▼
┌─────────────────────────────────────────────┐
│  GitHub (bind → commit & push / pull)       │  ← 附屬遠端
└─────────────────────────────────────────────┘
```

| 操作 | 行為 |
|------|------|
| 打字 | 自動寫入伺服器磁碟 |
| Save 狀態列 | `Saved locally` = 已落盤，**不是** Git commit |
| Bind GitHub | 只建立連結，不會自動推送 |
| Commit & push | 手動一次推送整個本地專案 |
| Pull | 手動從 GitHub 覆蓋同名本地檔 |

---

## Quick Start / 快速開始

### Prerequisites

- Node.js 20+
- npm
- [GitHub OAuth App](https://github.com/settings/developers)  
  Callback: `http(s)://your-domain/api/auth/callback/github`，scope 需含 `repo`（僅在綁定／推送 Git 時使用）
- [Typst CLI](https://github.com/typst/typst/releases) v0.12+（本機開發）

### Local development

```bash
git clone https://github.com/your-username/typst-forge
cd typst-forge
npm install

# 建立 .env.local
# AUTH_GITHUB_ID=...
# AUTH_GITHUB_SECRET=...
# BETTER_AUTH_URL=http://localhost:3000

npm run dev
# → http://localhost:3000
# 第一位登入者成為 admin
```

> Windows 若 SWC 原生失敗，`npm run dev` 已使用 `--webpack`。

本機資料目錄：`./data/`（已在 `.gitignore`）。

---

## Deployment / 部署

### Docker Compose（建議）

```bash
docker compose up -d --build
# 或
docker compose --env-file .env.production up -d --build
```

#### 環境變數

| Variable | Description |
|----------|-------------|
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |
| `BETTER_AUTH_URL` | 公開 URL，例如 `https://typst.example.com` |

#### 資料持久化（重要）

所有專案與使用者資料都在容器內 **`/app/data`**。  
**若沒有掛 volume，重建／更新容器後檔案會消失。**

**方案 A — Docker named volume（預設）**

```yaml
volumes:
  - typst-forge-data:/app/data
```

**方案 B — Bind mount（VPS 建議）**

方便備份、權限清楚、路徑固定：

```yaml
volumes:
  - /var/lib/typst-forge/data:/app/data
```

主機上先建立目錄：

```bash
sudo mkdir -p /var/lib/typst-forge/data
# 依容器內 node 使用者調整權限（常見 uid 1000）
sudo chown -R 1000:1000 /var/lib/typst-forge/data
```

然後在 `docker-compose.yml` 註解掉 named volume、改用上面的 bind mount。

#### 目錄結構

```
data/
├── better-auth.db          # 登入 session / users
├── db.json                 # app 設定（註冊開關等）
└── projects/
    └── <userId>/
        └── <projectId>/
            ├── .forge/meta.json   # 名稱、Git 綁定資訊
            ├── main.typ
            ├── fonts/
            └── …
```

#### 備份建議

```bash
# named volume
docker run --rm -v typst-forge_typst-forge-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/typst-forge-backup.tgz -C /data .

# bind mount
sudo tar czf typst-forge-backup.tgz -C /var/lib/typst-forge data
```

### Manual

```bash
npm run build && npm start
```

需已安裝 Typst CLI，並掛載／保留 `./data`。

---

## Workflow / 使用流程

1. **New Project** — 建立本地專案（自動 `main.typ`）
2. 編輯 — 自動存檔到磁碟；右側即時預覽
3. （可選）**Git → Bind GitHub repo** — 只連結，不推送
4. （可選）**Commit & push…** — 自行填 commit message 後推送
5. （可選）**Import GitHub** — 從 repo 複製到本地並綁定

### 預覽與同步

- 編輯器滾動／游標移動 → 預覽跟隨（可關 **Sync**）
- **點一下預覽** → 跳到編輯器對應行（比例對應；非編譯器內部 SyncTeX span）
- 重編譯時舊預覽不閃掉

---

## Architecture / 架構

```
src/
├── app/api/
│   ├── projects/           # 本地專案 CRUD
│   ├── projects/[id]/git/  # bind / unbind / pull / push
│   ├── files/              # 讀寫／建立／刪除／重新命名
│   ├── compile/            # 從專案目錄 typst compile
│   ├── upload/             # 上傳到本地專案
│   ├── fonts/              # 列出 fonts/
│   └── github/repos/       # 列出可綁定的 GitHub repos
├── lib/projects.ts         # 磁碟專案儲存
├── components/             # Editor, Preview, FileTree…
└── store/editor.ts
data/                       # 持久化（務必 volume / bind mount）
```

### Compile

```
Editor buffer → PUT 本地檔（auto-save / compile 前 flush）
→ typst compile --root <projectDir> --font-path fonts
→ multi-page SVG JSON → 瀏覽器預覽
```

### Auto-save（不再 auto-commit）

```
Keystroke → 600ms debounce → PUT /api/files → 寫入 data/projects/…
GitHub 僅在使用者手動「Commit & push」時觸發
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | 列出／建立本地專案 |
| GET/PATCH/DELETE | `/api/projects/:id` | 專案 meta |
| POST | `/api/projects/:id/git` | `bind` / `unbind` / `pull` / `import` / `push` |
| GET/PUT/POST | `/api/files` | 檔案樹、讀取、存檔、建立 |
| POST | `/api/files/delete` | 刪除 |
| POST | `/api/files/rename` | 重新命名 |
| POST | `/api/compile` | 編譯（`format: preview\|pdf\|png\|svg`） |
| POST | `/api/upload` | 上傳到專案 |
| GET | `/api/fonts` | 列出專案字體 |
| GET | `/api/github/repos` | 可綁定的 GitHub repos |

---

## Fonts / 字體

將 `.ttf` / `.otf` / `.woff` / `.woff2` 放到專案 **`fonts/`**（或用檔案樹上傳，字體檔會自動進 `fonts/`）。

```typst
#set text(font: "Your Font Family")
```

Header 的 **Fonts** 可查看目前可用家族名稱。

---

## Tech Stack

- Next.js 16 · TypeScript · Tailwind CSS v4  
- CodeMirror 6 · Zustand · BetterAuth (GitHub OAuth)  
- Typst CLI · Docker  

---

## License

MIT
