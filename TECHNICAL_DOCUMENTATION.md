# Masuma ERP & Integrated Marketplace: Comprehensive Technical Specification

## 1. SYSTEM OVERVIEW

**System Name:** Masuma Enterprise Resource Planning (ERP) & Integrated Marketplace  
**Business Objectives:** 
To provide an end-to-end solution for Masuma Autoparts East Africa that bridges internal warehouse management with a public-facing vehicle marketplace. The system replaces manual invoicing and disparate listing platforms with a unified, high-performance web application.

**Core Capabilities:**
- **Warehouse Management:** SKU-level inventory tracking with OEM cross-referencing.
- **Role-Based ERP:** Distinct workflows for Admins (System-wide), Managers (Inventory/Staff), and Cashiers (POS/Sales).
- **Marketplace Engine:** A curated platform for verified car/motorcycle listings including import-ready vehicles.
- **Identity & Compliance:** Automated Seller/Dealer vetting with administrative "Pending -> Approved" gatekeeping.
- **Data-Driven Intelligence:** Native analytics tracking user behavior, search trends, and conversion funnels.

---

## 2. ARCHITECTURE DESIGN

**Deployment Model:** Monolithic Application with Decoupled Frontend/Backend.
The application is structured into two primary environments:
1.  **Client-Side (React)**: A Single Page Application (SPA) that acts as the primary interface.
2.  **Server-Side (Express/Node.js)**: A RESTful API that coordinates business logic and persistent storage.

**Component Interaction Diagram (Logical):**
`User Browser` <-> `Vite/Static Server` (Frontend Assets)  
`User Browser` <-> `Express API` (JSON Data via REST)  
`Express API` <-> `TypeORM` <-> `SQL Database` (Persistence)

---

## 3. MODULE-BY-MALUE BREAKDOWN

### 3.1 Authentication & Authorization Module
- **Key Files:** `server/src/middleware/auth.ts`, `server/src/routes/auth.routes.ts`, `server/src/entities/User.ts`
- **Logic:** Uses JWT (JSON Web Tokens) with a strictly enforced `JWT_SECRET` environment variable. 
- **RBAC Roles:** `ADMIN`, `MANAGER`, `CASHIER`, `B2B_USER`, `DEALER`, `INDIVIDUAL_SELLER`, `BUYER`, `IMPORT_USER`.
- **RBAC Logic:**
    - `authenticate`: Verifies the token signature and attaches the `User` entity to `req.user`.
    - `authorize(roles[])`: Rejects requests if `req.user.role` is not in the allowed array.

### 3.2 Marketplace & Vehicle Management
- **Key Files:** `server/src/routes/marketplace.routes.ts`, `server/src/entities/VehicleListing.ts`, `components/Marketplace.tsx`
- **Responsibilities:** Handles CRUD for vehicle listings.
- **Critical Logic:** 
    - Sellers can only edit/delete their own listings.
    - **Status Security:** Only `ADMIN` users can modify the `status` field (PENDING, ACTIVE, SOLD, etc.). If a non-admin attempts to include `status` in a `PATCH` request, the field is deleted from the body before merging.

### 3.3 Inventory & ERP Engine
- **Key Files:** `server/src/entities/Product.ts`, `server/src/routes/inventory.routes.ts`, `server/src/entities/OemNumber.ts`
- **Structure:**
    - **Product:** Central entity with SKU, Name, and Price.
    - **ProductStock:** Tracks quantity per `Branch`.
    - **OemNumber:** Maps one product to many OEM part numbers for compatibility search.

---

## 4. DATA FLOW & COMMUNICATION

### 4.1 Synchronous REST Flow
1. **Request:** Client calls `GET /api/products?search=vitz`.
2. **Validation:** `validate` middleware checks query parameters.
3. **Controller:** The route handler uses the TypeORM repository to execute a `LIKE` search on names and SKUs.
4. **Response:** Returns a JSON object with results and pagination metadata.

### 4.2 Deep Link Resolution (Client-Side)
- **Path:** `App.tsx` -> `resolveDeepLinks`
- **Logic:** The SPA consumes URL parameters via `URLSearchParams`.
    - `?product=ID`: Triggers `apiClient.get('/products/ID')` and opens the QuickView modal.
    - `?listing=ID`: Sets view to `MARKETPLACE` and opens specific vehicle details.
    - `?post=ID`: Navigates to the Blog and expands the specific article.

---

## 5. DATABASE DESIGN (TYPEORM)

**Database Type:** Relational (MySQL optimized, SQLite compatible for dev).

### 5.1 Schema Invariants
- **Consistency Constraint:** `synchronize: false` is required in production. Schema changes must be manual or via migrations to prevent "Data Truncated" errors in distributed environments.
- **Connection Pool:** Configured with a `connectionLimit: 50` to handle concurrent traffic from subdomains.

### 5.2 Key Entity Relationships
- **User <-> VehicleListing:** `OneToMany` (One seller can have many listings).
- **Product <-> Category:** `ManyToOne`.
- **Product <-> OemNumber:** `OneToMany` with `cascade: true`.
- **Product <-> Vehicle:** `ManyToMany` (Vehicle compatibility mapping).

---

## 6. TECHNOLOGY STACK RATIONALE

- **Vite & React 18:** Selected for sub-second build times and better rendering via Concurrent Mode.
- **Tailwind CSS:** Enables "component-less" styling that prevents CSS bloat in a growing ERP.
- **TypeORM:** Provides robust TypeScript decorators that serve as both documentation and database configuration.
- **Zod:** Used for "Contract-First" development. The backend rejects invalid shapes before they reach the database layer.

---

## 7. SETUP & INSTALLATION GUIDE

### 7.1 Prerequisites
- Node.js version 18.0.0 or higher.
- A MySQL 8.0+ instance.

### 7.2 Configuration (`.env`)
- `JWT_SECRET`: Mandatory. Server crashes on startup if missing.
- `NODE_ENV`: Set to `production` to disable `synchronize`.
- `DB_HOST`, `DB_USER`, `DB_PASS`: Standard credentials.

### 7.3 Deployment Process
The system uses **PM2** for process management.
1. `npm install`
2. `npm run build` (Builds React assets to `/dist`).
3. `npx pm2 start ecosystem.config.cjs` (Starts the Node server using `tsx` or compiled `dist`).

---

## 8. ERROR HANDLING & LOGGING

### 8.1 Sanitization Middleware
- **Path:** `server/src/middleware/errorHandler.ts`
- **Logic:** Before logging any error to the console or persistence layer, the system scrubs sensitive fields like `password`, `token`, and `cvv` to ensure PII compliance.

### 8.2 Internal Analytics Logging
- **Path:** `utils/analytics.ts` -> `logInternalEvent`
- **Logic:** Dispatches a `POST` request to `/api/analytics/log` on every significant user action (Search, Product View, Checkout Start). This bypasses third-party blockers that might affect Google Analytics.

---

## 9. SECURITY ARCHITECTURE

**1. Input Guardrails:** The `validate(schema)` middleware wraps route handlers, ensuring `req.body` matches the Zod expectation exactly.
**2. Marketplace Integrity:** Authorization checks prevent unauthorized status manipulation.
**3. Database Security:** SQL injection is prevented through the systematic use of TypeORM's query builder and parameterized queries.
**4. Rate Limiting:**
    - **Sensitive Endpoints:** `/api/auth/login` is limited to 50 attempts per hour.
    - **Global API:** Limited to 500 requests per minute per IP using `X-Forwarded-For` tracking for proxy support.

---

## 10. SEO & SITEMAP INFRASTRUCTURE

**Dynamic Sitemap Generation (`/server/src/routes/sitemap.routes.ts`)**
Instead of a static XML file, the system serves sitemaps via an Express route:
- **Base Priority (1.0):** Root home.
- **Dynamic Content:** Fetches all `ListingStatus.ACTIVE` vehicles and `BlogPost` IDs.
- **Product Indexing:** Crawls the entire `Product` entity list to ensure long-tail SEO for part numbers.

---

## 11. TROUBLESHOOTING & MAINTENANCE

**Common Issue: "Data Truncated for Column Role"**
- **Cause:** `synchronize: true` attempted to modify an ENUM column while instances were running.
- **Fix:** Update the `role` enum in SQL manually and ensure `NODE_ENV=production` is set in the environment.

**Common Issue: "Sitemap 404"**
- **Cause:** Route priority in `app.ts`.
- **Fix:** Ensure `app.use('/sitemap.xml', ...)` is mounted *before* the static file server and the catch-all `index.html` handler.

---
**Technical Auditor Review Complete.**
**Status:** Approved for Production.
**Last Modified:** 2026-04-19
