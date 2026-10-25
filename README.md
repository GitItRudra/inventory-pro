# Inventory Pro

Inventory management and billing for small shops in India. Each shop has its own products, sales, team, and Razorpay account. Built with MongoDB Atlas, Express, React, and Node.js.

## Features

- **Multiple shops:** each shop has separate products, categories, sales, stock history, and invoice numbers.
- **Team and roles:** owner, manager, and cashier, with permissions enforced on the server.
- **Staff sign-in without email:** the owner adds staff with a mobile number and a temporary 6-digit PIN. Staff choose their own PIN at first sign-in. Five wrong PINs lock the account for 15 minutes.
- **Email and Google sign-in:** shop owners can register with email or Google. Invite links are available for people who have email.
- **Billing:** GST-inclusive invoices, discounts with a per-shop limit for cashiers, cash, UPI, card, credit, and online payments.
- **Online payments:** each shop connects its own Razorpay keys in Settings. Keys are verified before saving, and the secret is encrypted in the database.
- **Stock:** stock in, stock out, stock takes, and a full ledger of every movement.
- **Dashboard:** today's revenue, last 7 days, top sellers, low-stock alerts, and recent invoices.
- **Subscription:** 14-day free trial, then a monthly plan through Razorpay Subscriptions. After a failed renewal, the shop keeps full access for a 3-day grace period, then becomes read-only.
- **CSV export** of the inventory.

## Roles

| Permission | Owner | Manager | Cashier |
|---|---|---|---|
| Billing and checkout | Yes | Yes | Yes |
| See cost price and profit | Yes | Yes | No |
| Add and edit products | Yes | Yes | No |
| Delete products and categories | Yes | No | No |
| Stock in and stock take | Yes | Yes | Stock in only |
| Cancel a paid bill (with reason) | Yes | Yes | No |
| Discounts | Any | Any | Up to the shop limit (default 5%) |
| Add staff | Yes | Cashiers only | No |
| Change roles, Settings, Subscription | Yes | No | No |

## Project structure

```
inventory-pro/
  backend/     Express API, MongoDB models, routes, middleware, scripts
  frontend/    React + Vite app
```

## Requirements

- Node.js 18 or newer
- A MongoDB Atlas cluster
- A Razorpay account (test mode is enough for development)
- A Google Cloud OAuth client ID (optional, for Google sign-in)

## Local setup

### 1. Backend

```powershell
cd backend
copy .env.example .env
npm install
```

Fill in `backend/.env`:

| Variable | What it is |
|---|---|
| `PORT` | `5000` |
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | Long random string (48 bytes in hex is a good length) |
| `JWT_EXPIRES_IN` | `7d` |
| `ENCRYPTION_KEY` | 64 hex characters. Keep it safe: if it changes, saved Razorpay secrets cannot be read |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `CLIENT_URL` | `http://localhost:5173` locally |
| `PUBLIC_API_URL` | `http://localhost:5000` locally |
| `TRIAL_DAYS` | `14` |
| `GRACE_DAYS` | `3` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Platform keys, used to bill shops |
| `RAZORPAY_PLAN_ID` | ID of the monthly plan, starts with `plan_` |
| `RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET` | Secret used for the subscription webhook |

Generate the random values with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start the API:

```powershell
npm run dev
```

### 2. Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`. The app runs at http://localhost:5173.

### 3. Demo data (optional)

On an empty database only:

```powershell
cd backend
npm run seed
```

This creates the demo owner `demo@inventorypro.app` with password `demo1234`. Don't run it on a production database.

## Scripts

Run these from the `backend` folder.

| Script | When to use it |
|---|---|
| `node scripts/backup.js` | Saves all collections as JSON into `backups/`. Run before any migration. |
| `node scripts/migrate-stage1.js` | One-time: creates a shop for existing users. Already applied to the original database. |
| `node scripts/migrate-roles.js` | One-time: converts the old `staff` role to `cashier`. |
| `node scripts/migrate-stage2.js` | One-time: assigns existing data to a shop. Refuses to run if there is more than one shop. |

`backups/` is in `.gitignore`. Backups contain customer data and password hashes and must never be committed.

## Setting up Razorpay for a shop

1. The owner opens **Settings** and enters the Key ID, Key Secret, and a webhook secret of their choice.
2. The app checks the keys with Razorpay before saving them.
3. The owner copies the webhook URL shown on the page into **Razorpay > Settings > Webhooks**, with the same secret, and turns on `payment.captured` and `payment.failed`.

Online sales for that shop go to the shop's own Razorpay account.

## Deployment

The backend runs on Render and the frontend on Vercel. The code is in GitHub.

**Backend (Render):** root directory `backend`, build command `npm install`, start command `npm start`. Set every variable from the table above, with production values, plus:
- `CLIENT_URL`: the Vercel address, without a trailing slash
- `PUBLIC_API_URL`: the Render address, without `/api`

Do not set `PORT`. Render sets it automatically.

**Frontend (Vercel):** root directory `frontend`, output directory `dist`. Set:
- `VITE_API_URL`: the Render address with `/api` at the end
- `VITE_GOOGLE_CLIENT_ID`

Vite reads `VITE_*` variables at build time, so redeploy after changing them.

**Google sign-in:** add the Vercel address to the authorised JavaScript origins.

**Subscription webhook:** in Razorpay, add `https://<your-render-url>/api/subscription/webhook` with the secret from `RAZORPAY_SUBSCRIPTION_WEBHOOK_SECRET`. Enable `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, and `subscription.completed`.

## Before going live

- Replace the Atlas password if it was ever shown publicly.
- Use a separate production database name, not the test database.
- Keep Razorpay in test mode until KYC is complete. Then switch to live keys and create the live plan.
- Turn on automatic backups in Atlas. The backup script is manual.
- Restrict Atlas network access to your hosting provider where possible.

## Security notes

- Passwords and PINs are hashed with bcrypt.
- Razorpay secrets are encrypted with AES-256-GCM before they are stored.
- Every query is scoped to the logged-in user's shop.
- Razorpay webhooks are accepted only with a valid signature.
- Cashiers never receive cost prices from the API, not only in the interface.