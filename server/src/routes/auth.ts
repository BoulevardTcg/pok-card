import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../utils/auth.js';
import { authLimiter, strictAuthLimiter } from '../middleware/security.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();

// Configuration du reset de mot de passe
const PASSWORD_RESET_EXPIRY_HOURS = 1; // Token valide 1 heure

// Validation des données d'inscription
const registerValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage("Le nom d'utilisateur doit contenir entre 3 et 30 caractères")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores"
    ),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
    ),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le prénom doit contenir entre 1 et 50 caractères'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir entre 1 et 50 caractères'),
];

// Validation des données de connexion
const loginValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

// Inscription
router.post('/register', authLimiter, registerValidation, async (req: Request, res: Response) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array(),
      });
    }

    const { email, username, password, firstName, lastName } = req.body;

    // Vérifier si l'email existe déjà
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(409).json({
        error: 'Cet email est déjà utilisé',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(409).json({
        error: "Ce nom d'utilisateur est déjà utilisé",
        code: 'USERNAME_ALREADY_EXISTS',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: false,
        isVerified: true,
        createdAt: true,
      },
    });

    // Créer le profil utilisateur
    await prisma.userProfile.create({
      data: {
        userId: user.id,
      },
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user,
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Connexion
router.post('/login', authLimiter, loginValidation, async (req: Request, res: Response) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array(),
      });
    }

    const { email, password, twoFactorCode } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Vérifier si le 2FA est activé
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Si pas de code 2FA fourni, demander le code
      if (!twoFactorCode) {
        return res.status(200).json({
          requiresTwoFactor: true,
          message: 'Veuillez entrer votre code 2FA',
          email: user.email,
        });
      }

      // Vérifier le code 2FA
      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        issuer: 'BoulevardTCG',
        label: user.email,
        algorithm: 'SHA256', // Utilisation de SHA256 au lieu de SHA1 (plus sécurisé)
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
      });

      const isValid2FA = totp.validate({ token: twoFactorCode, window: 1 }) !== null;

      if (!isValid2FA) {
        return res.status(401).json({
          error: 'Code 2FA invalide',
          code: 'INVALID_2FA_CODE',
          requiresTwoFactor: true,
        });
      }
    }

    // Générer les tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    const refreshToken = await generateRefreshToken(user.id);

    // Récupérer le profil utilisateur
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    res.json({
      message: 'Connexion réussie',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        profile,
      },
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Rafraîchir le token d'accès
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Token de rafraîchissement requis',
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    // Vérifier le token de rafraîchissement
    const { verifyRefreshToken } = await import('../utils/auth.js');
    const payload = await verifyRefreshToken(refreshToken);

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    // Générer un nouveau token d'accès
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    res.json({
      accessToken: newAccessToken,
    });
  } catch {
    res.status(401).json({
      error: 'Token de rafraîchissement invalide',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
});

// Déconnexion
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({
      message: 'Déconnexion réussie',
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Déconnexion de tous les appareils
router.post('/logout-all', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const { verifyRefreshToken } = await import('../utils/auth.js');
      const payload = await verifyRefreshToken(refreshToken);
      await revokeAllUserTokens(payload.userId);
    }

    res.json({
      message: 'Déconnexion de tous les appareils réussie',
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Vérifier le token (route de test)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token requis',
        code: 'TOKEN_REQUIRED',
      });
    }

    const { verifyAccessToken } = await import('../utils/auth.js');
    const payload = verifyAccessToken(token);

    res.json({
      valid: true,
      user: payload,
    });
  } catch {
    res.status(401).json({
      valid: false,
      error: 'Token invalide',
    });
  }
});

// ============================================================================
// MOT DE PASSE OUBLIÉ
// ============================================================================

// Demander un reset de mot de passe
router.post(
  '/forgot-password',
  strictAuthLimiter, // Rate limit strict (3 req/heure)
  [body('email').isEmail().withMessage('Email invalide').normalizeEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Email invalide',
          details: errors.array(),
        });
      }

      const { email } = req.body;

      // Toujours répondre avec succès pour éviter l'énumération d'emails
      const successResponse = {
        message:
          'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.',
        code: 'EMAIL_SENT',
      };

      // Chercher l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true },
      });

      if (!user) {
        // Ne pas révéler que l'email n'existe pas
        return res.json(successResponse);
      }

      // Supprimer les anciens tokens de reset pour cet utilisateur
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Générer un token sécurisé
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Créer le token en base
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      // Construire l'URL de reset avec FRONTEND_PUBLIC_URL (URL accessible par le navigateur)
      const baseUrl = (
        process.env.FRONTEND_PUBLIC_URL ||
        process.env.FRONTEND_URL ||
        'http://localhost:3000'
      ).replace(/\/$/, '');
      const resetUrlObj = new URL(`${baseUrl}/reset-password`);
      resetUrlObj.searchParams.set('token', resetToken);
      resetUrlObj.searchParams.set('email', email);
      const resetUrl = resetUrlObj.toString();

      await sendPasswordResetEmail({
        email: user.email,
        name: user.firstName,
        resetUrl,
        expiresIn: `${PASSWORD_RESET_EXPIRY_HOURS} heure${PASSWORD_RESET_EXPIRY_HOURS > 1 ? 's' : ''}`,
      });

      res.json(successResponse);
    } catch {
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Réinitialiser le mot de passe avec le token
router.post(
  '/reset-password',
  strictAuthLimiter,
  [
    body('token').notEmpty().withMessage('Token requis'),
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
      ),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array(),
        });
      }

      const { token, email, password } = req.body;

      // Hasher le token pour le comparer avec celui en base
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Chercher le token en base
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: hashedToken,
          usedAt: null, // Non utilisé
          expiresAt: { gt: new Date() }, // Non expiré
          user: { email },
        },
        include: { user: true },
      });

      if (!resetToken) {
        return res.status(400).json({
          error: 'Le lien de réinitialisation est invalide ou a expiré',
          code: 'INVALID_OR_EXPIRED_TOKEN',
        });
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await hashPassword(password);

      // Transaction : mettre à jour le mot de passe et marquer le token comme utilisé
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
        // Révoquer tous les refresh tokens pour forcer une reconnexion
        prisma.refreshToken.deleteMany({
          where: { userId: resetToken.userId },
        }),
      ]);

      // Supprimer tous les tokens de reset pour cet utilisateur
      await prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      });

      res.json({
        message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        code: 'PASSWORD_RESET_SUCCESS',
      });
    } catch {
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

export default router;
