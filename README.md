# Inventory Pro

A full-stack inventory management system for small shops in India, built with MongoDB Atlas, Express, React and Node.js.

## Features

- Email/password sign-up and sign-in, plus Google sign-in (ID token verified on the server)
- JWT authentication with expiring tokens, protected API routes, rate-limited auth endpoints
- Product catalogue with SKU, barcode, HSN code, unit, cost and selling price, GST slab (0/5/12/18/28), reorder level and shelf location
- Categories with protection against deleting categories that still contain products
- Stock adjustments: stock received, stock removed (damage/loss), and exact-count stock takes, each with a reason
- Full stock ledger showing every movement and the balance after it
- GST-inclusive billing (point of sale) with cart, quantity controls, discounts, payment modes and atomic stock deduction with rollback on failure
- Numbered invoices (INV-YYYYMMDD-0001), printable invoice view
- Sales history with date filters and revenue totals
- Dashboard: today's revenue, 7-day revenue chart, top sellers, low and out-of-stock alerts, recent invoices, stock valuation
- CSV export of the inventory
- About page and Terms and Conditions page

## Project layout

```
inventory-pro/
  backend/    Express API (models, routes, middleware)
  frontend/   React + Vite single-page app
```

## Setup

### 1. MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com.
2. Under Database Access, create a database user with a password.
3. Under Network Access, allow your IP (or 0.0.0.0/0 for testing only).
4. Click Connect, choose "Drivers", and copy the connection string.

### 2. Google sign-in (optional but recommended)

1. Open https://console.cloud.google.com, create a project, and configure the OAuth consent screen.
2. Create an OAuth client ID of type "Web application".
3. Add `http://localhost:5173` under Authorized JavaScript origins.
4. Copy the client ID. Use it in both `backend/.env` and `frontend/.env`.

### 3. Backend

```bash
cd backend
cp .env.example .env        # fill in MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID
npm install
npm run seed                # optional: demo shop with sample products
npm run dev                 # API on http://localhost:5000
```

Generate a JWT secret with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Demo login after seeding: `demo@inventorypro.app` / `demo1234`

### 4. Frontend

```bash
cd frontend
cp .env.example .env        # fill in VITE_GOOGLE_CLIENT_ID
npm install
npm run dev                 # app on http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, so no CORS setup is needed in development.

## Production notes

- Set `JWT_SECRET` to a long random value and never commit `.env`.
- Serve the frontend build (`npm run build`) from the same domain as the API or behind a reverse proxy, and set `CLIENT_URL` accordingly.
- Replace the placeholder contact address in the About and Terms pages, and have a lawyer review the Terms before launch.
- Invoices record GST for reference. Filing returns and confirming HSN and rate correctness remains the shop owner's responsibility.

## Possible next steps

Staff roles and multi-branch support, purchase orders and supplier records, barcode label printing, CSV import, and WhatsApp invoice sharing.
