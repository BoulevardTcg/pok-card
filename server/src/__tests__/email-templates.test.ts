import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendShippingNotificationEmail,
  sendDeliveryConfirmationEmail,
  type OrderDataForEmail,
} from '../services/email.js';

// Vitest hoiste vi.mock();
const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const sendMail = vi.fn(() => Promise.resolve({ messageId: 'test-message-id' }));
  return {
    mockSendMail: sendMail,
    mockCreateTransport: vi.fn(() => ({ sendMail })),
  };
});

vi.mock('nodemailer', () => {
  return {
    __esModule: true,
    default: { createTransport: mockCreateTransport },
    createTransport: mockCreateTransport,
  };
});

describe('Email Templates', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  const mockOrderData: OrderDataForEmail = {
    orderNumber: 'BLVD-20251217-1234',
    totalCents: 5000,
    currency: 'EUR',
    items: [
      {
        productName: 'Test Product',
        variantName: 'Standard',
        imageUrl: 'https://example.com/image.jpg',
        quantity: 2,
        unitPriceCents: 2000,
        totalPriceCents: 4000,
      },
    ],
    shippingAddress: {
      name: 'John Doe',
      address: {
        line1: '123 Test Street',
        line2: 'Apt 4B',
        city: 'Paris',
        postal_code: '75001',
        country: 'France',
      },
    },
    billingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    trackingNumber: 'MR123456789',
    trackingUrl: 'https://www.17track.net/fr/track#nums=MR123456789',
    orderTrackingUrl: 'https://example.com/order-tracking/order-123?token=abc',
  };

  describe('sendShippingNotificationEmail', () => {
    it("devrait envoyer un email d'expédition avec succès", async () => {
      const result = await sendShippingNotificationEmail(mockOrderData, 'john@example.com');
      expect(result).toBe(true);
    });

    it('devrait gérer les commandes sans numéro de suivi', async () => {
      const orderWithoutTracking = {
        ...mockOrderData,
        trackingNumber: undefined,
        trackingUrl: undefined,
      };
      const result = await sendShippingNotificationEmail(orderWithoutTracking, 'john@example.com');
      expect(result).toBe(true);
    });

    it('devrait utiliser orderTrackingUrl si disponible', async () => {
      const orderWithTrackingUrl = {
        ...mockOrderData,
        orderTrackingUrl: 'https://example.com/track/123?token=xyz',
      };
      const result = await sendShippingNotificationEmail(orderWithTrackingUrl, 'john@example.com');
      expect(result).toBe(true);
    });

    it("devrait gérer les erreurs d'envoi", async () => {
      // Mock pour simuler une erreur
      mockSendMail.mockRejectedValueOnce(new Error('SMTP Error'));

      const result = await sendShippingNotificationEmail(mockOrderData, 'john@example.com');
      expect(result).toBe(false);

      // Restaurer le mock pour les autres tests
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    });
  });

  describe('sendDeliveryConfirmationEmail', () => {
    it('devrait envoyer un email de livraison avec succès', async () => {
      const result = await sendDeliveryConfirmationEmail(mockOrderData, 'john@example.com');
      expect(result).toBe(true);
    });

    it('devrait utiliser orderTrackingUrl si disponible', async () => {
      const orderWithTrackingUrl = {
        ...mockOrderData,
        orderTrackingUrl: 'https://example.com/track/123?token=xyz',
      };
      const result = await sendDeliveryConfirmationEmail(orderWithTrackingUrl, 'john@example.com');
      expect(result).toBe(true);
    });

    it('devrait gérer les commandes sans adresse de livraison', async () => {
      const orderWithoutAddress = {
        ...mockOrderData,
        shippingAddress: null,
      };
      const result = await sendDeliveryConfirmationEmail(orderWithoutAddress, 'john@example.com');
      expect(result).toBe(true);
    });
  });
});
