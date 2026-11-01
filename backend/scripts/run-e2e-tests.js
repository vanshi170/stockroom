require('dotenv').config();
const http = require('http');
const app = require('../src/app');
const prisma = require('../src/config/db');
const { connectMongoDB } = require('../src/config/mongo');

async function runE2ETests() {
  await connectMongoDB();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5098, resolve));
  console.log('E2E Test Server listening on port 5098\n');

  function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`http://localhost:5098${path}`);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            const parsed = resBody ? JSON.parse(resBody) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: resBody });
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    console.log('--- TEST SUITE 1: Product CRUD & Validation ---');
    const testSku = `TEST-KEY-${Date.now()}`;
    // 1. Create a product
    const createRes = await request('POST', '/api/v1/products', {
      name: 'Test Bluetooth Keyboard',
      sku: testSku,
      description: 'Compact wireless keyboard for test',
      categoryId: 1,
      supplierId: 1,
      price: 1899.0,
      quantity: 15,
      minStockLevel: 5,
    });
    assert(createRes.status === 201, 'Create product returns 201 Created');
    assert(createRes.body.data.sku === testSku, 'Created product has matching SKU');
    const testProdId = createRes.body.data.id;

    // 2. Duplicate SKU rejection
    const dupRes = await request('POST', '/api/v1/products', {
      name: 'Duplicate SKU Product',
      sku: testSku,
      categoryId: 1,
      supplierId: 1,
      price: 999.0,
      quantity: 5,
    });
    assert(dupRes.status === 409, 'Duplicate SKU returns 409 Conflict');

    // 3. Update product
    const updateRes = await request('PUT', `/api/v1/products/${testProdId}`, {
      price: 1999.0,
      minStockLevel: 8,
    });
    assert(updateRes.status === 200, 'Update product returns 200 OK');
    assert(updateRes.body.data.price === 1999.0, 'Updated product reflects new price');

    // 4. Stock Adjustment: Add Stock (Stock In)
    const stockInRes = await request('POST', `/api/v1/products/${testProdId}/stock`, {
      type: 'IN',
      quantity: 10,
      note: 'Restock shipment',
    });
    assert(stockInRes.status === 200, 'Stock In returns 200 OK');
    assert(stockInRes.body.product.quantity === 25, 'Stock quantity incremented from 15 to 25');

    // 5. Stock Adjustment: Remove Stock (Stock Out)
    const stockOutRes = await request('POST', `/api/v1/products/${testProdId}/stock`, {
      type: 'OUT',
      quantity: 5,
      note: 'Customer order dispatch',
    });
    assert(stockOutRes.status === 200, 'Stock Out returns 200 OK');
    assert(stockOutRes.body.product.quantity === 20, 'Stock quantity decremented from 25 to 20');

    // 6. Stock Adjustment: Insufficient stock check
    const overDrawRes = await request('POST', `/api/v1/products/${testProdId}/stock`, {
      type: 'OUT',
      quantity: 100,
      note: 'Invalid overdraw',
    });
    assert(overDrawRes.status === 400, 'Overdraw returns 400 Bad Request');

    console.log('\n--- TEST SUITE 2: Purchase Order Lifecycle & Transaction Safety ---');
    // 1. Create Purchase Order
    const poRes = await request('POST', '/api/v1/orders', {
      supplierId: 1,
      items: [
        { productId: testProdId, quantity: 20, unitPrice: 1500.0 },
      ],
    });
    assert(poRes.status === 201, 'Create PO returns 201 Created');
    assert(poRes.body.data.status === 'PENDING', 'New PO is in PENDING status');
    assert(poRes.body.data.totalAmount === 30000.0, 'Calculates totalAmount: 20 * 1500 = 30000');
    const testPoId = poRes.body.data.id;

    // 2. Mark Purchase Order as RECEIVED (Database Transaction)
    const receiveRes = await request('PATCH', `/api/v1/orders/${testPoId}/status`, {
      status: 'RECEIVED',
    });
    assert(receiveRes.status === 200, 'Mark PO received returns 200 OK');
    assert(receiveRes.body.data.status === 'RECEIVED', 'PO status is now RECEIVED');

    // Verify product stock incremented: 20 + 20 = 40
    const prodCheck = await request('GET', `/api/v1/products/${testProdId}`);
    assert(prodCheck.body.data.quantity === 40, 'Product stock safely incremented to 40 via transaction');

    // 3. Prevent duplicate receipt
    const dupReceive = await request('PATCH', `/api/v1/orders/${testPoId}/status`, {
      status: 'RECEIVED',
    });
    assert(dupReceive.status === 400, 'Duplicate receipt of PO rejected with 400');

    console.log('\n--- TEST SUITE 3: Relational Integrity & Safe Deletion ---');
    // Attempt to delete product referenced in order
    const delProdRes = await request('DELETE', `/api/v1/products/${testProdId}`);
    assert(delProdRes.status === 400, 'Cannot delete product referenced in purchase orders (400 Bad Request)');

    // Attempt to delete supplier with catalog products
    const delSuppRes = await request('DELETE', '/api/v1/suppliers/1');
    assert(delSuppRes.status === 400, 'Cannot delete supplier with active catalog items (400 Bad Request)');

    console.log('\n--- TEST SUITE 4: Pagination, Filtering & Sorting ---');
    const paged = await request('GET', '/api/v1/products?page=2&limit=5');
    assert(paged.status === 200, 'Paged products returns 200 OK');
    assert(paged.body.currentPage === 2, 'Response has currentPage = 2');
    assert(paged.body.data.length <= 5, 'Page limit respected');

    const sorted = await request('GET', '/api/v1/products?sortBy=price&order=desc');
    assert(sorted.status === 200, 'Sorted products returns 200 OK');
    assert(sorted.body.data[0].price >= sorted.body.data[1].price, 'Sorted by price descending correctly');

    const lowStock = await request('GET', '/api/v1/products?stockStatus=low');
    assert(lowStock.status === 200, 'Low stock filter returns 200 OK');
    assert(lowStock.body.data.every((p) => p.quantity <= p.minStockLevel), 'Every filtered product is at or below minStockLevel');

    console.log('\n--- TEST SUITE 5: MongoDB Activity Logs Audit Trail ---');
    const logsRes = await request('GET', '/api/v1/activity-logs?limit=5');
    assert(logsRes.status === 200, 'Activity logs query returns 200 OK');
    assert(logsRes.body.connected === true, 'MongoDB Atlas connection active');
    assert(logsRes.body.data.length > 0, 'Audit entries successfully recorded in MongoDB');
    console.log(`  Latest log: [${logsRes.body.data[0].action}] - "${logsRes.body.data[0].description}"`);

    console.log(`\n======================================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================`);
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2ETests();
