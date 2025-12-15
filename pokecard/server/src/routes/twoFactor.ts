import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth.js'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

const router = Router()
const prisma = new PrismaClient()

// Toutes les routes 2FA nécessitent une authentification
router.use(authenticateToken)

// Générer un secret 2FA et le QR code
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      })
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        error: '2FA déjà activé',
        code: '2FA_ALREADY_ENABLED'
      })
    }

    // Créer un nouveau secret TOTP
    const totp = new OTPAuth.TOTP({
      issuer: 'BoulevardTCG',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 })
    })

    const secret = totp.secret.base32

    // Stocker le secret temporairement (sera validé lors de la vérification)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    })

    // Générer le QR code
    const otpauthUrl = totp.toString()
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    res.json({
      secret,
      qrCode,
      message: 'Scannez le QR code avec votre application d\'authentification (Google Authenticator, Authy, etc.)'
    })
  } catch (error) {
    console.error('Erreur lors de la configuration 2FA:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Activer le 2FA (après vérification du code)
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        error: 'Code de vérification requis',
        code: 'CODE_REQUIRED'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        error: 'Configurez d\'abord le 2FA avec /api/2fa/setup',
        code: '2FA_NOT_CONFIGURED'
      })
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        error: '2FA déjà activé',
        code: '2FA_ALREADY_ENABLED'
      })
    }

    // Vérifier le code
    const totp = new OTPAuth.TOTP({
      issuer: 'BoulevardTCG',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret)
    })

    const isValid = totp.validate({ token: code, window: 1 }) !== null

    if (!isValid) {
      return res.status(400).json({
        error: 'Code invalide',
        code: 'INVALID_CODE'
      })
    }

    // Activer le 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    })

    res.json({
      message: '2FA activé avec succès',
      twoFactorEnabled: true
    })
  } catch (error) {
    console.error('Erreur lors de l\'activation 2FA:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Désactiver le 2FA
router.post('/disable', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId
    const { code, password } = req.body

    if (!code || !password) {
      return res.status(400).json({
        error: 'Code 2FA et mot de passe requis',
        code: 'CREDENTIALS_REQUIRED'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        error: '2FA non activé',
        code: '2FA_NOT_ENABLED'
      })
    }

    // Vérifier le mot de passe
    const bcrypt = await import('bcryptjs')
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Mot de passe incorrect',
        code: 'INVALID_PASSWORD'
      })
    }

    // Vérifier le code 2FA
    const totp = new OTPAuth.TOTP({
      issuer: 'BoulevardTCG',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret)
    })

    const isValid = totp.validate({ token: code, window: 1 }) !== null

    if (!isValid) {
      return res.status(400).json({
        error: 'Code 2FA invalide',
        code: 'INVALID_CODE'
      })
    }

    // Désactiver le 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    })

    res.json({
      message: '2FA désactivé avec succès',
      twoFactorEnabled: false
    })
  } catch (error) {
    console.error('Erreur lors de la désactivation 2FA:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Vérifier un code 2FA (utilisé lors du login)
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).json({
        error: 'Email et code requis',
        code: 'CREDENTIALS_REQUIRED'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        error: '2FA non activé pour cet utilisateur',
        code: '2FA_NOT_ENABLED'
      })
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'BoulevardTCG',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret)
    })

    const isValid = totp.validate({ token: code, window: 1 }) !== null

    if (!isValid) {
      return res.status(400).json({
        error: 'Code invalide',
        code: 'INVALID_CODE'
      })
    }

    res.json({
      valid: true,
      message: 'Code vérifié avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la vérification 2FA:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Obtenir le statut 2FA
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      })
    }

    res.json({
      twoFactorEnabled: user.twoFactorEnabled
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du statut 2FA:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

export default router

