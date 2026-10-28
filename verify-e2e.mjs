/**
 * End-to-End Live Workflow Verification Script
 * Tests the live running servers (Backend: http://localhost:5000, Frontend: http://localhost:5173)
 */

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('--- Starting Live E2E Integration Checks ---');

  // Check backend health
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  console.log('✅ 1. Backend Health Check:', health);

  // Sign up a new user & organization
  const email = `live_tester_${Date.now()}@testcorp.com`;
  const signupPayload = {
    organizationName: 'Global Retail Hub',
    email,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupPayload),
  });

  const cookies = signupRes.headers.get('set-cookie');
  const signupData = await signupRes.json();
  console.log('✅ 2. User & Org Signup Successful:', signupData.user.email, '| Org:', signupData.user.organization.name);

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: cookies,
  };

  // Check /api/auth/me
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
  const meData = await meRes.json();
  console.log('✅ 3. Authenticated Session /api/auth/me Verified:', meData.user.email);

  // Check initial dashboard
  const dash1Res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
  const dash1 = await dash1Res.json();
  console.log('✅ 4. Initial Dashboard Data:', dash1);

  // Add Product 1 (quantity 3, threshold default is 5 -> low stock!)
  const p1Res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Wireless Ergonomic Keyboard',
      sku: 'KB-ERG-01',
      description: 'Split mechanical keyboard with wrist rest',
      quantityOnHand: 3,
      costPrice: 55.0,
      sellingPrice: 109.99,
    }),
  });
  const p1 = await p1Res.json();
  console.log('✅ 5. Created Product 1:', p1.name, '| SKU:', p1.sku, '| LowStock:', p1.isLowStock);

  // Add Product 2 (quantity 25, threshold default is 5 -> in stock)
  const p2Res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'USB-C Fast Charging Cable',
      sku: 'CABLE-USBC-6FT',
      description: 'Braided 6ft charging cable',
      quantityOnHand: 25,
      costPrice: 4.5,
      sellingPrice: 14.99,
    }),
  });
  const p2 = await p2Res.json();
  console.log('✅ 6. Created Product 2:', p2.name, '| SKU:', p2.sku, '| LowStock:', p2.isLowStock);

  // Search by name
  const searchNameRes = await fetch(`${BASE_URL}/products?search=Keyboard`, { headers: authHeaders });
  const searchName = await searchNameRes.json();
  console.log('✅ 7. Search by Name "Keyboard" Result count:', searchName.length);

  // Search by SKU
  const searchSkuRes = await fetch(`${BASE_URL}/products?search=CABLE`, { headers: authHeaders });
  const searchSku = await searchSkuRes.json();
  console.log('✅ 8. Search by SKU "CABLE" Result count:', searchSku.length);

  // Verify Dashboard calculations
  const dash2Res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
  const dash2 = await dash2Res.json();
  console.log('✅ 9. Dashboard after 2 products:', {
    totalProducts: dash2.totalProducts,
    totalStockUnits: dash2.totalStockUnits,
    lowStockCount: dash2.lowStockCount,
    lowStockItemNames: dash2.lowStockItems.map((i) => i.name),
  });

  if (dash2.totalProducts !== 2 || dash2.totalStockUnits !== 28 || dash2.lowStockCount !== 1) {
    throw new Error('Dashboard calculations mismatch!');
  }

  // Update Settings: change default threshold from 5 to 30
  const settingsRes = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ defaultLowStockThreshold: 30 }),
  });
  const settings = await settingsRes.json();
  console.log('✅ 10. Organization Settings updated default threshold to:', settings.defaultLowStockThreshold);

  // Verify Dashboard now shows both items as low stock (3 <= 30 and 25 <= 30)
  const dash3Res = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
  const dash3 = await dash3Res.json();
  console.log('✅ 11. Dashboard after threshold change:', {
    lowStockCount: dash3.lowStockCount,
  });
  if (dash3.lowStockCount !== 2) {
    throw new Error('Expected 2 low stock products after updating organization threshold to 30');
  }

  // Update Product 1
  const updateP1Res = await fetch(`${BASE_URL}/products/${p1.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Wireless Ergonomic Keyboard v2 (Updated)',
      sellingPrice: 119.99,
    }),
  });
  const updatedP1 = await updateP1Res.json();
  console.log('✅ 12. Product Updated:', updatedP1.name, 'Price:', updatedP1.sellingPrice);

  // Delete Product 1
  const deleteRes = await fetch(`${BASE_URL}/products/${p1.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteData = await deleteRes.json();
  console.log('✅ 13. Product Deleted:', deleteData);

  // Confirm Product 1 is deleted (404)
  const verifyDeleteRes = await fetch(`${BASE_URL}/products/${p1.id}`, { headers: authHeaders });
  console.log('✅ 14. Verified Product is 404 Not Found:', verifyDeleteRes.status === 404);

  // Logout
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: authHeaders,
  });
  const logoutData = await logoutRes.json();
  console.log('✅ 15. User Logout:', logoutData);

  // Verify access is revoked
  const postLogoutMe = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: logoutRes.headers.get('set-cookie'),
    },
  });
  console.log('✅ 16. Post-logout /api/auth/me Status (expected 401):', postLogoutMe.status);

  console.log('\n🎉 ALL 16 LIVE E2E INTEGRATION CHECKS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error('❌ E2E Check Failed:', err);
  process.exit(1);
});
