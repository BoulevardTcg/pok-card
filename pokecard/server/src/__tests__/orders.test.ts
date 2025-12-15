import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createApp } from '../app.js'
import { cleanupDatabase, createTestUser, createTestProduct, prisma } from './setup.js'
import { generateAccessToken } from '../utils/auth.js'
import { OrderStatus } from '@prisma/client'

const app = createApp()

describe('Orders Routes', () => {
  let testUser: any
  let testUserToken: string
  let testProduct: any
  let testVariant: any

  beforeAll(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await cleanupDatabase()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanupDatabase()
    
    // Créer un utilisateur de test
    testUser = await createTestUser({
      email: 'orders@example.com',
      username: 'orderuser',
    })
    testUserToken = generateAccessToken({
      userId: testUser.id,
      email: testUser.email,
      username: testUser.username,
      isAdmin: false,
    })

    // Créer un produit de test
    testProduct = await createTestProduct({
      name: 'Test Product for Orders',
      priceCents: 2000,
      stock: 5,
    })
    testVariant = testProduct.variants[0]
  })

  describe('GET /api/users/orders', () => {
    it('devrait retourner un tableau vide pour un utilisateur sans commandes', async () => {
      const response = await request(app)
        .get('/api/users/orders')
        .set('Authorization', `Bearer ${testUserToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('orders')
      expect(Array.isArray(response.body.orders)).toBe(true)
      expect(response.body.orders).toHaveLength(0)
      expect(response.body).toHaveProperty('pagination')
    })

    it('devrait retourner les commandes d\'un utilisateur', async () => {
      // Créer une commande de test
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNumber: 'TEST-2025-0001',
          status: OrderStatus.CONFIRMED,
          totalCents: 2000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 2000,
              totalPriceCents: 2000,
            },
          },
        },
        include: {
          items: true,
        },
      })

      const response = await request(app)
        .get('/api/users/orders')
        .set('Authorization', `Bearer ${testUserToken}`)

      expect(response.status).toBe(200)
      expect(response.body.orders).toHaveLength(1)
      expect(response.body.orders[0].id).toBe(order.id)
      expect(response.body.orders[0].orderNumber).toBe('TEST-2025-0001')
      expect(response.body.orders[0].status).toBe('CONFIRMED')
      expect(response.body.orders[0].totalCents).toBe(2000)
      expect(response.body.orders[0].items).toHaveLength(1)
      expect(response.body.orders[0].items[0].productName).toBe(testProduct.name)
    })

    it('devrait filtrer les commandes par statut', async () => {
      // Créer plusieurs commandes avec différents statuts
      await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNumber: 'TEST-2025-0002',
          status: OrderStatus.CONFIRMED,
          totalCents: 2000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 2000,
              totalPriceCents: 2000,
            },
          },
        },
      })

      await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNumber: 'TEST-2025-0003',
          status: OrderStatus.SHIPPED,
          totalCents: 2000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 2000,
              totalPriceCents: 2000,
            },
          },
        },
      })

      const response = await request(app)
        .get('/api/users/orders?status=CONFIRMED')
        .set('Authorization', `Bearer ${testUserToken}`)

      expect(response.status).toBe(200)
      expect(response.body.orders.length).toBeGreaterThan(0)
      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe('CONFIRMED')
      })
    })

    it('devrait rejeter une requête sans token', async () => {
      const response = await request(app)
        .get('/api/users/orders')

      expect(response.status).toBe(401)
      expect(response.body.code).toBe('ACCESS_TOKEN_REQUIRED')
    })

    it('devrait rejeter une requête avec un token invalide', async () => {
      const response = await request(app)
        .get('/api/users/orders')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(403)
      expect(response.body.code).toBe('INVALID_TOKEN')
    })

    it('ne devrait retourner que les commandes de l\'utilisateur connecté', async () => {
      // Créer un autre utilisateur avec une commande
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      })

      await prisma.order.create({
        data: {
          userId: otherUser.id,
          orderNumber: 'OTHER-2025-0001',
          status: OrderStatus.CONFIRMED,
          totalCents: 3000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 3000,
              totalPriceCents: 3000,
            },
          },
        },
      })

      // Créer une commande pour l'utilisateur de test
      await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNumber: 'TEST-2025-0004',
          status: OrderStatus.CONFIRMED,
          totalCents: 2000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 2000,
              totalPriceCents: 2000,
            },
          },
        },
      })

      const response = await request(app)
        .get('/api/users/orders')
        .set('Authorization', `Bearer ${testUserToken}`)

      expect(response.status).toBe(200)
      expect(response.body.orders.length).toBe(1)
      expect(response.body.orders[0].orderNumber).toBe('TEST-2025-0004')
    })
  })

  describe('GET /api/users/orders/:orderId', () => {
    it('devrait retourner une commande spécifique', async () => {
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          orderNumber: 'TEST-2025-0005',
          status: OrderStatus.CONFIRMED,
          totalCents: 2000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 2000,
              totalPriceCents: 2000,
            },
          },
        },
        include: {
          items: true,
        },
      })

      const response = await request(app)
        .get(`/api/users/orders/${order.id}`)
        .set('Authorization', `Bearer ${testUserToken}`)

      expect(response.status).toBe(200)
      expect(response.body.order.id).toBe(order.id)
      expect(response.body.order.orderNumber).toBe('TEST-2025-0005')
      expect(response.body.order.items).toHaveLength(1)
    })

    it('devrait rejeter l\'accès à une commande d\'un autre utilisateur', async () => {
      const otherUser = await createTestUser({
        email: 'other2@example.com',
        username: 'otheruser2',
      })

      const order = await prisma.order.create({
        data: {
          userId: otherUser.id,
          orderNumber: 'OTHER-2025-0002',
          status: OrderStatus.CONFIRMED,
          totalCents: 2000,
          currency: 'EUR',
          items: {
            create: {
              productId: testProduct.id,
              productVariantId: testVariant.id,
              productName: testProduct.name,
              variantName: testVariant.name,
              quantity: 1,
              unitPriceCents: 2000,
              totalPriceCents: 2000,
            },
          },
        },
      })

      const response = await request(app)
        .get(`/api/users/orders/${order.id}`)
        .set('Authorization', `Bearer ${testUserToken}`)

      expect(response.status).toBe(404)
      expect(response.body.code).toBe('ORDER_NOT_FOUND')
    })
  })
})

