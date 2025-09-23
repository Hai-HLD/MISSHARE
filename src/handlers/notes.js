import { verifyJWT } from '../utils/jwt.js';

export async function NotesHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (path === '/api/notes' && method === 'GET') {
      return await getNotes(request, env);
    } else if (path.startsWith('/api/notes/') && method === 'GET') {
      const id = path.split('/')[3];
      return await getNote(id, env);
    } else if (path === '/api/notes' && method === 'POST') {
      return await createNote(request, env);
    } else if (path.startsWith('/api/notes/') && method === 'PUT') {
      const id = path.split('/')[3];
      return await updateNote(id, request, env);
    } else if (path.startsWith('/api/notes/') && method === 'DELETE') {
      const id = path.split('/')[3];
      return await deleteNote(id, request, env);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Notes handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Notes operation error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getNotes(request, env) {
  console.log('getNotes called with URL:', request.url);
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  console.log('Search params:', Object.fromEntries(searchParams.entries()));

  // Build query with filters
  let query = `
    SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
           u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
    FROM Notes n 
    INNER JOIN Users u ON n.AuthorId = u.CWID
  `;

  const conditions = [];
  const params = [];

  // Apply filters
  if (searchParams.get('title')) {
    conditions.push('LOWER(n.Title) LIKE LOWER(?)');
    params.push(`%${searchParams.get('title')}%`);
  }

  if (searchParams.get('topic')) {
    conditions.push('LOWER(n.Topic) = LOWER(?)');
    params.push(searchParams.get('topic'));
  }

  if (searchParams.get('class')) {
    conditions.push('LOWER(n.Class) = LOWER(?)');
    params.push(searchParams.get('class'));
  }

  if (searchParams.get('year')) {
    conditions.push('n.Year = ?');
    params.push(parseInt(searchParams.get('year')));
  }

  if (searchParams.get('author')) {
    conditions.push('LOWER(u.FirstName || " " || u.LastName) LIKE LOWER(?)');
    params.push(`%${searchParams.get('author')}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Add ordering
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  query += ` ORDER BY n.${sortBy} ${sortOrder.toUpperCase()}`;

  // Add pagination
  const page = parseInt(searchParams.get('page')) || 1;
  const pageSize = parseInt(searchParams.get('pageSize')) || 10;
  const offset = (page - 1) * pageSize;
  query += ` LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  try {
    const notes = await env.DB.prepare(query).bind(...params).all();

    // Debug logging
    console.log('Notes query result:', notes);
    console.log('Notes results:', notes.results);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM Notes n INNER JOIN Users u ON n.AuthorId = u.CWID';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

    console.log('getNotes - Raw notes result:', notes);
    console.log('getNotes - Notes results:', notes.results);
    console.log('getNotes - Count result:', countResult);

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
    console.error('Get notes error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get notes', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getNote(id, env) {
  try {
    console.log('Getting note with ID:', id);
    
    const note = await env.DB.prepare(`
      SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
             u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
      FROM Notes n 
      INNER JOIN Users u ON n.AuthorId = u.CWID
      WHERE n.Id = ?
    `).bind(id).first();

    console.log('Note query result:', note);

    if (!note) {
      return new Response(
        JSON.stringify({ error: 'Note not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(note),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get note error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get note', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function createNote(request, env) {
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
    const { title, class: noteClass, topic, year, content } = body;

    if (!title || !noteClass || !topic || !year || !content) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await env.DB.prepare(`
      INSERT INTO Notes (AuthorId, Title, Class, Topic, Year, Content, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(decoded.cwid, title, noteClass, topic, year, content, new Date().toISOString()).run();

    if (result.success) {
      // Get the created note with author information
      const createdNote = await env.DB.prepare(`
        SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
               u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
        FROM Notes n 
        INNER JOIN Users u ON n.AuthorId = u.CWID
        WHERE n.Id = ?
      `).bind(result.meta.last_row_id).first();

      return new Response(
        JSON.stringify(createdNote),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Failed to create note');
    }
  } catch (error) {
    console.error('Create note error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create note', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function updateNote(id, request, env) {
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

    // Check if note exists and user owns it
    const existingNote = await env.DB.prepare(
      'SELECT AuthorId FROM Notes WHERE Id = ?'
    ).bind(id).first();

    if (!existingNote) {
      return new Response(
        JSON.stringify({ error: 'Note not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingNote.AuthorId !== decoded.cwid) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to update this note' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { title, class: noteClass, topic, year, content } = body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (title) {
      updates.push('Title = ?');
      params.push(title);
    }
    if (noteClass) {
      updates.push('Class = ?');
      params.push(noteClass);
    }
    if (topic) {
      updates.push('Topic = ?');
      params.push(topic);
    }
    if (year) {
      updates.push('Year = ?');
      params.push(year);
    }
    if (content) {
      updates.push('Content = ?');
      params.push(content);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    params.push(id);
    const query = `UPDATE Notes SET ${updates.join(', ')} WHERE Id = ?`;
    
    const result = await env.DB.prepare(query).bind(...params).run();

    if (result.success) {
      // Get updated note
      const updatedNote = await env.DB.prepare(`
        SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
               u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
        FROM Notes n 
        INNER JOIN Users u ON n.AuthorId = u.CWID
        WHERE n.Id = ?
      `).bind(id).first();

      return new Response(
        JSON.stringify(updatedNote),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Failed to update note');
    }
  } catch (error) {
    console.error('Update note error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update note', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function deleteNote(id, request, env) {
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

    // Check if note exists and user owns it
    const existingNote = await env.DB.prepare(
      'SELECT AuthorId FROM Notes WHERE Id = ?'
    ).bind(id).first();

    if (!existingNote) {
      return new Response(
        JSON.stringify({ error: 'Note not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingNote.AuthorId !== decoded.cwid) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to delete this note' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await env.DB.prepare('DELETE FROM Notes WHERE Id = ?').bind(id).run();

    if (result.success) {
      return new Response(null, { status: 204 });
    } else {
      throw new Error('Failed to delete note');
    }
  } catch (error) {
    console.error('Delete note error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete note', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
