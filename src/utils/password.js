// Password hashing utilities for Cloudflare Workers
// Simplified approach for debugging

export async function hashPassword(password) {
  // Use a simple but consistent approach
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Use SHA-256 for now (simple and consistent)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export async function verifyPassword(password, hash) {
  try {
    // Hash the provided password the same way
    const hashedPassword = await hashPassword(password);
    
    // Compare the hashes
    const isValid = hashedPassword === hash;
    
    return isValid;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
