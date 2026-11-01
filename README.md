# STOCKROOM — Full-Stack Inventory Management System

A clean, practical, and functional full-stack inventory management web application engineered for small shops and retail enterprises.

Built as an academic coursework submission for **Week 17–18**, demonstrating relational database modeling (PostgreSQL / Supabase), Object-Relational Mapping (Prisma), NoSQL document storage (MongoDB Atlas / Mongoose), RESTful API design, database transactions, pagination, indexing, centralized error handling, and structured request logging.

---

## 1. Project Overview

Stockroom provides an understated, reliable interface for daily retail and warehouse operations:
- **Product & Stock Management**: Real-time tracking of on-hand inventory, SKU identifiers, cost prices, and minimum safety reorder thresholds.
- **Categorization**: Group products into hierarchical departments (Electronics, Furniture, Stationery, Connectivity, Storage).
- **Vendor Management**: Maintain vendor directories, points of contact, and supplier histories.
- **Stock Movement Ledger**: Log every inbound receipt, customer fulfillment dispatch, and manual physical inventory adjustment.
- **Purchase Orders & Safe Stock Transactions**: Issue purchase orders to suppliers. Marking an order as **Received** atomically updates on-hand stock and logs stock movements via database transactions, preventing double-increment errors.
- **Audit & Business Activity Trail**: Log critical system mutations in MongoDB Atlas without compromising PostgreSQL transaction integrity.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, React Router 6, Plain Modular CSS | Minimalist, high performance, zero bloated UI libraries |
| **Backend** | Node.js, Express.js (ES6 / CommonJS) | Event-driven RESTful architecture with modular routing |
| **Relational Database** | PostgreSQL (Supabase / Local) | ACID compliance, strict foreign key constraints, indexes |
| **ORM** | Prisma ORM 5 | Type-safe migrations, relational joins, transactions |
| **NoSQL Database** | MongoDB Atlas / Mongoose 8 | High-throughput immutable audit and activity event logging |
| **Logging** | Winston Structured Logger | Leveled request/error logging with file rotation in `logs/` |
| **Environment** | dotenv | Secure credential encapsulation across environments |

> **Constraint Compliance**:
> - NO TypeScript, Next.js, Redux, Tailwind CSS, Bootstrap, or Material UI used.
> - Handcrafted semantic CSS designed to avoid generic AI-dashboard aesthetics.
> - Horizontal top navigation bar without permanent left sidebars.

---

## 3. Week 17–18 Concepts Demonstrated (Viva Reference Table)

| Concept | Implementation in Stockroom | File / Code Reference |
|---|---|---|
| **Relational Database** | PostgreSQL hosted on Supabase / local PostgreSQL cluster | `backend/prisma/schema.prisma` |
| **Database Schemas** | 6 relational models: `Category`, `Supplier`, `Product`, `PurchaseOrder`, `OrderItem`, `StockMovement` | `backend/prisma/schema.prisma` |
| **SQL JOINs** | Inner joins between products, suppliers, categories, order items; Left joins for aggregations | `backend/src/services/product.service.js`, `database/queries.sql` |
| **Database Indexes** | B-Tree indexes on `sku`, `name`, `categoryId`, `supplierId`, `status`, `createdAt` | `backend/prisma/schema.prisma` |
| **SELECT Queries** | Paginated reads, multi-field search, status filtering, and multi-criteria sorting | `backend/src/services/product.service.js` |
| **INSERT Queries** | Relational inserts with nested line-item generation and opening stock movements | `backend/src/services/order.service.js` |
| **UPDATE Queries** | Fine-grained field mutation and safe delta stock updates | `backend/src/services/stock.service.js` |
| **DELETE Queries** | Referential integrity protection: prevents deleting entities linked to active records | `backend/src/services/supplier.service.js` |
| **Aggregations** | Total stock valuation, low-stock counts, items per category, spend per supplier | `backend/src/services/overview.service.js`, `database/queries.sql` |
| **ORM & Migrations** | Prisma CLI migrations tracking schema state over time (`migration.sql`) | `backend/prisma/migrations/` |
| **Database Transactions** | Atomic `$transaction` for receiving purchase orders and manual stock adjustments | `backend/src/services/order.service.js` |
| **NoSQL & Document Stores** | MongoDB Atlas cluster storing flexible audit events | `backend/src/models/activityLog.model.js` |
| **Mongoose ODM** | Schemas, compound indexes, model statics, non-blocking resilience | `backend/src/services/activityLogger.service.js` |
| **RESTful APIs** | Resource-oriented design with proper HTTP verbs (GET, POST, PUT, PATCH, DELETE) | `backend/src/routes/` |
| **API Versioning** | Explicit `/api/v1/` route prefix for all endpoints | `backend/src/app.js` |
| **Pagination** | Offset/limit calculation returning `currentPage`, `totalPages`, `totalItems` | `backend/src/services/product.service.js` |
| **Filtering & Sorting** | Sanitized query parameter validation preventing SQL injection | `backend/src/services/product.service.js` |
| **Centralized Error Handling** | Custom `AppError` class, Prisma error mapper (`P2002`, `P2003`), 404 handler | `backend/src/middleware/errorHandler.js` |
| **Structured Logging** | Winston logger writing HTTP duration, method, status, stack traces to `logs/` | `backend/src/middleware/requestLogger.js` |

---

## 4. Database Architecture & Schema

### Entity Relationship Diagram (PostgreSQL)

```mermaid
erDiagram
    Category ||--o{ Product : contains
    Supplier ||--o{ Product : supplies
    Supplier ||--o{ PurchaseOrder : receives
    PurchaseOrder ||--o{ OrderItem : includes
    Product ||--o{ OrderItem : "ordered in"
    Product ||--o{ StockMovement : tracks

    Category {
        int id PK
        string name UK
        string description
        datetime createdAt
    }

    Supplier {
        int id PK
        string name
        string contactPerson
        string email
        string phone
        string address
        datetime createdAt
    }

    Product {
        int id PK
        string name
        string sku UK
        string description
        int categoryId FK
        int supplierId FK
        decimal price
        int quantity
        int minStockLevel
        datetime createdAt
        datetime updatedAt
    }

    PurchaseOrder {
        int id PK
        int supplierId FK
        string status
        decimal totalAmount
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        int id PK
        int purchaseOrderId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal subtotal
    }

    StockMovement {
        int id PK
        int productId FK
        string type
        int quantity
        int previousStock
        int newStock
        string note
        datetime createdAt
    }
```

### NoSQL Schema (MongoDB `ActivityLog`)
```json
{
  "_id": "ObjectId('654a1b2c3d4e5f6789012345')",
  "action": "Purchase Order Received",
  "entityType": "PurchaseOrder",
  "entityId": "4",
  "description": "Marked Purchase Order #4 as RECEIVED. Incremented inventory for 2 products.",
  "metadata": {
    "orderId": 4,
    "supplier": "Zenith Tech Supplies",
    "totalAmount": 118490,
    "itemCount": 2
  },
  "createdAt": "2026-11-01T18:55:12.000Z"
}
```

---

## 5. REST API Reference

Base URL: `/api/v1`

### Products
- `GET /api/v1/products` — Retrieve paginated products with filtering & sorting
  - Query parameters: `page`, `limit`, `search`, `categoryId`, `stockStatus` (`in_stock`, `low_stock`, `out_of_stock`), `sortBy` (`name`, `price`, `quantity`, `createdAt`), `order` (`asc`, `desc`).
- `GET /api/v1/products/:id` — Retrieve product details, category, supplier, and recent stock movements.
- `POST /api/v1/products` — Create new product with unique SKU and initial stock.
- `PUT /api/v1/products/:id` — Update product details.
- `DELETE /api/v1/products/:id` — Delete product (prevents deletion if referenced in purchase orders).
- `POST /api/v1/products/:id/stock` — Manual stock adjustment (`type: "IN" | "OUT"`, `quantity`, `note`).

### Categories
- `GET /api/v1/categories` — List all product categories with product counts.
- `POST /api/v1/categories` — Create a new category.

### Suppliers
- `GET /api/v1/suppliers` — List suppliers with contact information and catalog counts.
- `GET /api/v1/suppliers/:id` — Retrieve single supplier and their catalog products.
- `POST /api/v1/suppliers` — Register a new supplier.
- `PUT /api/v1/suppliers/:id` — Update supplier details.
- `DELETE /api/v1/suppliers/:id` — Delete supplier (blocked if products or purchase orders exist).

### Purchase Orders
- `GET /api/v1/orders` — List purchase orders with line-item counts and totals.
- `GET /api/v1/orders/:id` — View complete purchase order details with line items.
- `POST /api/v1/orders` — Create a new purchase order (`supplierId`, `items: [{ productId, quantity, unitPrice }]`).
- `PATCH /api/v1/orders/:id/status` — Update order status (`RECEIVED` executes transactional inventory increment; cannot be received twice).

### Stock Ledger & Audit
- `GET /api/v1/stock-movements` — Chronological ledger of all inventory transactions.
- `GET /api/v1/activity-logs` — Audit log trail queried from MongoDB.
- `GET /api/v1/health` — Database connectivity status (PostgreSQL & MongoDB).

---

## 6. Sample API Requests & Responses

### 1. Paginated Products with Search & Low Stock Filter
**Request**:
```http
GET /api/v1/products?page=1&limit=2&stockStatus=low HTTP/1.1
Host: localhost:5000
```
**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "Tenkeyless Mechanical Keyboard (Brown Switches)",
      "sku": "ELEC-KEY-002",
      "description": "Compact 87-key tactile keyboard with white LED backlight",
      "categoryId": 1,
      "supplierId": 1,
      "price": 3899,
      "quantity": 3,
      "minStockLevel": 8,
      "stockStatus": "LOW_STOCK",
      "category": { "id": 1, "name": "Electronics & Peripherals" },
      "supplier": { "id": 1, "name": "Apex Peripherals Logistics", "email": "rajesh@apexlogistics.in" }
    }
  ],
  "currentPage": 1,
  "totalPages": 1,
  "totalItems": 1,
  "limit": 2
}
```

### 2. Error Response (Duplicate SKU Violation)
**Request**:
```http
POST /api/v1/products HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "name": "Wireless Mouse Clone",
  "sku": "ELEC-MOU-001",
  "categoryId": 1,
  "supplierId": 1,
  "price": 1299
}
```
**Response (409 Conflict)**:
```json
{
  "success": false,
  "message": "A product with SKU \"ELEC-MOU-001\" already exists"
}
```

### 3. Transactional Purchase Order Receipt
**Request**:
```http
PATCH /api/v1/orders/3/status HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "status": "RECEIVED"
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Purchase order status updated to RECEIVED",
  "data": {
    "id": 3,
    "supplierId": 1,
    "status": "RECEIVED",
    "totalAmount": 51980,
    "items": [
      { "productId": 2, "quantity": 10, "unitPrice": 3499, "subtotal": 34990 },
      { "productId": 5, "quantity": 7, "unitPrice": 2427.14, "subtotal": 16990 }
    ]
  }
}
```

---

## 7. Installation & Setup Instructions

### Prerequisites
- **Node.js** (v18 or higher; tested on v24)
- **PostgreSQL**: Either a Supabase project connection string or local PostgreSQL (embedded postgres script included).
- **MongoDB**: Either a free MongoDB Atlas cluster connection string or local MongoDB instance on port 27017.

### Step 1: Clone and Navigate to Project
```bash
git clone <repository-url>
cd stockroom
```

### Step 2: Configure Environment Variables

**Backend Configuration (`backend/.env`)**:
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development

# For Supabase PostgreSQL:
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"

# For MongoDB Atlas:
MONGODB_URI="mongodb+srv://[USER]:[PASSWORD]@[CLUSTER].mongodb.net/stockroom?retryWrites=true&w=majority"
```

> **Local Zero-Config Option**:
> If testing locally without external cloud accounts, standard defaults work immediately:
> ```env
> DATABASE_URL="postgresql://postgres:password@localhost:5432/stockroom?schema=public"
> DIRECT_URL="postgresql://postgres:password@localhost:5432/stockroom?schema=public"
> MONGODB_URI="mongodb://127.0.0.1:27017/stockroom"
> ```

**Frontend Configuration (`frontend/.env`)**:
```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Step 4: Run Database Migrations & Seed Data
```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed sample catalog, suppliers, orders, and stock
node prisma/seed.js

cd ..
```

### Step 5: Start the Development Servers

**Option A (Separate Terminals)**:
```bash
# Terminal 1 — Start Backend Server (runs at http://localhost:5000)
cd backend
npm start

# Terminal 2 — Start Frontend Server (runs at http://localhost:5173)
cd frontend
npm run dev
```

**Option B (From Project Root)**:
```bash
npm run start:backend
npm run dev:frontend
```

Open your browser at **`http://localhost:5173`** to access Stockroom.

---

## 8. Automated Testing & Verification

The project includes an end-to-end automated verification script covering all core flows:
```bash
cd backend
node scripts/run-e2e-tests.js
```

The test runner validates:
1. Product CRUD, unique SKU constraint validation, and field formatting.
2. In-stock, low-stock, and out-of-stock boundary filtering.
3. Multi-field search and pagination controls.
4. Relational integrity (blocking deletions of products with active order items or suppliers with catalog entries).
5. Purchase order creation, pricing calculations, and transaction-safe receipts.
6. MongoDB audit log recording and non-blocking resilience.

---

## 9. Raw SQL Reference

For academic viva and SQL demonstrations, inspect `database/queries.sql`. It contains real PostgreSQL queries formatted for this database:
- `SELECT` queries with pagination, joins, and case-expression status flags.
- `INSERT`, `UPDATE`, and `DELETE` queries with referential safety checks.
- `INNER JOIN` and `LEFT JOIN` queries across 3-4 relational tables.
- `AGGREGATE` queries calculating valuation, units, category distributions, and supplier procurement metrics.
- Complete multi-statement transaction script for order receipts.

---

## 10. Design Philosophy

Stockroom deliberately departs from boilerplate SaaS dashboards:
- **Palette**: Warm off-white surfaces (`#F9F8F5`), white card backgrounds (`#FFFFFF`), dark charcoal typography (`#1D2125`), and natural sage accents (`#45634E`).
- **Clutter-Free**: No gratuitous 3D graphs, glassmorphic blur, or neon AI gradients.
- **Top Navigation**: Clean horizontal header keeping all inventory areas one click away while maximizing vertical data density for scanning tables.
- **Responsive**: Fully functional on desktop, tablet, and mobile screens.
