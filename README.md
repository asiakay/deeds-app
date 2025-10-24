# 🌍 Ayiti of Deeds — MVP

**Goal:**  
Demonstrate how everyday actions can be verified, rewarded, and shared across the diaspora network.  
This MVP proves that a person can:
1. Create a profile  
2. Choose a deed  
3. Submit proof  
4. Get verified  
5. See their impact on a public leaderboard  

---

## 🚀 MVP Overview

| Stage | Action | Description |
|--------|---------|-------------|
| 0 | **Create Profile** | User enters name, email, and location to establish identity. |
| 1 | **Choose a Deed** | Loads options from `deeds.json` (e.g., cleanup, donation, petition). |
| 2 | **Submit Deed** | User records description + optional proof link. |
| 3 | **Verification** | For MVP, deeds auto-verify; future versions support partner or photo validation. |
| 4 | **Leaderboard** | Displays verified deeds and total points by user. |

---

## 🧩 Core Files

| File | Purpose |
|------|----------|
| `functions/_worker.js` | Cloudflare Worker backend. Handles routing and API endpoints. |
| `public/index.html` | Main interface (signup → submission → leaderboard). |
| `public/deeds.json` | List of deed templates with category, verification type, and reward. |
| `public/users.json` | Mock user profiles for leaderboard seeding. |
| `wrangler.toml` | Cloudflare configuration file with KV bindings. |

---

## ⚙️ Cloudflare KV Structure

| Key | Value Type | Description |
|-----|-------------|-------------|
| `profile:{id}` | JSON | Stores user profile data (name, email, location). |
| `deed:{id}` | JSON | Stores deed submissions and status. |
| `users` | Array | Used for leaderboard seed data. |

Example KV entry:
```json
{
  "id": "deed_001",
  "name": "Asia Grady",
  "type": "cleanup",
  "description": "Organized community cleanup on Grove Hall Ave.",
  "timestamp": "2025-10-24T00:00:00Z",
  "verified": true
}
```

---

## 🛠️ Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/deeds-app.git
cd deeds-app

# 2. Link Cloudflare account and KV namespace
npx wrangler login

# 3. Deploy to Workers
npx wrangler deploy
```

Then open:
```
https://deeds-app.<youraccount>.workers.dev
```

---

## 🧭 10-Day Execution (Occam’s Razor MVP Kanban)

| Day | Focus | Deliverable |
|-----|--------|-------------|
| 1–2 | Define success metrics & core flow | Sign-up → Deed → Verify → Leaderboard mapped |
| 3–4 | Connect data & design UI | Submission logic + auto verification |
| 5–6 | Refine system logic | Points & verification automation |
| 7–8 | QA & visual polish | Stable build + consistent brand |
| 9 | Demo & narrative | MVP walkthrough video |
| 10 | Launch & reflection | Public link + metrics review |

---

## 🧱 Tech Stack

- **Frontend:** HTML + TailwindCSS  
- **Backend:** Cloudflare Workers + KV Storage  
- **Data:** `users.json`, `deeds.json`  
- **Version Control:** GitHub + Working Copy (iOS)  

---

## 🧠 Future Additions

- Email or wallet-based login  
- Verified partner accounts for deed approval  
- Regional leaderboards (Haiti, Africa, U.S.)  
- Media verification (photo, video, GPS)  
- Reward token system  

---

## ✍️ Credits

Created by **Asia K. Grady**  
*Project Ayiti of Deeds — A proof of collective impact through verifiable action.*
