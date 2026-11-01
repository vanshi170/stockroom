-- ==============================================================================
-- STOCKROOM INVENTORY MANAGEMENT SYSTEM
-- Raw PostgreSQL Queries Reference (Week 17–18 Relational Database Curriculum)
-- Demonstrating: SELECT, INSERT, UPDATE, DELETE, INNER JOIN, LEFT JOIN, Aggregates
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BASIC CRUD OPERATIONS
-- ------------------------------------------------------------------------------

-- 1.1 INSERT (Create new category, supplier, and product)
INSERT INTO categories (name, description, "createdAt")
VALUES ('Electronics', 'Devices, components, and electronic accessories', NOW())
RETURNING *;

INSERT INTO suppliers (name, "contactPerson", email, phone, address, "createdAt")
VALUES ('Apex Hardware Logistics', 'Rajesh Sharma', 'rajesh@apexlogistics.in', '+91 98201 12345', 'Unit 402, Andheri East, Mumbai, MH', NOW())
RETURNING *;

INSERT INTO products (name, sku, description, "categoryId", "supplierId", price, quantity, "minStockLevel", "createdAt", "updatedAt")
VALUES ('Ergonomic Wireless Mouse', 'ELEC-MOU-001', 'Dual-mode 2.4GHz + Bluetooth silent mouse', 1, 1, 1499.00, 45, 10, NOW(), NOW())
RETURNING *;

-- 1.2 SELECT (Fetch all products with pagination and filtering)
SELECT id, name, sku, price, quantity, "minStockLevel", "createdAt"
FROM products
WHERE quantity <= "minStockLevel"
ORDER BY quantity ASC
LIMIT 10 OFFSET 0;

-- 1.3 UPDATE (Update product price and adjust stock level)
UPDATE products
SET price = 1599.00,
    quantity = quantity + 20,
    "updatedAt" = NOW()
WHERE sku = 'ELEC-MOU-001'
RETURNING *;

-- 1.4 DELETE (Delete product safely if no order items exist)
DELETE FROM products
WHERE id = 999 AND NOT EXISTS (
    SELECT 1 FROM order_items WHERE "productId" = 999
)
RETURNING id;


-- ------------------------------------------------------------------------------
-- 2. JOINS (INNER JOIN, LEFT JOIN)
-- ------------------------------------------------------------------------------

-- 2.1 INNER JOIN: Fetch products along with their category and supplier names
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    c.name AS category_name,
    s.name AS supplier_name,
    s.email AS supplier_email,
    p.price,
    p.quantity,
    CASE 
        WHEN p.quantity = 0 THEN 'Out of Stock'
        WHEN p.quantity <= p."minStockLevel" THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM products p
INNER JOIN categories c ON p."categoryId" = c.id
INNER JOIN suppliers s ON p."supplierId" = s.id
ORDER BY p.name ASC;

-- 2.2 INNER JOIN: Purchase order details with supplier and item count
SELECT 
    po.id AS po_id,
    po.status,
    po."totalAmount",
    po."createdAt" AS order_date,
    s.name AS supplier_name,
    s."contactPerson" AS contact_person,
    COUNT(oi.id) AS item_count,
    SUM(oi.quantity) AS total_units_ordered
FROM purchase_orders po
INNER JOIN suppliers s ON po."supplierId" = s.id
INNER JOIN order_items oi ON po.id = oi."purchaseOrderId"
GROUP BY po.id, po.status, po."totalAmount", po."createdAt", s.name, s."contactPerson"
ORDER BY po."createdAt" DESC;

-- 2.3 INNER JOIN: Order items with product details for a specific purchase order
SELECT 
    oi.id AS item_id,
    oi."purchaseOrderId",
    p.name AS product_name,
    p.sku,
    oi.quantity,
    oi."unitPrice",
    oi.subtotal
FROM order_items oi
INNER JOIN products p ON oi."productId" = p.id
WHERE oi."purchaseOrderId" = 1;

-- 2.4 LEFT JOIN: All categories and count of products in each (including empty categories)
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    c.description,
    COUNT(p.id) AS total_products,
    COALESCE(SUM(p.quantity), 0) AS total_stock_units
FROM categories c
LEFT JOIN products p ON c.id = p."categoryId"
GROUP BY c.id, c.name, c.description
ORDER BY total_products DESC;

-- 2.5 LEFT JOIN: All suppliers and their purchase orders (including suppliers with zero orders)
SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    s."contactPerson",
    COUNT(po.id) AS total_purchase_orders,
    COALESCE(SUM(po."totalAmount"), 0.00) AS total_order_value
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po."supplierId"
GROUP BY s.id, s.name, s."contactPerson"
ORDER BY total_order_value DESC;

-- 2.6 INNER JOIN: Stock movement history joined with product and category
SELECT 
    sm.id AS movement_id,
    sm."createdAt" AS timestamp,
    p.name AS product_name,
    p.sku,
    c.name AS category_name,
    sm.type AS movement_type,
    sm.quantity,
    sm."previousStock",
    sm."newStock",
    sm.note
FROM stock_movements sm
INNER JOIN products p ON sm."productId" = p.id
INNER JOIN categories c ON p."categoryId" = c.id
ORDER BY sm."createdAt" DESC
LIMIT 20;


-- ------------------------------------------------------------------------------
-- 3. AGGREGATE QUERIES (Curriculum Metrics)
-- ------------------------------------------------------------------------------

-- 3.1 Overview Summary: Total products, Total units, Total inventory value, Low stock count
SELECT 
    COUNT(id) AS total_products,
    COALESCE(SUM(quantity), 0) AS total_stock_units,
    COALESCE(SUM(quantity * price), 0.00) AS total_inventory_valuation,
    COUNT(CASE WHEN quantity <= "minStockLevel" THEN 1 END) AS low_stock_count,
    COUNT(CASE WHEN quantity = 0 THEN 1 END) AS out_of_stock_count
FROM products;

-- 3.2 Number of products and average price per category
SELECT 
    c.name AS category_name,
    COUNT(p.id) AS product_count,
    COALESCE(SUM(p.quantity), 0) AS total_units,
    ROUND(AVG(p.price), 2) AS average_unit_price,
    COALESCE(SUM(p.quantity * p.price), 0.00) AS category_stock_value
FROM categories c
LEFT JOIN products p ON c.id = p."categoryId"
GROUP BY c.id, c.name
ORDER BY category_stock_value DESC;

-- 3.3 Number of purchase orders and aggregate spend per supplier
SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    COUNT(po.id) AS total_orders,
    COUNT(CASE WHEN po.status = 'RECEIVED' THEN 1 END) AS received_orders,
    COUNT(CASE WHEN po.status = 'PENDING' THEN 1 END) AS pending_orders,
    COALESCE(SUM(CASE WHEN po.status = 'RECEIVED' THEN po."totalAmount" ELSE 0 END), 0.00) AS total_received_spend
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po."supplierId"
GROUP BY s.id, s.name
ORDER BY total_received_spend DESC;

-- 3.4 Low-stock products list with reorder recommendation
SELECT 
    p.id,
    p.name,
    p.sku,
    p.quantity AS current_stock,
    p."minStockLevel" AS minimum_required,
    (p."minStockLevel" * 2 - p.quantity) AS recommended_reorder_qty,
    s.name AS supplier_name,
    s.email AS supplier_email
FROM products p
INNER JOIN suppliers s ON p."supplierId" = s.id
WHERE p.quantity <= p."minStockLevel"
ORDER BY p.quantity ASC;


-- ------------------------------------------------------------------------------
-- 4. DATABASE TRANSACTION EXAMPLE
-- ------------------------------------------------------------------------------
-- Demonstrates safely receiving a Purchase Order:
-- 1. Check order is PENDING.
-- 2. Update Purchase Order status to RECEIVED.
-- 3. Increment stock quantity of each product.
-- 4. Record corresponding StockMovement entries.
-- ------------------------------------------------------------------------------

BEGIN;

-- Step A: Set PO status to RECEIVED
UPDATE purchase_orders
SET status = 'RECEIVED', "updatedAt" = NOW()
WHERE id = 1 AND status = 'PENDING';

-- Step B: Update Product stock (example for product #1 received with 25 units)
UPDATE products
SET quantity = quantity + 25, "updatedAt" = NOW()
WHERE id = 1;

-- Step C: Insert audit stock movement
INSERT INTO stock_movements ("productId", type, quantity, "previousStock", "newStock", note, "createdAt")
VALUES (1, 'Purchase Order Received', 25, 45, 70, 'Received PO #1', NOW());

COMMIT;

