# One Front Door - Frontend

Modern React application built with Vite for the **One Front Door** Campus Assistant & Query Router.

---

## Folder Structure

```text
frontend/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Images, SVG illustrations, and icons
│   ├── components/         # Modular and reusable UI components
│   │   ├── chat/           # Chat container, message bubbles, input area, domain badges
│   │   ├── common/         # Generic reusable elements (LoadingSpinner, Badges)
│   │   └── layout/         # Navigation bar, Sidebar, and Layout wrappers
│   ├── context/            # React Context providers (AuthContext, ChatContext)
│   ├── hooks/              # Custom hooks (useAuth, useChat)
│   ├── pages/              # Top-level view screens (ChatPage, TicketsPage, LoginPage)
│   ├── services/           # Backend API clients & endpoint handlers
│   │   ├── api.js          # Base fetch client with JWT token handling
│   │   ├── authService.js  # Student login, registration, and session storage
│   │   ├── chatService.js  # Query router communication, history, and feedback
│   │   └── domainService.js# Campus domain endpoints
│   ├── styles/             # Design tokens and theme custom properties
│   │   └── theme.css       # Color schemes, domain badges, typography, dark mode tokens
│   ├── utils/              # Domain constants and suggested student inquiries
│   ├── App.jsx             # Root application view
│   ├── index.css           # Global reset and typography styling
│   └── main.jsx            # Application bootstrap entrypoint
├── .env.example            # Environment template for frontend
├── package.json            # Dependencies and scripts
└── vite.config.js          # Vite config with backend API reverse proxy (/api -> :5000)
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
```
*(By default, `vite.config.js` proxies `/api` calls directly to `http://localhost:5000`)*.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```
