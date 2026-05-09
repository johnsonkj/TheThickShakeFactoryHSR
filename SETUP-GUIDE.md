# The Shake Factory — Setup Guide

First-time setup steps. After this is done you should never need to revisit this file. Day-to-day use and feature reference live in [README.md](README.md).

**Stack:** Plain HTML + Tailwind + Vanilla JS + Firebase Firestore. Hosted on GitHub Pages. No build step.

---

## 🔑 Account credentials

The Firebase project (**TTSF-HSR-Tracker**) and the GitHub repository are both under the **TTSF shop Gmail account**. To access either, sign in with that account.

> The actual email and password are not stored in this repo (it's public). Keep them in a private note.

---

## 🚀 PART 1 — Firebase setup (one-time)

### Step 1: Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your shop Gmail account
3. Click **"Add project"** → name it `shake-factory` (or anything) → Continue
4. Disable Google Analytics → Create project

### Step 2: Add a Web App

1. On the project home page, click the **`</>`** icon ("Add app — Web")
2. Nickname it `shake-factory-web` → Register App
3. Firebase shows a `firebaseConfig` object. **Copy these values** — you'll paste them into `firebase-config.js` next:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "shake-factory.firebaseapp.com",
     projectId: "shake-factory",
     storageBucket: "shake-factory.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123"
   };
   ```
4. Click "Continue to console"

### Step 3: Enable Firestore Database

1. Left menu: **Build → Firestore Database**
2. **Create database** → "Start in production mode" → location **`asia-south1` (Mumbai)** → Enable
3. Go to the **Rules** tab. Replace with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. Click **Publish**

> **Security note:** these rules let anyone with the URL read/write data. Acceptable for a low-stakes internal tool with a non-public URL. Tighten later (e.g., Firebase Auth) if you need to.

### Step 4: Edit `firebase-config.js`

Open `firebase-config.js` and paste in your values from Step 2:

```js
export const firebaseConfig = {
  apiKey: "AIzaSy...",                          // ← from Step 2
  authDomain: "shake-factory.firebaseapp.com",  // ← from Step 2
  projectId: "shake-factory",                   // ← from Step 2
  storageBucket: "shake-factory.appspot.com",   // ← from Step 2
  messagingSenderId: "1234567890",              // ← from Step 2
  appId: "1:1234567890:web:abcdef123"           // ← from Step 2
};

export const OWNER_PASSWORD = "shakefactory2026";  // ← change this!
```

**Change `OWNER_PASSWORD`** to something only you know. (This is the password for `owner.html`, separate from the worker passwords you'll set later.)

---

## 🌐 PART 2 — Hosting on GitHub Pages

### Step 5: Push to GitHub

If the code isn't already in a public GitHub repo, create one and push the files.

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/TheThickShakeFactoryHSR.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

The repo must be **public** for GitHub Pages on the free tier.

### Step 6: Enable GitHub Pages

1. Repo → **Settings** → left sidebar **Pages**
2. **Source** → "Deploy from a branch" → branch **`main`**, folder **`/ (root)`** → **Save**
3. Wait ~1 minute. The page shows:
   > *Your site is live at* `https://YOUR_USERNAME.github.io/TheThickShakeFactoryHSR/`

That's your shop's portal URL. 🎉

---

## ⚙️ PART 3 — First-run admin tasks

Workers can't use most cards until you do these. Open `https://YOUR_USERNAME.github.io/TheThickShakeFactoryHSR/owner.html` and log in with `OWNER_PASSWORD`.

### Step 7: Set worker passwords

Scroll to **🔑 Worker Passwords**:
- Pick **Surya** → enter a password → Save
- Pick **Sushanth** → enter a password → Save

The status line at the top shows which workers have passwords set.

### Step 8: Set bonus configuration (optional, for incentive feature)

Scroll to **🎁 Bonus Configuration**:
- Set **Bonus % of sales** (e.g. `5`)
- **Add** sections (e.g. `Sundae`, `Waffles`)
- **Save Configuration**

Workers will now see those sections in the closing checklist.

### Step 9: Tune inventory minimums (optional)

Scroll to **📋 Minimum Quantity Levels**. Each item shows a default value (from `inventory-data.js`) labelled "(default)". Edit any you want to change → **Save Changes (this tab)** for that category. Tabs save independently.

---

## 👷 PART 4 — Tell the workers

Bookmark `https://YOUR_USERNAME.github.io/TheThickShakeFactoryHSR/` on the shop device.

What they need to know:
- Five cards on the home page: **Attendance**, **Opening**, **Closing**, **Inventory**, **Walk-in Sales**.
- Tapping any card prompts for a worker password (dropdown + password). For Attendance, the prompt is per Check In / Check Out so both workers can share the device.
- All saves auto-stamp the worker who authenticated — no name typing.
- The 🎉 banner on home shows month-to-date incentive per worker.

---

## 💰 Costs

**Zero.** Free-tier ceilings (you'll never hit these):
- Firebase Firestore: 1 GB storage, 50K reads/day, 20K writes/day
- GitHub Pages: 100 GB bandwidth/month

---

## 🆘 If something doesn't work

See the Troubleshooting section in [README.md](README.md). The two most common first-run issues:

1. **Save fails with a permission error** → Firestore rules aren't published (Step 3).
2. **Workers can't open any card** → worker passwords haven't been set (Step 7).
