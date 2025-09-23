import { verifyJWT } from '../utils/jwt.js';

export async function UsersHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (path.match(/^\/api\/users\/[^\/]+$/) && method === 'GET') {
      const cwid = path.split('/')[3];
      return await getUser(cwid, env);
    } else if (path === '/api/users/profile' && method === 'PUT') {
      return await updateProfile(request, env);
    } else if (path.match(/^\/api\/users\/[^\/]+\/notes$/) && method === 'GET') {
      const cwid = path.split('/')[3];
      return await getUserNotes(cwid, request, env);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Users handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Users operation error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getUser(cwid, env) {
  try {
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE CWID = ?'
    ).bind(cwid).first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get notes count
    const notesCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM Notes WHERE AuthorId = ?'
    ).bind(cwid).first();

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
    console.error('Get user error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get user', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function updateProfile(request, env) {
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
    const { firstName, lastName } = body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (firstName) {
      updates.push('FirstName = ?');
      params.push(firstName);
    }
    if (lastName) {
      updates.push('LastName = ?');
      params.push(lastName);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    params.push(decoded.cwid);
    const query = `UPDATE Users SET ${updates.join(', ')} WHERE CWID = ?`;
    
    const result = await env.DB.prepare(query).bind(...params).run();

    if (result.success) {
      // Get updated user
      const updatedUser = await env.DB.prepare(
        'SELECT * FROM Users WHERE CWID = ?'
      ).bind(decoded.cwid).first();

      // Get notes count
      const notesCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM Notes WHERE AuthorId = ?'
      ).bind(decoded.cwid).first();

      const userData = {
        cwid: updatedUser.CWID,
        firstName: updatedUser.FirstName,
        lastName: updatedUser.LastName,
        email: updatedUser.Email,
        notesCount: notesCount.count || 0
      };

      return new Response(
        JSON.stringify(userData),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Failed to update profile');
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update profile', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getUserNotes(cwid, request, env) {
  try {
    console.log('getUserNotes called for CWID:', cwid);
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    console.log('getUserNotes search params:', Object.fromEntries(searchParams.entries()));

    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10;
    const offset = (page - 1) * pageSize;

    // Check if user exists
    const user = await env.DB.prepare(
      'SELECT * FROM Users WHERE CWID = ?'
    ).bind(cwid).first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's notes
    const notes = await env.DB.prepare(`
      SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
             u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
      FROM Notes n 
      INNER JOIN Users u ON n.AuthorId = u.CWID
      WHERE n.AuthorId = ?
      ORDER BY n.CreatedAt DESC
      LIMIT ? OFFSET ?
    `).bind(cwid, pageSize, offset).all();


    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM Notes WHERE AuthorId = ?'
    ).bind(cwid).first();

    console.log('getUserNotes - Raw notes result:', notes);
    console.log('getUserNotes - Notes results:', notes.results);
    console.log('getUserNotes - Count result:', countResult);

    const response = new Response(
      JSON.stringify(notes.results || []),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

    // Add pagination headers
    response.headers.set('X-Total-Count', countResult.total.toString());
    response.headers.set('X-Page', page.toString());
    response.headers.set('X-Page-Size', pageSize.toString());

    return response;
  } catch (error) {
    console.error('Get user notes error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get user notes', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
