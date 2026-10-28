# Bakery ERP — Express, MongoDB and RBAC

Bakery admin workspace with JWT authentication, server-enforced role permissions, product and inventory management, sales orders, collections, route/shop management, attendance, production planning and reports.

## Roles

- `owner`
- `office_staff`
- `salesman`
- `factory_manager`
- `store_keeper`

Permissions are defined in `src/config/permissions.js`. Change this policy to match your actual business rules.

## Requirements

- Node.js 20+ recommended
- MongoDB running locally or a MongoDB connection URI

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set your values. Use a long, unique `JWT_SECRET`. Never commit `.env`.

3. Start MongoDB and start the frontend and API together:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` for the admin app. Sign in with an owner account. Salesman accounts are politely refused by the admin sign-in and must use the salesman sign-in surface. The frontend calls the API on port 5000. For production, `npm start` serves the frontend and API together on port 5000.

5. Check health:

   `GET http://localhost:5000/api/health`

## Create the first owner

The public API intentionally does not allow users to create owner accounts. After configuring `.env`, run this one-time bootstrap script:

```bash
node scripts/create-owner.js
```

It creates the owner only if the configured email does not already exist. Remove the `OWNER_*` variables from `.env` after use. Do not expose this script as a public endpoint.

## Authentication

### Login

`POST /api/auth/admin-login` is for the admin app; `POST /api/auth/login` is the general account login API. Both accept an email or phone number and password. Repeated failed attempts are rate limited.

```json
{
  "email": "owner@example.com",
  "password": "your-configured-password"
}
```

Copy the returned `token`. In Postman choose **Authorization → Bearer Token** and paste it for protected endpoints.

### Current user

`GET /api/auth/me`

Requires a valid bearer token.

### Create a staff user

`POST /api/auth/users`

Owner-only. Example:

```json
{
  "name": "Sales Staff",
  "email": "sales@example.com",
  "password": "AUniquePassword12!",
  "role": "salesman",
  "phone": ""
}
```

### Products endpoints

All product endpoints require authentication.

- `GET /api/products`
- `GET /api/products?search=bread`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `PATCH /api/products/:id/status` — soft-deactivates a product

### Inventory endpoints

All inventory endpoints require a valid bearer token and the role permission shown below.

- `GET /api/inventory` — `inventory:read`; lists stock for active products.
- `GET /api/inventory/:productId` — `inventory:read`; returns one product's stock (zero if not adjusted yet).
- `POST /api/inventory/:productId/adjustments` — `inventory:manage`; adds or removes stock.

Adjustment body:

```json
{
  "quantityChange": 24,
  "reason": "Opening stock"
}
```

`quantityChange` must be a non-zero integer. Negative adjustments that would take stock below zero are rejected. An optional non-negative integer `lowStockThreshold` can be set in the same request. New products receive an initial zero stock balance.

## Admin app

- Dashboard: selected-day sales, previous-day change, order and collection totals, seven-day chart, salesman activity, leading products, latest orders, and factory status.
- Orders: shared URL filters, pagination, order/payment history, reasoned cancellation, and printable one-page invoices.
- Payments and dues: date/mode/salesman filters and aging by oldest unpaid bill.
- Shops, routes, products and salesmen: search, edit and deactivate; CSV shop import; product photos and display order; route assignment and daily targets.
- Attendance, production, raw-material levels and all five reports, with CSV and Excel-compatible exports.

Admin dashboard and management APIs require the `owner` role. Sales order and attendance APIs also enforce the role permissions for salesman accounts. Cancelled orders remain stored but are excluded from sales and collection totals.

Example create body:

```json
{
  "name": "Milk Bread",
  "sku": "BRD-001",
  "category": "Bread",
  "unit": "piece",
  "sellingPrice": 35,
  "costPrice": 22
}
```

## Initial permissions

- Owner: user management, product management, inventory management, sales, production, reports.
- Office staff: product and inventory read, sales management, reports.
- Salesman: product read, create sales, read own sales.
- Factory manager: product and inventory read, production management.
- Store keeper: product read, inventory read and management.

Sales order, payment, inventory, and attendance routes enforce permissions at the API layer. Admin management routes require the owner role. Sales ownership is applied in database filters for order and payment reads.

## Security notes

- Keep login public; do not apply `requireAuth` globally before the login route.
- RBAC is enforced on the backend, not just by hiding UI controls.
- Keep `JWT_SECRET` private and use HTTPS in production.
- Product inventory stores current stock; it does not yet provide a complete historical stock ledger.
- Production and raw-material features provide day plans and stock levels; manufacturing recipes and automatic material consumption are not included.
