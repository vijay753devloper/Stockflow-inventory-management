# StockFlow — Full-Stack Multi-Tenant Inventory Management

StockFlow is a production-grade, multi-tenant inventory management MVP built for small businesses and independent sellers. It allows users to register an organization, securely log in, track products, manage real-time inventory levels, identify low-stock items with customizable thresholds, and isolate tenant data end to end.

---

## 🛠 Technology Stack

- **Frontend:** React 18, Vite, React Router 6, Plain CSS (custom design system, zero external UI frameworks).
- **Backend:** Node.js, Express.js (ES Modules `type: "module"`), Helmet, CORS, Cookie-Parser, Express-Rate-Limit.
- **Database & ORM:** SQLite, Prisma ORM.
- **Authentication & Security:** bcryptjs (password hashing), JSON Web Tokens (JWT) stored in secure HTTP-only cookies, tenant-scoped database queries, centralized error handling.

---

## 📂 Project Directory Structure

```text
StackFlow/
├── backend/
│   ├── prisma/
│   │   ├── migrations/             # Applied database migration files
│   │   ├── schema.prisma           # Prisma schema (Organization, User, Product)
│   │   └── dev.db                  # Local SQLite database (git-ignored)
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.js           # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js  # JWT cookie verification & org loader
│   │   │   └── error.middleware.js # Centralized error handling
│   │   ├── routes/
│   │   │   ├── auth.routes.js      # Signup, login, logout, me
│   │   │   ├── product.routes.js   # Scoped CRUD & search
│   │   │   ├── dashboard.routes.js # Summary metrics & low stock table
│   │   │   └── settings.routes.js  # Organization settings & threshold
│   │   ├── app.js                  # Express application configuration
│   │   └── server.js               # HTTP server listener
│   ├── tests/
│   │   ├── auth.test.js            # Auth and session tests
│   │   ├── products.test.js        # Multi-tenant isolation & CRUD tests
│   │   └── dashboard.test.js       # Low-stock logic & settings tests
│   ├── .env.example
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Reusable fetch client with credentials
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication context provider
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Sidebar, topbar, and branding
│   │   │   ├── ProtectedRoute.jsx  # Route guard redirecting to /login
│   │   │   ├── StatCard.jsx        # Dashboard metric card
│   │   │   └── ProductForm.jsx     # Form for creating and editing products
│   │   ├── pages/
│   │   │   ├── Signup.jsx          # Organization registration
│   │   │   ├── Login.jsx           # User sign-in
│   │   │   ├── Dashboard.jsx       # Inventory metrics & low stock table
│   │   │   ├── Products.jsx        # Product listing, search, delete modal
│   │   │   ├── ProductFormPage.jsx # New/Edit page wrapper
│   │   │   └── Settings.jsx        # Default threshold settings
│   │   ├── App.jsx                 # Routes & layout definition
│   │   ├── main.jsx                # React DOM entry point
│   │   └── index.css               # Clean SaaS CSS styling
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   ├── .env
│   └── package.json
├── package.json                    # Root workspace script coordinator
├── verify-e2e.mjs                  # Automated end-to-end integration test suite
├── .gitignore                      # Git ignore file for secrets and databases
└── README.md                       # Documentation & run instructions
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v24 recommended).
- **npm**: v9.0.0 or higher.

---

### 2. Installation
From the root `StackFlow/` folder:

```bash
# Install dependencies for both backend and frontend in one command
npm run install:all
```

Or install them individually:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

---

### 3. Database Initialization & Migration
The backend comes pre-configured with SQLite. Run the initial migration to create the SQLite database file (`backend/prisma/dev.db`) and generate the Prisma client:

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

---

### 4. Running the Development Servers

Open two terminal windows:

#### Terminal 1: Backend Server (Port 5000)
```bash
# From the project root:
npm run backend:dev

# Or inside backend/:
cd backend
npm run dev
```
> The API will be available at `http://localhost:5000/api` (Health check: `http://localhost:5000/api/health`).

#### Terminal 2: Frontend Server (Port 5173)
```bash
# From the project root:
npm run frontend:dev

# Or inside frontend/:
cd frontend
npm run dev
```
> Open your browser and navigate to: **`http://localhost:5173`**

---

## 🧪 Testing

### Automated Backend Tests
Comprehensive tests covering authentication, tenant isolation, SKU constraints, dashboard metrics, and settings logic:

```bash
# From the root directory:
npm run backend:test

# Or inside backend/:
cd backend
npm test
```

### Live End-to-End Verification Test
Validates the entire end-to-end lifecycle (user registration, cookie sessions, product CRUD, search, organization settings change, dynamic low-stock calculation, and logout) against the live HTTP server:

```bash
npm run test:e2e
```

---

## 💡 Key Architectural & Implementation Decisions

### 1. Multi-Tenant Data Isolation
- Every database query for products or organization data is strictly scoped to the `organizationId` decoded from the verified JWT cookie (`req.organization.id`).
- Client requests cannot spoof another tenant's data by passing an arbitrary `organizationId` parameter in the request body or URL.
- Two different organizations can have products with identical SKU numbers without collision (`@@unique([organizationId, sku])`).

### 2. Secure HTTP-Only Cookie Authentication
- Passwords are encrypted using `bcryptjs` with 10 salt rounds. Plaintext passwords or password hashes are never exposed.
- JWT tokens are delivered via **HTTP-only cookies** (`httpOnly: true`, `sameSite: 'lax'`, `secure` in production), preventing XSS attacks from reading tokens via `localStorage` or `sessionStorage`.
- The `GET /api/auth/me` endpoint ensures frontend navigation guards are verified on every session refresh.

### 3. Dynamic Low-Stock Determination
A product is classified as low stock when:
$$\text{quantityOnHand} \le \text{effectiveThreshold}$$

Where:
- $\text{effectiveThreshold} = \text{product.lowStockThreshold}$ (if explicitly set).
- Otherwise, $\text{effectiveThreshold} = \text{organization.defaultLowStockThreshold}$ (defaults to 5).

Updating the organization default threshold immediately recalculates low-stock status for all products relying on the default.

---

## 🌐 Application Walkthrough

1. **Sign Up (`/signup`)**: Register your organization and owner credentials in an atomic database transaction.
2. **Dashboard (`/app/dashboard`)**: View real-time Total Products, Total Stock Units, and Low-Stock items.
3. **Products Catalog (`/app/products`)**:
   - Filter and search items in real-time by Name or SKU.
   - Click **Add Product** (`/app/products/new`) to add inventory with SKU, quantity, procurement cost, and selling price.
   - Click **Edit** (`/app/products/:id/edit`) to adjust quantities or prices.
   - Click **Delete** with confirmation dialog to remove an item.
4. **Settings (`/app/settings`)**: Adjust your organization's default low-stock threshold.
5. **Logout**: Safely clears your HTTP-only cookie and redirects to `/login`.
