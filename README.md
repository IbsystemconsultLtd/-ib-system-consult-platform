# IB System Consult Ltd — Backend

Backend foundation for customer accounts, wallet records and service requests.

## Deploy
Use a Node.js host such as Render or Railway and a PostgreSQL database.
Run `schema.sql`, then configure `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, and `NODE_ENV=production`.

Never commit `.env` or secret API keys to GitHub.

Payment, identity-provider integrations, notifications and admin controls should be added as separate production stages using authorized providers.
