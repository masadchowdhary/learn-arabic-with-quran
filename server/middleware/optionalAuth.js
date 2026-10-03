import jwt from 'jsonwebtoken';

/**
 * Optional auth: verifies the JWT only (no DB lookup) to keep public routes fast.
 * Routes that need the full user document must load it themselves and handle
 * the case where the user no longer exists.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = null;
    req.userId = decoded.userId || null;

    next();
  } catch (error) {
    // If token verification fails, still proceed as guest
    req.user = null;
    req.userId = null;
    next();
  }
};

export default optionalAuth;
