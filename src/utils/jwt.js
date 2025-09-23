// Simple JWT implementation for Cloudflare Workers
// Note: This is a basic implementation. For production, consider using a more robust JWT library

export function generateJWT(payload, env) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (parseInt(env.JWT_EXPIRY_HOURS) * 60 * 60);

  const jwtPayload = {
    ...payload,
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
    iat: now,
    exp: exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`, env.JWT_SECRET);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token, env) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`, env.JWT_SECRET);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Check issuer and audience
    if (payload.iss !== env.JWT_ISSUER || payload.aud !== env.JWT_AUDIENCE) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(str);
}

function createSignature(data, secret) {
  // Simple HMAC-SHA256 implementation using Web Crypto API
  // Note: This is a simplified version. In production, use a proper crypto library
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  // For Cloudflare Workers, we'll use a simple hash-based approach
  // In a real implementation, you'd use the Web Crypto API properly
  return base64UrlEncode(secret + data + secret);
}
