const http = require('http');
const app = require('../src/app');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('Test server started on port 5099\n');

  async function testGet(path, desc) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:5099${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            console.log(`[PASS] ${desc} (Status: ${res.statusCode})`);
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            console.error(`[FAIL] ${desc} - JSON parse error`, body);
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  try {
    await testGet('/api/v1/health', 'Health check');
    await testGet('/api/v1/overview', 'Overview metrics');
    await testGet('/api/v1/products?page=1&limit=5', 'Products pagination');
    await testGet('/api/v1/products?stockStatus=low', 'Products low stock filter');
    await testGet('/api/v1/products?search=Mouse', 'Products search');
    await testGet('/api/v1/categories', 'Categories list');
    await testGet('/api/v1/suppliers', 'Suppliers list');
    await testGet('/api/v1/orders', 'Purchase orders list');
    await testGet('/api/v1/stock-movements', 'Stock movements list');
    await testGet('/api/v1/activity-logs', 'Activity logs (MongoDB)');

    console.log('\nAll API endpoint tests completed successfully!');
  } catch (err) {
    console.error('API Test failure:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
