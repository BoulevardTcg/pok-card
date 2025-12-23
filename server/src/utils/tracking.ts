import { Carrier } from '@prisma/client'
import jwt from 'jsonwebtoken'

const carrierUrls: Record<Carrier | 'OTHER', string> = {
  [Carrier.COLISSIMO]: 'https://www.laposte.fr/outils/suivre-vos-envois?code=',
  [Carrier.CHRONOPOST]: 'https://www.chronopost.fr/fr/suivi-colis?listeNumerosLT=',
  [Carrier.MONDIAL_RELAY]: 'https://www.17track.net/fr/track#nums=',
  [Carrier.UPS]: 'https://www.ups.com/track?loc=fr_FR&tracknum=',
  [Carrier.DHL]: 'https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=',
  [Carrier.FEDEX]: 'https://www.fedex.com/fedextrack/?trknbr=',
  [Carrier.OTHER]: 'https://www.17track.net/fr/track#nums='
}

/**
 * Construit une URL de suivi en fonction du transporteur.
 * Retourne null si le numéro est vide.
 */
export function buildTrackingUrl(
  carrier: Carrier | string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!trackingNumber || trackingNumber.trim() === '') {
    return null
  }

  const normalizedCarrier = carrier && Object.values(Carrier).includes(carrier as Carrier)
    ? carrier as Carrier
    : Carrier.OTHER

  const baseUrl = carrierUrls[normalizedCarrier] ?? carrierUrls[Carrier.OTHER]
  return `${baseUrl}${encodeURIComponent(trackingNumber)}`
}

const getTrackingSecret = () => {
  const secret = process.env.ORDER_TRACKING_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('ORDER_TRACKING_SECRET or JWT_SECRET is required')
  }
  return secret
}

type TrackingTokenPayload = {
  orderId: string
  email?: string | null
  purpose: 'order-tracking'
}

export function generateOrderTrackingToken(orderId: string, email?: string | null, expiresIn = '30d'): string {
  const secret = getTrackingSecret()
  const payload: TrackingTokenPayload = { orderId, email, purpose: 'order-tracking' }
  return (jwt as any).sign(payload, secret, { expiresIn })
}

export function verifyOrderTrackingToken(token: string): TrackingTokenPayload {
  const secret = getTrackingSecret()
  const payload = jwt.verify(token, secret as jwt.Secret) as TrackingTokenPayload
  if (payload.purpose !== 'order-tracking') {
    throw new Error('Invalid tracking token purpose')
  }
  return payload
}
