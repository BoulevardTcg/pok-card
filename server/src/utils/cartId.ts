/**
 * Utilitaires pour gérer les cartId anonymes
 * Le cartId est transmis via le header X-Cart-Id ou généré par le serveur
 */

import { Request, Response } from 'express';
import { randomBytes } from 'crypto';

const CART_ID_HEADER = 'x-cart-id';

/**
 * Génère un nouveau cartId
 */
export function generateCartId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Récupère le cartId depuis le header ou en génère un nouveau
 * Le nouveau cartId est renvoyé dans le header de réponse pour que le client le stocke
 */
export function getOrCreateCartId(req: Request, res: Response): string {
  // Vérifier d'abord dans le header
  let cartId = req.headers[CART_ID_HEADER] as string | undefined;

  // Si pas de cartId, en générer un nouveau et le mettre dans le header de réponse
  if (!cartId || !/^[a-f0-9]{32}$/.test(cartId)) {
    cartId = generateCartId();
    res.setHeader(CART_ID_HEADER, cartId);
  }

  return cartId;
}

/**
 * Génère un ownerKey à partir d'un userId ou cartId
 */
export function getOwnerKey(req: Request, res: Response): string {
  // Si l'utilisateur est connecté, utiliser son userId
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // Sinon, utiliser le cartId (généré si nécessaire)
  const cartId = getOrCreateCartId(req, res);
  return `cart:${cartId}`;
}
