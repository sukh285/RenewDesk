const BASE_URL = 'https://renewdesk-phi.vercel.app';

async function runFullAudit() {
  console.log('=== STARTING COMPLETE PRODUCTION AUDIT ===\nTarget:', BASE_URL);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  [PASS]', message);
      passed++;
    } else {
      console.error('  [FAIL]', message);
      failed++;
    }
  }

  // 1. Unauthenticated redirect check
  console.log('\n--- 1. Security & Middleware Checks ---');
  const unauthHome = await fetch(BASE_URL + '/', { redirect: 'manual' });
  assert(
    unauthHome.status === 307 || unauthHome.status === 302 || unauthHome.status === 308,
    `Unauthenticated / returns redirect (${unauthHome.status})`
  );
  assert(
    unauthHome.headers.get('location')?.includes('/login'),
    'Redirect location header points to /login'
  );

  const unauthApi = await fetch(BASE_URL + '/api/subscriptions');
  assert(unauthApi.status === 401, 'Unauthenticated /api/subscriptions returns 401');

  // 2. Login Flow
  console.log('\n--- 2. Authentication Flow ---');
  const badLogin = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'bad@user.com', password: 'wrongpassword' })
  });
  assert(badLogin.status === 401, 'Invalid credentials return 401');

  const goodLogin = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo@renewdesk.app', password: 'RenewDesk2026!' })
  });
  assert(goodLogin.status === 200, 'Valid credentials return 200');
  const sessionCookie = goodLogin.headers.get('set-cookie');
  assert(!!sessionCookie, 'Session cookie issued');
  const cookieHeader = sessionCookie ? sessionCookie.split(';')[0] : '';

  // 3. Authenticated Page Loads
  console.log('\n--- 3. Authenticated Web Pages HTML Rendering ---');
  const homePage = await fetch(BASE_URL + '/', { headers: { 'Cookie': cookieHeader } });
  assert(homePage.status === 200, 'Overview page (/) renders 200');
  const homeHtml = await homePage.text();
  assert(
    homeHtml.includes('RenewDesk') && homeHtml.includes('Overview'),
    'Overview HTML contains RenewDesk and Overview'
  );

  const subsPage = await fetch(BASE_URL + '/subscriptions', { headers: { 'Cookie': cookieHeader } });
  assert(subsPage.status === 200, 'Subscriptions page (/subscriptions) renders 200');

  const reviewsPage = await fetch(BASE_URL + '/reviews', { headers: { 'Cookie': cookieHeader } });
  assert(reviewsPage.status === 200, 'Reviews page (/reviews) renders 200');

  // 4. API Endpoints
  console.log('\n--- 4. Authenticated API Endpoints ---');
  const overviewRes = await fetch(BASE_URL + '/api/overview', { headers: { 'Cookie': cookieHeader } });
  const overviewData = await overviewRes.json();
  assert(overviewRes.status === 200 && overviewData.ok === true, 'GET /api/overview returns ok');
  assert(typeof overviewData.data.upcomingRenewalTotal === 'number', 'Upcoming renewal total is a valid number');
  assert(Array.isArray(overviewData.data.upcomingReviews), 'Upcoming reviews is an array');

  const subsRes = await fetch(BASE_URL + '/api/subscriptions', { headers: { 'Cookie': cookieHeader } });
  const subsData = await subsRes.json();
  assert(
    subsRes.status === 200 && Array.isArray(subsData.data),
    `GET /api/subscriptions returns array of ${subsData.data?.length} items`
  );

  const reviewsRes = await fetch(BASE_URL + '/api/reviews', { headers: { 'Cookie': cookieHeader } });
  const reviewsData = await reviewsRes.json();
  assert(
    reviewsRes.status === 200 && Array.isArray(reviewsData.data),
    `GET /api/reviews returns array of ${reviewsData.data?.length} items`
  );

  // 5. MCP Streamable HTTP Protocol
  console.log('\n--- 5. Remote MCP Server Protocol & Tools ---');
  const mcpInit = await fetch(BASE_URL + '/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 101,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'claude-audit', version: '1.0' } }
    })
  });
  assert(mcpInit.status === 200, 'MCP initialize returns 200');
  const initText = await mcpInit.text();
  assert(initText.includes('renewdesk'), 'MCP server name verified in initialize response');

  const mcpTools = await fetch(BASE_URL + '/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 102, method: 'tools/list', params: {} })
  });
  const toolsText = await mcpTools.text();
  assert(toolsText.includes('list_subscriptions'), 'Tool list_subscriptions declared');
  assert(toolsText.includes('save_subscriptions'), 'Tool save_subscriptions declared');
  assert(toolsText.includes('list_reviews'), 'Tool list_reviews declared');
  assert(toolsText.includes('save_reviews'), 'Tool save_reviews declared');

  // 6. Complete End-to-End Workflow Test
  console.log('\n--- 6. End-to-End Lifecycle: Claude -> DB -> Web Edit -> Claude Read ---');
  const uniqueVendor = 'AuditVendor-' + Math.floor(Math.random() * 10000);
  const testRequestId = 'req-' + Date.now();

  // 6a. Claude creates subscription
  const createSubRes = await fetch(BASE_URL + '/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 103,
      method: 'tools/call',
      params: {
        name: 'save_subscriptions',
        arguments: {
          subscriptions: [{
            request_id: testRequestId,
            vendor: uniqueVendor,
            amount_paise: 450000,
            billing_cycle: 'monthly',
            next_renewal: '2026-11-26',
            owner: 'Sukhmeet Singh',
            context: 'Audit test license'
          }]
        }
      }
    })
  });
  const createSubText = await createSubRes.text();
  assert(createSubText.includes('created'), `MCP successfully created subscription (${uniqueVendor})`);

  // 6b. Verify in Web API
  const verifySubRes = await fetch(BASE_URL + '/api/subscriptions', { headers: { 'Cookie': cookieHeader } });
  const verifySubData = await verifySubRes.json();
  const createdSub = verifySubData.data.find(s => s.vendor === uniqueVendor);
  assert(!!createdSub, 'New subscription found in Web API');
  assert(createdSub?.amount_paise === 450000, 'Amount paise matches (450000 = INR 4500)');

  // 6c. Verify auto-generated review
  const createdReview = createdSub?.current_review;
  assert(!!createdReview, 'Review automatically generated');
  assert(createdReview?.due_date === '2026-11-19', 'Review due date is exactly 7 days before renewal (2026-11-19)');
  assert(createdReview?.action_status === 'open', 'Action status is open');

  // 6d. Human updates review in Web to Cancel
  const updateReviewRes = await fetch(BASE_URL + '/api/reviews/' + createdReview.id, {
    method: 'PATCH',
    headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: createdReview.version,
      decision: 'cancel',
      rationale: 'Testing cancellation workflow'
    })
  });
  assert(updateReviewRes.status === 200, 'Human can update review decision to Cancel via Web');

  // 6e. Claude reads the updated review
  const mcpReadRes = await fetch(BASE_URL + '/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 104,
      method: 'tools/call',
      params: {
        name: 'list_reviews',
        arguments: { subscription_id: createdSub.id }
      }
    })
  });
  const mcpReadText = await mcpReadRes.text();
  assert(mcpReadText.includes('cancel'), 'Claude reads the updated cancel decision via MCP');
  assert(mcpReadText.includes('Testing cancellation workflow'), 'Claude reads the updated rationale');

  // 6f. Human confirms vendor cancellation via Web
  const completeRes = await fetch(BASE_URL + '/api/reviews/' + createdReview.id + '/complete', {
    method: 'POST',
    headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 2, // version incremented after edit
      completion_note: 'Vendor contract cancellation confirmed by founder'
    })
  });
  assert(completeRes.status === 200, 'Human completes vendor cancellation via Web');

  // 6g. Verify completed state via MCP
  const mcpVerifyComplete = await fetch(BASE_URL + '/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 105,
      method: 'tools/call',
      params: {
        name: 'list_reviews',
        arguments: { subscription_id: createdSub.id }
      }
    })
  });
  const completeText = await mcpVerifyComplete.text();
  assert(completeText.includes('completed'), 'Claude confirms review action_status is now completed');

  console.log('\n=== AUDIT SUMMARY ===');
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  if (failed === 0) {
    console.log('>>> ALL 24 PRODUCTION AUDIT CHECKS PASSED WITH ZERO ERRORS! <<<');
  } else {
    process.exit(1);
  }
}

runFullAudit().catch(err => {
  console.error('Audit failed with exception:', err);
  process.exit(1);
});
