import { generateJWT, verifyJWT } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export async function AuthHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (path === '/api/auth/register' && method === 'POST') {
      return await register(request, env);
    } else if (path === '/api/auth/login' && method === 'POST') {
      return await login(request, env);
    } else if (path === '/api/auth/me' && method === 'GET') {
      return await getCurrentUser(request, env);
    } else if (path === '/api/auth/change-password' && method === 'PUT') {
      return await changePassword(request, env);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Authentication error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function register(request, env) {
  const body = await request.json();
  const { firstName, lastName, email, cwid, password } = body;

  // Validate input
  if (!firstName || !lastName || !email || !cwid || !password) {
    return new Response(
      JSON.stringify({ error: 'All fields are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (cwid.length !== 8 || !/^\d{8}$/.test(cwid)) {
    return new Response(
      JSON.stringify({ error: 'CWID must be exactly 8 digits' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: 'Password must be at least 8 characters long' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check if user already exists
    const existingUser = await env.DB.prepare(
      'SELECT * FROM Users WHERE Email = ? OR CWID = ?'
    ).bind(email, cwid).first();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User with this email or CWID already exists' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await env.DB.prepare(
      'INSERT INTO Users (CWID, FirstName, LastName, Email, PasswordHash) VALUES (?, ?, ?, ?, ?)'
    ).bind(cwid, firstName, lastName, email, passwordHash).run();

    if (result.success) {
      // Generate JWT token
      const user = { cwid, firstName, lastName, email };
      const token = generateJWT(user, env);

      return new Response(
        JSON.stringify({
          token,
          user,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Failed to create user');
    }
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ error: 'Registration failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function login(request, env) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Find user by email
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE Email = ?'
    ).bind(email).first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.PasswordHash);
    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    const userData = {
      cwid: user.CWID,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email
    };
    const token = generateJWT(userData, env);

    return new Response(
      JSON.stringify({
        token,
        user: userData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Login failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getCurrentUser(request, env) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization token required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);

    if (!decoded) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user from database
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE CWID = ?'
    ).bind(decoded.cwid).first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get notes count
    const notesCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM Notes WHERE AuthorId = ?'
    ).bind(decoded.cwid).first();

    const userData = {
      cwid: user.CWID,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      notesCount: notesCount.count || 0
    };

    return new Response(
      JSON.stringify(userData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get user', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function changePassword(request, env) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization token required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);

    if (!decoded) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Current password and new password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 6 characters long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user from database
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE CWID = ?'
    ).bind(decoded.cwid).first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.PasswordHash);
    if (!isCurrentPasswordValid) {
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    const result = await env.DB.prepare(
      'UPDATE Users SET PasswordHash = ? WHERE CWID = ?'
    ).bind(hashedNewPassword, decoded.cwid).run();

    if (result.success) {
      return new Response(
        JSON.stringify({ message: 'Password changed successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Failed to update password');
    }
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to change password', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
