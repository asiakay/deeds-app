# Deeds App

Deeds is a lightweight Cloudflare Workers application that offers a guided
experience for signing up, logging in, and tracking your progress through a set
of onboarding tasks. The current implementation stores all profile data in a
[D1](https://developers.cloudflare.com/d1/) database and serves a static frontend
from Workers Sites.

## Project links

- **Placeholder landing page:** [public/index.html](./public/index.html)
- **GitHub repository:** [Occams-Labs/deeds-app](https://github.com/Occams-Labs/deeds-app)

## Architecture overview

- **Cloudflare Worker** (`functions/_worker.js`) handles HTTP routing, authentication
  flows, and all interaction with the D1 database binding `DEEDS_DB`.
- **D1 database** stores user profiles in a single `users` table (see
  `migrations/0001_init.sql`). Passwords are SHA-256 hashed before being
  persisted.
- **Static assets** live in `public/` and are served through the `ASSETS` binding.
  A shared `public/script.js` file hydrates each page with profile data cached in
  the browser.

## Worker API

All endpoints respond with JSON and include permissive CORS headers for `GET`,
`POST`, and `OPTIONS` requests. Error responses also use JSON with a
`message` field describing the failure.

| Method | Path               | Description |
| ------ | ------------------ | ----------- |
| `POST` | `/api/auth/signup` | Creates a new user in D1. Requires `name`, `email`, and `password` fields in the JSON body. Returns a success message and the persisted `profile` payload. |
| `POST` | `/api/auth/login`  | Authenticates an existing user. Requires `email` and `password` fields in the JSON body. Accepts legacy plain-text password hashes and upgrades them to hashed values. Returns a success message and the matching `profile` payload. |

Unauthenticated requests to the routes above receive an explanatory `message`
with an appropriate HTTP status code (`400`, `401`, `404`, or `409`). Requests to
other paths fall back to static asset handling, and unknown routes return a
minimal HTML placeholder.

## Session and profile caching

The Worker is stateless — it does not issue cookies or tokens. Instead, the
frontend caches the returned `profile` object in `localStorage` under the key
`deeds.profile`. This cache powers page hydration and basic session-like
behaviour:

- Successful sign-up and login responses call `saveProfile`, which stores the
  profile locally and redirects to `dashboard.html`.
- Signing out triggers `clearProfile`, removing the cached profile before
  navigating back to `login.html`.
- Pages that expect an authenticated user (`dashboard.html`) read the cached
  profile. If it is missing, the script redirects visitors to the login page.

## Frontend hydration

`public/script.js` is included on every page and provides the shared behaviour:

1. Attaches submit handlers to forms tagged with `data-auth-form` to call the
   Worker endpoints above, display inline feedback messages, and cache the
   returned profile.
2. Populates dashboard elements marked with `data-profile-field` attributes
   (name, email, created date, completion count, and initials) using the cached
   profile.
3. Binds buttons marked with `data-action="logout"` to clear the profile cache
   and return the visitor to `login.html`.

These hooks allow the static pages to feel dynamic without requiring a separate
client framework, while the Worker remains responsible for the authoritative
profile data in D1.
