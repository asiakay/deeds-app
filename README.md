# Deeds App

The Deeds App is an MVP that helps neighbors document good deeds, verify contributions, and celebrate impact on a shared leaderboard. It is built with a Cloudflare Worker backend and a Tailwind-powered frontend.

## Key links
- [Sprint tracker and daily checklist](Sprint_README.md)
- [Project documentation overview](docs/creadme.md)
- [Cloudflare deployment notes](docs/d1_migration_commands.md)

## Quick start
```bash
npm install
npm run start
```

The development server runs through `wrangler dev`, serving the static assets from the `public/` directory and exposing the Worker API routes.

## Project structure
```
functions/       # Cloudflare Worker handlers and API routes
public/          # Static frontend pages and assets
scripts/         # Utility scripts used for deployment helpers
migrations/      # D1 database schema migrations
```

## Contributing
Please open an issue or pull request on GitHub if you encounter bugs or have improvements to share.
