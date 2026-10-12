import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super_secret_bugtracker_key_123'; 

export default function authMiddleware(req, res, next) {
  // 1. Extract token from header slot
  const token = req.header('x-auth-token');

  // 2. CRITICAL BLOCK: If no token exists, immediately stop request thread execution
  if (!token) {
    return res.status(401).json({ error: 'No security token found. Access denied.' });
  }

  // 3. Verify validation parameters
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; // Embed active database id target metadata
    return next(); // Proceed to protected endpoints safely
  } catch (error) {
    // CRITICAL BLOCK: Return early if the signature is forged or corrupted
    return res.status(401).json({ error: 'Invalid security token verification failed.' });
  }
}
