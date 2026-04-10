import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

/** Normalise une clé PEM : remplace les littéraux \\n par de vrais retours à la ligne
 *  (nécessaire quand Docker env_file ne convertit pas les \\n). */
function normalizePem(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
  /** Pour affichage navbar (Marketplace, etc.) */
  firstName?: string;
  /** Pour requireRole() côté Marketplace */
  roles?: string[];
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

// Hashage du mot de passe
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Vérification du mot de passe
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Génération du token JWT d'accès (RS256 si JWT_PRIVATE_KEY, sinon HS256 avec JWT_SECRET)
export const generateAccessToken = (payload: JWTPayload): string => {
  const privateKey = normalizePem(process.env.JWT_PRIVATE_KEY);
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

  if (privateKey) {
    return (jwt as any).sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn,
    });
  }
  if (secret) {
    return (jwt as any).sign(payload, secret, { expiresIn });
  }
  throw new Error('JWT_PRIVATE_KEY or JWT_SECRET is required');
};

// Génération du token JWT de rafraîchissement
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  // Supprimer les anciens tokens de rafraîchissement
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  // Créer un nouveau token de rafraîchissement
  const refreshToken = (jwt as any).sign(
    { userId, tokenId: Date.now().toString() } as RefreshTokenPayload,
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  // Sauvegarder le token en base
  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    },
  });

  return refreshToken;
};

// Vérification du token JWT d'accès. Si JWT_PUBLIC_KEY présent → UNIQUEMENT RS256 (pas de fallback HS256).
export const verifyAccessToken = (token: string): JWTPayload => {
  const publicKey = normalizePem(process.env.JWT_PUBLIC_KEY);
  const secret = process.env.JWT_SECRET;

  try {
    if (publicKey) {
      return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JWTPayload;
    }
    if (secret) {
      return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
    }
    throw new Error('JWT_PUBLIC_KEY or JWT_SECRET is required');
  } catch {
    throw new Error('Invalid access token');
  }
};

// Vérification du token JWT de rafraîchissement
export const verifyRefreshToken = async (token: string): Promise<RefreshTokenPayload> => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  try {
    const payload = jwt.verify(token, secret) as RefreshTokenPayload;

    // Vérifier que le token existe en base et n'est pas expiré
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.userId,
        token: token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!dbToken) {
      throw new Error('Refresh token not found or expired');
    }

    return payload;
  } catch {
    throw new Error('Invalid refresh token');
  }
};

// Révocation d'un token de rafraîchissement
export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
};

// Révocation de tous les tokens d'un utilisateur
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};
