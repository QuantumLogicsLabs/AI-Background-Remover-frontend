# AI Background Remover — Frontend

> **Team:** Web Team (UI)  
> **Repo:** `AI-Background-Remover-frontend`  
> **Parent repo:** `AI-Background-Remover` (this is a submodule)  
> **Tech:** React 18 · TypeScript · Tailwind CSS · Vite

---

## What This Repo Is

The React frontend for the AI Background Remover application.  
It handles everything the user sees and interacts with — uploading an image, watching it process, comparing the before/after, downloading the result, and browsing past jobs.

It talks to the **backend repo** via REST API calls through Axios.  
It does **not** contain any AI or Python code.

---

## Folder Structure

```
frontend/
│
├── index.html                  ← app shell, loads Google Fonts
├── vite.config.ts              ← Vite config + /api proxy to backend :8000
├── tailwind.config.ts          ← maps CSS tokens to Tailwind utility classes
├── postcss.config.js
├── tsconfig.json
├── package.json
│
└── src/
    ├── main.tsx                ← entry point, imports theme tokens
    ├── index.css               ← Tailwind base layers
    ├── App.tsx                 ← BrowserRouter + route declarations
    │
    ├── theme/
    │   └── tokens.css          ← ALL design tokens (colors, fonts, radius)
    │                             light mode + dark mode variables
    │                             .bg-checker utility class
    │
    ├── components/             ← reusable UI building blocks
    │   ├── Navbar.tsx          ← sticky header, nav links, theme toggle
    │   ├── ThemeToggle.tsx     ← light/dark switch, persists to localStorage
    │   ├── UploadZone.tsx      ← drag-and-drop file input (react-dropzone)
    │   ├── ImageCanvas.tsx     ← result/original/compare slider view
    │   ├── DownloadButton.tsx  ← <a download> link styled as button
    │   └── HistoryCard.tsx     ← single history item card with thumbnail
    │
    ├── hooks/                  ← data-fetching and state logic
    │   ├── useUpload.ts        ← POST /api/remove-background, state machine
    │   └── useHistory.ts       ← GET /api/history, DELETE /api/image/:id
    │
    └── pages/                  ← one file per route
        ├── HomePage.tsx        ← upload → processing → result flow
        └── HistoryPage.tsx     ← history grid with empty/loading/error states
```

---

## Pages and What They Do

### `/` — HomePage
1. Shows `UploadZone` — user drags or picks an image.
2. Calls `useUpload` — sends the image to the backend.
3. While processing, shows a spinner.
4. On success, shows `ImageCanvas` (result/original/compare) and `DownloadButton`.
5. "Remove another" button resets to step 1.

### `/history` — HistoryPage
- Calls `useHistory` on mount.
- Renders a responsive grid of `HistoryCard` components.
- Each card shows the processed image thumbnail, filename, date, download link, and a delete button.
- Handles loading, error, and empty states.

---

## Design System

All colors, fonts, and spacing come from `src/theme/tokens.css` as CSS custom properties.  
**Never hardcode hex values in components.** Always use the Tailwind utilities mapped in `tailwind.config.ts`.

| Token | Tailwind class | When to use |
|-------|---------------|-------------|
| `--bg-page` | `bg-page` | Page background |
| `--bg-surface` | `bg-surface` | Cards, panels |
| `--accent-magenta` | `bg-magenta`, `text-magenta` | Primary CTAs, active states |
| `--accent-teal` | `bg-teal`, `text-teal` | Success, download actions |
| `--text-primary` | `text-primary` | Headings, labels |
| `--text-muted` | `text-muted` | Hints, secondary info |
| `.bg-checker` | `bg-checker` class | Any area showing transparency |

**Dark mode** is toggled by setting `data-theme="dark"` on `<html>`.  
`ThemeToggle.tsx` handles this. No Tailwind `dark:` prefix needed — tokens handle it.

---

## Running Locally

```bash
# Make sure you are inside the frontend/ folder

# Copy environment config (optional — only needed for production API URL or feature flags)
cp .env.example .env

npm install
npm run dev
```

App runs at `http://localhost:5173`.  
All `/api/*` requests are proxied to `http://localhost:8000` (the backend must be running).

Other commands:
```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

---

## Adding a New Component

1. Create the file in `src/components/YourComponent.tsx`.
2. Use only Tailwind classes that map to design tokens (see table above).
3. Add `aria-label` / `role` attributes for accessibility.
4. Export as default.
5. Import it in the page or component that needs it.

## Adding a New Page

1. Create `src/pages/YourPage.tsx`.
2. Add a `<Route>` for it in `src/App.tsx`.
3. Add a `<NavLink>` in `src/components/Navbar.tsx`.

## Adding a New Hook

1. Create `src/hooks/useYourHook.ts`.
2. Keep all API calls inside hooks — never call `axios` directly from a component.
3. Return `{ data, loading, error }` shape so components stay consistent.

---

## API the Frontend Talks To

| Action | Hook | Endpoint |
|--------|------|----------|
| Upload image | `useUpload` | `POST /api/remove-background` |
| Download result | `DownloadButton` | `GET /api/download/{filename}` |
| Get history | `useHistory` | `GET /api/history` |
| Delete image | `useHistory.deleteItem` | `DELETE /api/image/{id}` |

The backend must be running on port 8000 for the proxy to work in development.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM rendering |
| react-router-dom | 6.26.2 | Client-side routing |
| axios | 1.7.7 | HTTP requests |
| react-dropzone | 14.2.9 | Drag-and-drop file upload |
| tailwindcss | 3.4.13 | Utility CSS |
| vite | 5.4.7 | Dev server + build tool |
| typescript | 5.5.4 | Type safety |

---

## What Is Done vs What Is Next

### Done
- [x] Full project scaffold (Vite + React + TypeScript + Tailwind)
- [x] Design token system (light + dark mode)
- [x] Navbar with routing and theme toggle
- [x] UploadZone with validation
- [x] useUpload hook with state machine
- [x] ImageCanvas with result / original / compare slider
- [x] DownloadButton
- [x] HistoryCard
- [x] useHistory hook
- [x] HomePage full flow
- [x] HistoryPage with all states

### Next (for Web Team to pick up)
- [ ] User authentication UI (login / register pages)
- [ ] Background replacement panel (color picker, custom image upload)
- [x] Batch upload — via the AI Chatbot Widget (Analyze/Suggest/Caption modes)
- [ ] Loading skeleton components (replace spinners)
- [ ] Toast notification system for errors/success
- [ ] Mobile layout polish

---

## AI Chatbot Widget

A floating AI assistant (`src/components/ChatbotWidget.tsx`) available on every page, with four modes: **Chat**, **Analyze**, **Suggest**, and **Caption**.

### Input Enhancements
- Multi-line auto-expanding textarea (36px → 140px)
- Live character counter (0/2000) with warning color near the limit
- Image attachment with preview strip before sending
- Per-message quick actions on hover: Edit & resend, Resend, Copy, Delete

### Size & Positioning
- Drag-to-resize panel from the corner grip
- Four floating positions (bottom-right, bottom-left, top-right, top-left) via the position switcher
- Size presets: compact / standard / large
- Minimize to a small pill in the tray
- Fullscreen mode for complex tasks
- Panel position/size is clamped to the viewport so it can never render off-screen; `Esc` always closes the widget as a safety fallback

### Quick Actions
- **Template library** — save, reuse, and delete prompt templates (backend: `GET/POST /api/prompts`, `POST /api/prompts/{id}/use`, `DELETE /api/prompts/{id}`)
- **Favorite responses** — star useful AI replies to save them (backend: `GET/POST /api/favorites`, `DELETE /api/favorites/{id}`)
- **Batch operations** — run Analyze/Suggest/Caption on up to 10 images sequentially from one panel

### Smart Conversations
- **Context memory** — the last few conversation turns are included in each new request
- **Topic detection** — messages are auto-tagged (background, lighting, crop, quality, caption, general) with a badge on assistant replies
- **Intent recognition** — messages are classified as greeting / question / request / feedback / other
- **Follow-up suggestions** — topic-relevant follow-up chips appear after each assistant reply

### Related Services
| File | Purpose |
|------|---------|
| `src/services/chatService.ts` | `POST /api/chat` |
| `src/services/imageService.ts` | `POST /api/image/analyze`, `/captions`, `/suggestions` |
| `src/services/favoriteService.ts` | Favorites CRUD |

---

## Contribution

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the parent repo for branch naming, commit format, and PR rules.

Your branch always goes into this submodule repo (`AI-Background-Remover-frontend`), not the parent.
