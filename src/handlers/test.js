export async function TestHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (path === '/api/test/d1-connection' && method === 'GET') {
      return await testD1Connection(env);
    } else if (path === '/api/test/db-structure' && method === 'GET') {
      return await testDbStructure(env);
    } else if (path === '/api/test/users' && method === 'GET') {
      return await testUsers(env);
    } else if (path === '/api/test/password' && method === 'POST') {
      return await testPassword(request, env);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Test handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Test operation error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function testD1Connection(env) {
  try {
    // Test basic D1 connection
    const result = await env.DB.prepare('SELECT 1 as TestValue').first();
    
    if (result && result.TestValue === 1) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'D1 Connection successful!',
          testValue: result.TestValue,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'D1 Connection failed: Unexpected result',
          result: result
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('D1 connection test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'D1 Connection error', 
        error: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function testDbStructure(env) {
  try {
    // Check if Users table exists and get its structure
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    let usersTableInfo = null;
    if (tables.results && tables.results.some(t => t.name === 'Users')) {
      usersTableInfo = await env.DB.prepare("PRAGMA table_info(Users)").all();
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        tables: tables.results || [],
        usersTableInfo: usersTableInfo?.results || null,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('DB structure test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'DB structure test error', 
        error: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function testUsers(env) {
  try {
    // Get all users (without passwords)
    const users = await env.DB.prepare("SELECT CWID, FirstName, LastName, Email FROM Users").all();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        userCount: users.results?.length || 0,
        users: users.results || [],
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Users test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Users test error', 
        error: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function testPassword(request, env) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Find user by email
    const user = await env.DB.prepare('SELECT * FROM Users WHERE Email = ?').bind(email).first();
    
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User not found',
          email: email
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Import password utilities
    const { verifyPassword, hashPassword } = await import('../utils/password.js');
    
    // Test password verification
    const isValid = await verifyPassword(password, user.PasswordHash);
    
    // Test new password hashing
    const newHash = await hashPassword(password);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          cwid: user.CWID,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName
        },
        passwordVerification: {
          isValid: isValid,
          storedHash: user.PasswordHash,
          hashFormat: user.PasswordHash.includes(':') ? 'new' : 'legacy'
        },
        newHash: newHash,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Password test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Password test error', 
        error: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
