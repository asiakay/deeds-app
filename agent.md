# Agent Context: Occam’s Razor MVP

## 🎯 Primary Objective
Guide and assist in completing a 10-day MVP build that demonstrates:
- A working deed submission → verification → credit → leaderboard flow.
- Authentication and basic localization.
- Deployment via Cloudflare Workers.

—

## 🧩 Tech Stack
- **Frontend:** HTML, TailwindCSS, vanilla JS  
- **Backend:** Cloudflare Workers + D1 (or KV for temporary data)  
- **Storage Schema:**
  - `users`: id, name, email, hashed_password, credits
  - `deeds`: id, user_id, title, proof_url, status, timestamp  

—

## 📜 Current State (Day 4)
- ✅ Auth flow complete
- ✅ Frontend pages scaffolded
- 🚧 Deed submission form pending connection
- 🚧 Credit logic pending
- 🔲 Verification flow not implemented
- 🔲 Leaderboard static
- 🔲 Localization not started

—

## ⚙️ Active Codex Prompts (v1)
1. Build `/api/deeds` route for POST + D1 storage  
2. Connect submission form to route and display success  
3. Add `/api/verify` for admin to mark deeds verified  
4. Replace leaderboard placeholders with live data  
5. Add credit counting logic per verified deed  
6. Integrate badges and responsive polish  
7. Prepare localization JSON files (en, ht)

—

## 🧭 Next Milestones
- Day 5 → Verification automation + mock data
- Day 6 → Real-time leaderboard aggregation
- Day 7 → UI polish + mobile refinement
- Day 8 → UX tone & translation audit
- Day 9 → Demo & repo freeze
- Day 10 → Pitch deck summary and presentation

—

## 🧰 Supporting Assets
- `Occams_Razor_MVP_Progress_Summary.md` — Project snapshot
- `README.md` — Live sprint tracker
- `scripts/seed.js` — Mock data generation
- `demo.sh` — Quick-start demo runner

—

## 🧑🏽‍💻 Instructions for Dev Agent
When activated, perform the following on each run:
1. Check for incomplete items in README.md checklist.  
2. Generate code snippets or tests for the next pending milestone.  
3. Update progress flags in README.md automatically.  
4. Log activity summary to `build_log.txt`.  
5. Suggest code optimizations or refactors for stability.

—

## 🧩 Definition of Done
- All primary routes working (`/signup`, `/login`, `/deeds`, `/verify`, `/leaderboard`)
- Data persistence confirmed in D1
- Credits and leaderboard updating in real time
- Localization toggle functional
- Demo walkthrough recorded and summarized

—

*This file acts as the running system memory for development tools or agents. Keep it updated after every major commit.*