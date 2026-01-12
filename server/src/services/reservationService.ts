/**
 * Service de gestion des réservations de panier
 *
 * Ce service gère les réservations temporaires de stock lorsqu'un article est ajouté au panier.
 * Les réservations expirent après un délai (par défaut 15 minutes) pour libérer le stock.
 *
 * Principe de concurrence :
 * - Toutes les opérations critiques sont transactionnelles (Prisma $transaction)
 * - Le stock disponible = stock_total - réservations_actives
 * - Une réservation active a expiresAt > now()
 * - Les réservations sont liées à un ownerKey (format: "user:userId" ou "cart:cartId")
 */

import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';

const DEFAULT_TTL_MINUTES = 15;

/**
 * Calcule la quantité totale réservée (active) pour une variante
 */
export async function getActiveReservedQty(
  variantId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx || prisma;
  const now = new Date();

  const result = await client.cartReservation.aggregate({
    where: {
      variantId,
      expiresAt: {
        gt: now,
      },
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity || 0;
}

/**
 * Récupère une réservation existante pour un ownerKey et variantId
 */
async function getExistingReservation(
  variantId: string,
  ownerKey: string,
  tx: Prisma.TransactionClient
) {
  return tx.cartReservation.findUnique({
    where: {
      variantId_ownerKey: {
        variantId,
        ownerKey,
      },
    },
  });
}

/**
 * Réserve une quantité de stock pour un ownerKey
 *
 * Logique transactionnelle :
 * 1. Récupère la variante et vérifie le stock total
 * 2. Calcule les réservations actives (hors celle de l'owner actuel)
 * 3. Vérifie que stock_disponible >= quantité_demandée
 * 4. Crée ou met à jour la réservation avec prolongation de l'expiration
 *
 * @param variantId ID de la variante
 * @param ownerKey Clé du propriétaire (format: "user:xxx" ou "cart:xxx")
 * @param quantity Quantité à réserver
 * @param ttlMinutes Durée de vie en minutes (défaut: 15)
 * @returns La réservation créée/mise à jour
 * @throws Erreur si stock insuffisant
 */
export async function reserve(
  variantId: string,
  ownerKey: string,
  quantity: number,
  ttlMinutes: number = DEFAULT_TTL_MINUTES
) {
  if (quantity <= 0) {
    throw new Error('La quantité doit être supérieure à 0');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Récupérer la variante
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new Error(`Variante introuvable: ${variantId}`);
    }

    if (!variant.isActive) {
      throw new Error(`La variante ${variantId} n'est plus active`);
    }

    // 2. Récupérer la réservation existante (si elle existe)
    const existingReservation = await getExistingReservation(variantId, ownerKey, tx);
    const currentReservedQty = existingReservation?.quantity || 0;
    const quantityDelta = quantity - currentReservedQty;

    // 3. Calculer le total des réservations actives (hors celle de l'owner actuel)
    const now = new Date();
    const totalReserved = await tx.cartReservation.aggregate({
      where: {
        variantId,
        expiresAt: { gt: now },
        NOT: {
          ownerKey, // Exclure la réservation actuelle de l'owner
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const totalReservedQty = totalReserved._sum.quantity || 0;

    // 4. Vérifier le stock disponible
    const availableStock = variant.stock - totalReservedQty;
    const requiredStock = quantityDelta > 0 ? quantityDelta : 0;

    if (availableStock < requiredStock) {
      const error: any = new Error(
        `Stock insuffisant. Disponible: ${availableStock}, Demandé: ${requiredStock}`
      );
      error.code = 'OUT_OF_STOCK';
      error.available = availableStock;
      error.requested = requiredStock;
      throw error;
    }

    // 5. Calculer la nouvelle date d'expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    // 6. Créer ou mettre à jour la réservation (upsert)
    const reservation = await tx.cartReservation.upsert({
      where: {
        variantId_ownerKey: {
          variantId,
          ownerKey,
        },
      },
      create: {
        variantId,
        ownerKey,
        quantity,
        expiresAt,
      },
      update: {
        quantity,
        expiresAt, // Prolonge toujours l'expiration
      },
    });

    return reservation;
  });
}

/**
 * Libère une quantité de réservation (ou supprime si quantity = 0 ou undefined)
 */
export async function release(variantId: string, ownerKey: string, quantity?: number) {
  return prisma.$transaction(async (tx) => {
    const reservation = await getExistingReservation(variantId, ownerKey, tx);

    if (!reservation) {
      // Pas de réservation, rien à faire
      return null;
    }

    // Si quantity n'est pas spécifiée ou si elle est >= à la quantité réservée, supprimer
    if (quantity === undefined || quantity >= reservation.quantity) {
      await tx.cartReservation.delete({
        where: {
          id: reservation.id,
        },
      });
      return null;
    }

    // Sinon, diminuer la quantité
    if (quantity <= 0) {
      await tx.cartReservation.delete({
        where: { id: reservation.id },
      });
      return null;
    }

    const updated = await tx.cartReservation.update({
      where: { id: reservation.id },
      data: {
        quantity: reservation.quantity - quantity,
      },
    });

    return updated;
  });
}

/**
 * Libère toutes les réservations d'un ownerKey
 */
export async function releaseAllForOwner(ownerKey: string) {
  return prisma.cartReservation.deleteMany({
    where: {
      ownerKey,
    },
  });
}

/**
 * Nettoie les réservations expirées
 * Cette fonction peut être appelée par un job périodique
 */
export async function cleanupExpired() {
  const now = new Date();
  const result = await prisma.cartReservation.deleteMany({
    where: {
      expiresAt: {
        lte: now,
      },
    },
  });

  return result.count;
}

/**
 * Récupère toutes les réservations actives d'un ownerKey
 */
export async function getActiveReservationsForOwner(ownerKey: string) {
  const now = new Date();
  return prisma.cartReservation.findMany({
    where: {
      ownerKey,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: {
                orderBy: { position: 'asc' },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Calcule le stock disponible pour une variante
 * Stock disponible = stock_total - réservations_actives
 */
export async function getAvailableStock(variantId: string): Promise<{
  stock: number;
  reserved: number;
  available: number;
}> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });

  if (!variant) {
    throw new Error(`Variante introuvable: ${variantId}`);
  }

  const reserved = await getActiveReservedQty(variantId);
  const available = Math.max(0, variant.stock - reserved);

  return {
    stock: variant.stock,
    reserved,
    available,
  };
}
