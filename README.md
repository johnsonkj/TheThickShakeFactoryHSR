# The Shake Factory — Shop Portal

A simple internal website for shop workers to fill the opening checklist, closing checklist, and inventory updates. The owner sees a private dashboard with reports and low-stock alerts.

**Stack:** Plain HTML + Tailwind + Vanilla JS + Firebase Firestore. Hosted on GitHub Pages. Zero monthly cost.

---

## 🔑 Account Credentials

The Firebase project (**TTSF-HSR-Tracker**) is registered under the **TTSF shop Gmail account**. To log in to the Firebase console, view stored data, or change anything in Firebase, sign in to [console.firebase.google.com](https://console.firebase.google.com) using the TTSF shop Gmail credentials.

The GitHub repository hosting this site is also managed via the same TTSF shop Gmail account.

> The actual email address and password are not stored in this file (this repo is public). They are kept separately in a private note.

---

## 📁 Project Files

| File | Purpose |
|------|---------|
| `index.html` | Worker home page — links to checklists & inventory |
| `opening.html` | Opening checklist (21 tasks) |
| `closing.html` | Closing checklist (7 tasks) |
| `inventory.html` | Inventory update with 4 category tabs |
| `owner.html` | Owner dashboard (password-protected) |
| `firebase-config.js` | **YOU EDIT THIS** — Firebase keys + owner password |
| `app.js` | Database functions (don't need to edit) |
| `inventory-data.js` | All inventory items + reorder thresholds (edit to add/remove items) |
| `styles.css` | Minor styling |

---

## 🚀 SETUP — Do This Once

### Step 1: Create a Firebase project (free)

1. Go to **https://console.firebase.google.com**
2. Sign in with your shop Gmail account
3. Click **"Add project"** → name it `shake-factory` → click Continue
4. Disable Google Analytics (you don't need it) → Create project

### Step 2: Add a Web App to Firebase

1. On the Firebase project home page, click the **`</>`** icon ("Add app — Web")
2. Give it a nickname like `shake-factory-web` → click Register App
3. **Firebase will show you a `firebaseConfig` object — copy it.** It looks like:
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

1. In the Firebase console left menu: **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** → click Next
4. Choose location: **`asia-south1` (Mumbai)** — closest to Bangalore → Enable
5. Once created, go to the **"Rules"** tab. Replace the rules with:
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
6. Click **Publish**.

> **Note on security:** these rules let anyone with the URL read and write data. That's fine for a low-stakes internal tool with a non-public URL — but if you want me to add stricter rules later (e.g., only allow writes from known devices), just ask.

### Step 4: Edit `firebase-config.js`

Open `firebase-config.js` in any text editor (or directly on GitHub). Paste in the values you copied from Step 2:

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

**Change `OWNER_PASSWORD`** to something only you know.

---

## 🌐 HOSTING ON GITHUB PAGES

### Step 5: Create a GitHub repo

1. Go to **https://github.com/new**
2. Repository name: `shake-factory` (or whatever)
3. Set it to **Public** (Pages is free for public repos)
4. Click **Create repository**

### Step 6: Upload all files

**Easiest way (browser):**
1. On the new empty repo page, click **"uploading an existing file"**
2. Drag all 9 files (the `.html`, `.js`, `.css`, `.md` files) into the upload area
3. Scroll down → click **Commit changes**

**Or via Git CLI (if you know it):**
```bash
git clone https://github.com/YOUR_USERNAME/shake-factory.git
cd shake-factory
# copy all files into this folder
git add .
git commit -m "Initial commit"
git push
```

### Step 7: Enable GitHub Pages

1. In your repo on GitHub, click **Settings** (top tab)
2. Left sidebar → click **Pages**
3. Under "Build and deployment" → Source → select **Deploy from a branch**
4. Branch → select **`main`** → folder **`/ (root)`** → click **Save**
5. Wait ~1 minute. Refresh the page. You'll see:
   > *Your site is live at* `https://YOUR_USERNAME.github.io/shake-factory/`

That's your shop's website URL. 🎉

---

## 👷 DAILY USE

### For workers:
- Bookmark `https://YOUR_USERNAME.github.io/shake-factory/` on the shop laptop browser
- Three buttons: Opening / Closing / Inventory
- Tick boxes / fill quantities → click Save
- They will be asked for their name when saving (so you know who submitted what)

### For you (owner):
- Go to `https://YOUR_USERNAME.github.io/shake-factory/owner.html`
- Enter your password
- See:
  - Today's checklist completion
  - Low-stock items (auto-flagged from latest inventory)
  - Full inventory snapshot
  - Last 14 days activity table
  - Export low-stock list as CSV (to copy into orders)

---

## 🔧 COMMON TASKS

### Change the owner password
Edit `firebase-config.js`, change the `OWNER_PASSWORD` value, commit. Live in ~1 min.

### Add or remove inventory items
Edit `inventory-data.js`. Each item is one line — copy the format. Adjust `threshold` values to control when the dashboard flags items as "low stock".

### Change a checklist task
Edit the `tasks` array at the top of `<script>` in `opening.html` or `closing.html`.

### Look at raw data
Firebase Console → your project → Firestore Database → you'll see collections:
- `checklists_opening` — one document per date
- `checklists_closing` — one document per date
- `inventory` — one document per date

### Hide owner.html from search engines (optional)
Workers won't easily find it, but to be safer create a file `robots.txt`:
```
User-agent: *
Disallow: /owner.html
```

---

## 💰 COSTS

**Zero.** Free tier limits (you'll never hit these):
- Firebase Firestore free: 1 GB storage, 50K reads/day, 20K writes/day
- GitHub Pages free: 100 GB bandwidth/month
- One shop, ~5 submissions/day = ~150/month. Practically rounding error against the limits.

---

## 🆘 TROUBLESHOOTING

**Site loads but Save buttons fail with an error**
→ You haven't pasted the Firebase config into `firebase-config.js`, or Firestore rules aren't published. Re-check Steps 3 and 4.

**Owner login shows "Incorrect password"**
→ Check `OWNER_PASSWORD` in `firebase-config.js`. Case-sensitive.

**Site doesn't load at all**
→ GitHub Pages takes 1–2 mins after first publish. Refresh. Make sure you committed all files.

**Worker accidentally clicks "Owner" link**
→ They can't get past the login screen. The URL is also unlisted from the home page (only a tiny dot at the bottom). You can remove that link entirely if you want — delete the `<a href="owner.html">·</a>` line from `index.html`.

**I want to download / export all my data**
→ Firebase Console → Firestore → use the export feature, or I can give you a small script. Ask anytime.
