import jwt, { type SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface JWTPayload {
  userId: string
  email: string
  username: string
  isAdmin: boolean
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
}

// Hashage du mot de passe
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Vérification du mot de passe
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

// Génération du token JWT d'accès
export const generateAccessToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }
  
  return (jwt as any).sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' })
}

// Génération du token JWT de rafraîchissement
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined')
  }

  // Supprimer les anciens tokens de rafraîchissement
  await prisma.refreshToken.deleteMany({
    where: { userId }
  })

  // Créer un nouveau token de rafraîchissement
  const refreshToken = (jwt as any).sign(
    { userId, tokenId: Date.now().toString() } as RefreshTokenPayload,
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )

  // Sauvegarder le token en base
  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
    }
  })

  return refreshToken
}

// Vérification du token JWT d'accès
export const verifyAccessToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }

  try {
    return jwt.verify(token, secret) as JWTPayload
  } catch (error) {
    throw new Error('Invalid access token')
  }
}

// Vérification du token JWT de rafraîchissement
export const verifyRefreshToken = async (token: string): Promise<RefreshTokenPayload> => {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined')
  }

  try {
    const payload = jwt.verify(token, secret) as RefreshTokenPayload
    
    // Vérifier que le token existe en base et n'est pas expiré
    const dbToken = await prisma.refreshToken.findFirst({
      where: { 
        userId: payload.userId,
        token: token,
        expiresAt: { gt: new Date() }
      }
    })

    if (!dbToken) {
      throw new Error('Refresh token not found or expired')
    }

    return payload
  } catch (error) {
    throw new Error('Invalid refresh token')
  }
}

// Révocation d'un token de rafraîchissement
export const revokeRefreshToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { token }
  })
}

// Révocation de tous les tokens d'un utilisateur
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { userId }
  })
}
