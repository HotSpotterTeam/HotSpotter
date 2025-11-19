# HotSpotter

This repository contains a simple Vite + React + TypeScript scaffold to preview the `HotSpotter` UI locally.

How to run:

Make sure you're in the `client` directory before running the commands below:

```bash
# from repo root, if you're not already in client
cd client

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173) in your browser.

Notes:
- Tailwind is included via CDN in `index.html` for quick prototyping.
- The component uses `lucide-react` for icons; dependencies are listed in `package.json`.
- If you want Tailwind compiled with a custom config, I can add a proper Tailwind setup.
