# RunCraft ⚡

> **Workout Photo Overlay Studio for Social Media**  
> Edge-First Serverless Application Architecture (Cloudflare Workers + Progressive Web App)

---

## 🏃 Overview

**RunCraft** allows runners and cyclists to turn raw workout data from **Garmin** and **Strava** into high-aesthetic, social-media-ready photo overlays (Instagram Stories 9:16, Feed Posts 4:5, Square 1:1, or Strava Banners 16:9).

---

## 🌟 Key Features

1. **Aesthetic Glassmorphism & Modern Typography:**
   - Translucent frosted-glass metric cards with customizable opacity.
   - Hero stats: Distance (km), Avg Pace (`min'sec"/km`), Moving Time, Elevation Gain (m).
   - Secondary telemetry: Heart Rate (bpm), Cadence (spm), Calories (kcal), Power (Watts).
   - Clean sport badges, timestamp, location, and shoe/gear tags.
2. **Dynamic Route Polyline Overlay:**
   - 2D GPS track smoothed and projected directly onto the photo.
   - **Elevation-colored gradient** or **Pace-colored gradient** along the route path.
   - Neon glow aura with customizable accent colors (Hyper-Lime, Electric Cyan, Solar Coral, Emerald, Pure White).
   - Milestone Start (green) and Finish (checkered coral) pins.
3. **Heart Rate 5-Zone Visualizer:**
   - Visual 5-zone distribution bar (Zone 1 Recovery through Zone 5 Max).
   - Split pace badges for key kilometers/miles.
4. **Photo Atmosphere & Backdrop Studio:**
   - Drag-and-drop or photo library upload (mobile camera supported).
   - Built-in pro sample runner & cyclist photography.
   - Real-time photo filters: Dark Vignette, Brightness, Contrast, and Saturation.
5. **Format Presets:**
   - **9:16 Story / Reel / TikTok** ($1080 \times 1920$)
   - **4:5 Instagram Portrait** ($1080 \times 1350$)
   - **1:1 Square Post** ($1080 \times 1080$)
   - **16:9 Banner** ($1920 \times 1080$)
6. **1-Click High-Res Export & Web Share:**
   - Instant 2x Retina PNG download.
   - Native Web Share API (`navigator.share`) to share directly to Instagram Stories or WhatsApp on mobile.

---

## 🔌 Strava & Garmin Without Paid Subscriptions

* **Strava:** **Strava's Developer API is 100% FREE** for all athletes (no Strava Summit / subscription needed). Athletes can connect their own free Client ID and Secret to pull workouts and polylines directly.
* **Garmin:** The official Garmin Developer Program is restricted to enterprise corporations, so RunCraft solves this with three edge-native methods:
  1. **Garmin $\to$ Strava Auto-Sync:** Garmin watches sync to a free Strava account automatically in seconds. When you connect Strava to RunCraft, your Garmin workouts appear instantly.
  2. **Direct `.FIT` & `.GPX` File Ingestion:** Drag and drop your `.FIT` or `.GPX` file directly into RunCraft. It is parsed 100% client-side in the browser using `fit-file-parser` with zero server uploads—private and instant.
  3. **Built-in Presets & Manual Editor:** Immediate access to realistic trail runs, sunrise tempos, and mountain century rides, with full manual override capabilities.

---

## 📱 Why Progressive Web App (PWA)?

* **Installable on iOS & Android:** Add directly to your Home Screen without needing an App Store account or paying Apple/Google developer fees.
* **Offline First:** Service Worker caching (`/sw.js`) and client-side parsers ensure the app works even at trailheads with zero mobile reception.
* **Hardware & Share APIs:** Access device camera, photo album, and native social sharing sheets.
* **Capacitor / Mobile Wrap Ready:** If native App Store distribution is ever desired, the codebase can be wrapped in Capacitor with zero rewrites.

---

## 🏗️ Architecture (`edge-app-architecture`)

```
run-craft/
├── src/
│   ├── types.ts              # Env bindings, activity models, overlay contracts
│   ├── config.ts             # Centralized CONFIG constants & dynamic resolvers (0 magic numbers)
│   ├── index.ts              # Edge worker entrypoint (< 60 lines)
│   ├── storage/
│   │   ├── adapter.ts        # Storage contracts (StateStore, EntityStore)
│   │   ├── memory.ts         # In-memory storage for dev & testing
│   │   ├── d1.ts             # Cloudflare D1 SQLite adapter (<= 90 statements batching)
│   │   └── index.ts          # Memoized storage factory with WeakMap
│   ├── routes/
│   │   ├── router.ts         # Zero-dependency modular edge router
│   │   ├── system.ts         # Health check & telemetry endpoints
│   │   ├── strava.ts         # Strava OAuth URL, token exchange, activity ingestion
│   │   ├── activities.ts     # Activity CRUD & sample presets
│   │   └── parser.ts         # Edge GPX/FIT parse routes
│   ├── auth/
│   │   └── types.ts          # AuthProvider implementations (StravaOAuth, OpenDev)
│   ├── sources/
│   │   ├── types.ts          # DataSource contracts & polyline decoders
│   │   └── mockData.ts       # Realistic GPS workouts (trail, tempo, century ride)
│   └── client/
│       ├── style.css         # Luxury athletic glassmorphism design system
│       ├── main.ts           # UI orchestrator & reactive state bindings
│       ├── studio/
│       │   └── canvasEngine.ts # High-DPI 2D canvas overlay engine
│       └── parsers/
│           ├── gpxClientParser.ts # Browser GPX XML DOMParser
│           └── fitClientParser.ts # Browser Garmin .FIT binary parser
├── public/
│   ├── manifest.webmanifest  # PWA manifest
│   ├── sw.js                 # PWA service worker
│   ├── icon.svg              # Vector brand icon
│   └── samples/              # Pro athletic sample photos
├── index.html                # Responsive web app entry
├── package.json
└── vite.config.ts            # Vite bundler with edge dev middleware
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server (serves both frontend & edge API)
npm run dev

# 3. Open in browser
# http://localhost:5173
```
