import { AuthHandler } from './handlers/auth.js';
import { NotesHandler } from './handlers/notes.js';
import { UsersHandler } from './handlers/users.js';
import { TestHandler } from './handlers/test.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      let response;

      // Route requests
      if (path.startsWith('/api/auth/')) {
        response = await AuthHandler(request, env);
      } else if (path.startsWith('/api/notes')) {
        response = await NotesHandler(request, env);
      } else if (path.startsWith('/api/users/')) {
        response = await UsersHandler(request, env);
      } else if (path.startsWith('/api/test/')) {
        response = await TestHandler(request, env);
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Worker error:', error);
      const errorResponse = new Response(
        JSON.stringify({ error: 'Internal Server Error', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });
      
      return errorResponse;
    }
  },
};
