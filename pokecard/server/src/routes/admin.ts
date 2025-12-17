import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { PrismaClient, OrderStatus, Carrier, FulfillmentStatus, OrderEventType } from '@prisma/client'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { sendShippingNotificationEmail, sendDeliveryConfirmationEmail } from '../services/email.js'
import { buildTrackingUrl, generateOrderTrackingToken } from '../utils/tracking.js'

const router = Router()
const prisma = new PrismaClient()

const carrierWhitelist = Object.values(Carrier)

const addOrderEvent = async (
  orderId: string,
  type: OrderEventType,
  message?: string,
  createdBy?: string
) => {
  await prisma.orderEvent.create({
    data: {
      orderId,
      type,
      message,
      createdBy
    }
  })
}

const shopBaseUrl = () => (process.env.SHOP_URL || process.env.FRONT_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '')

const buildOrderTrackingLink = (orderId: string, customerEmail?: string | null) => {
  const base = shopBaseUrl()
  if (!base) return null
  const token = generateOrderTrackingToken(orderId, customerEmail)
  return `${base}/order-tracking/${orderId}?token=${token}`
}

const uploadDir = path.join(process.cwd(), 'public/uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `product-${uniqueSuffix}${ext}`)
  }
})

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const ext = path.extname(file.originalname).toLowerCase()
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype} (${ext}). Utilisez JPG, PNG, GIF ou WebP.`))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
})

// Middleware: Toutes les routes admin nécessitent une authentification + rôle admin
router.use(authenticateToken)
router.use(requireAdmin)

router.post('/upload', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Aucun fichier fourni',
        code: 'NO_FILES'
      })
    }

    const uploadedImages = files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }))

    res.json({ images: uploadedImages })
  } catch (error: any) {
    console.error('Erreur lors de l\'upload:', error)
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'upload',
      code: 'UPLOAD_ERROR'
    })
  }
})

// Supprimer une image uploadée
router.delete('/upload/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const filePath = path.join(uploadDir, filename)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      res.json({ message: 'Image supprimée avec succès' })
    } else {
      res.status(404).json({
        error: 'Fichier non trouvé',
        code: 'FILE_NOT_FOUND'
      })
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    res.status(500).json({
      error: 'Erreur lors de la suppression',
      code: 'DELETE_ERROR'
    })
  }
})

// Liste toutes les commandes (admin)
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: String(search), mode: 'insensitive' } },
        { user: { email: { contains: String(search), mode: 'insensitive' } } },
        { user: { username: { contains: String(search), mode: 'insensitive' } } }
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ])

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes (admin):', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Récupérer une commande spécifique (admin)
router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        events: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        error: 'Commande non trouvée',
        code: 'ORDER_NOT_FOUND'
      })
    }

    res.json({ order })
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande (admin):', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Marquer une commande comme expédiée (admin)
router.post('/orders/:orderId/ship', [
  body('carrier')
    .isString()
    .custom(value => carrierWhitelist.includes(value))
    .withMessage('Transporteur invalide'),
  body('trackingNumber')
    .isString()
    .notEmpty()
    .isLength({ max: 120 })
    .withMessage('Numéro de suivi invalide'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Note trop longue')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { orderId } = req.params
    const { carrier, trackingNumber, note } = req.body as { carrier: Carrier; trackingNumber: string; note?: string }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true }
        }
      }
    })

    if (!existingOrder) {
      return res.status(404).json({ error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' })
    }

    if (
      existingOrder.fulfillmentStatus === FulfillmentStatus.SHIPPED ||
      existingOrder.fulfillmentStatus === FulfillmentStatus.DELIVERED
    ) {
      return res.status(200).json({ message: 'Commande déjà expédiée', order: existingOrder })
    }

    const trackingUrl = buildTrackingUrl(carrier, trackingNumber)
    const now = new Date()

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        carrier,
        trackingNumber,
        trackingUrl,
        shippedAt: now,
        fulfillmentStatus: FulfillmentStatus.SHIPPED,
        status: OrderStatus.SHIPPED,
        events: {
          create: {
            type: OrderEventType.SHIPPED,
            message: note ?? 'Commande expédiée',
            createdBy: req.user?.userId
          }
        }
      },
      include: {
        items: true,
        user: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true }
        }
      }
    })

    const customerEmail = updatedOrder.user?.email || (updatedOrder.billingAddress as any)?.email
    const orderTrackingUrl = buildOrderTrackingLink(updatedOrder.id, customerEmail)
    if (customerEmail) {
      const orderDataForEmail = {
        orderNumber: updatedOrder.orderNumber,
        totalCents: updatedOrder.totalCents,
        currency: updatedOrder.currency,
        items: updatedOrder.items.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents
        })),
        shippingAddress: updatedOrder.shippingAddress as any,
        billingAddress: updatedOrder.billingAddress as any,
        trackingNumber: updatedOrder.trackingNumber ?? undefined,
        trackingUrl: updatedOrder.trackingUrl ?? undefined,
        orderTrackingUrl: orderTrackingUrl ?? undefined
      }

      sendShippingNotificationEmail(orderDataForEmail, customerEmail)
        .catch(err => console.error('Erreur email expedition:', err))
    }

    res.json({
      message: 'Commande marquée comme expédiée',
      order: updatedOrder
    })
  } catch (error) {
    console.error('Erreur lors du marquage expédié:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Marquer une commande comme livrée (admin)
router.post('/orders/:orderId/deliver', [
  body('note')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Note trop longue')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { orderId } = req.params
    const { note } = req.body as { note?: string }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true }
        }
      }
    })

    if (!existingOrder) {
      return res.status(404).json({ error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' })
    }

    if (existingOrder.fulfillmentStatus === FulfillmentStatus.DELIVERED) {
      return res.status(200).json({ message: 'Commande déjà livrée', order: existingOrder })
    }

    const now = new Date()

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveredAt: now,
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
        status: OrderStatus.DELIVERED,
        events: {
          create: {
            type: OrderEventType.DELIVERED,
            message: note ?? 'Commande livrée',
            createdBy: req.user?.userId
          }
        }
      },
      include: {
        items: true,
        user: {
          select: { id: true, email: true, username: true, firstName: true, lastName: true }
        }
      }
    })

    const customerEmail = updatedOrder.user?.email || (updatedOrder.billingAddress as any)?.email
    const orderTrackingUrl = buildOrderTrackingLink(updatedOrder.id, customerEmail)
    const sendDeliveredEmail = process.env.SEND_DELIVERED_EMAIL !== 'false'
    if (customerEmail && sendDeliveredEmail) {
      const orderDataForEmail = {
        orderNumber: updatedOrder.orderNumber,
        totalCents: updatedOrder.totalCents,
        currency: updatedOrder.currency,
        items: updatedOrder.items.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents
        })),
        shippingAddress: updatedOrder.shippingAddress as any,
        billingAddress: updatedOrder.billingAddress as any,
        trackingNumber: updatedOrder.trackingNumber ?? undefined,
        trackingUrl: updatedOrder.trackingUrl ?? undefined,
        orderTrackingUrl: orderTrackingUrl ?? undefined
      }

      sendDeliveryConfirmationEmail(orderDataForEmail, customerEmail)
        .catch(err => console.error('Erreur email livraison:', err))
    }

    res.json({
      message: 'Commande marquée comme livrée',
      order: updatedOrder
    })
  } catch (error) {
    console.error('Erreur lors du marquage livré:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Modifier le statut d'une commande (admin)
router.patch('/orders/:orderId/status', [
  body('status')
    .isIn(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
    .withMessage('Statut invalide'),
  body('carrier')
    .optional()
    .isString()
    .custom(value => carrierWhitelist.includes(value))
    .withMessage('Transporteur invalide'),
  body('trackingNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Numero de suivi invalide'),
  body('trackingUrl')
    .optional()
    .isString()
    .trim()
    .isURL()
    .withMessage('URL de suivi invalide')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { orderId } = req.params
    const { status, trackingNumber, trackingUrl, carrier } = req.body

    // Vérifier que la commande existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      return res.status(404).json({
        error: 'Commande non trouvée',
        code: 'ORDER_NOT_FOUND'
      })
    }

    const mapToFulfillment: Record<OrderStatus, FulfillmentStatus> = {
      [OrderStatus.PENDING]: FulfillmentStatus.PENDING,
      [OrderStatus.CONFIRMED]: FulfillmentStatus.PAID,
      [OrderStatus.SHIPPED]: FulfillmentStatus.SHIPPED,
      [OrderStatus.DELIVERED]: FulfillmentStatus.DELIVERED,
      [OrderStatus.CANCELLED]: FulfillmentStatus.CANCELLED,
      [OrderStatus.REFUNDED]: FulfillmentStatus.REFUNDED
    }

    const nextCarrier: Carrier | null = carrier ?? existingOrder.carrier ?? null
    const nextTrackingNumber: string | null = trackingNumber ?? existingOrder.trackingNumber ?? null
    const resolvedTrackingUrl: string | null = trackingUrl 
      ?? (nextTrackingNumber ? buildTrackingUrl(nextCarrier ?? Carrier.OTHER, nextTrackingNumber) : existingOrder.trackingUrl ?? null)

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: status as OrderStatus,
        fulfillmentStatus: mapToFulfillment[status as OrderStatus],
        carrier: nextCarrier ?? undefined,
        trackingNumber: nextTrackingNumber ?? undefined,
        trackingUrl: resolvedTrackingUrl ?? undefined,
        updatedAt: new Date()
      },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      }
    })

    await addOrderEvent(orderId, OrderEventType.STATUS_UPDATED, `Statut: ${existingOrder.status} → ${status}`, req.user?.userId)
    if (status === 'SHIPPED') {
      await addOrderEvent(orderId, OrderEventType.SHIPPED, 'Commande expédiée', req.user?.userId)
    } else if (status === 'DELIVERED') {
      await addOrderEvent(orderId, OrderEventType.DELIVERED, 'Commande livrée', req.user?.userId)
    }

    const customerEmail = updatedOrder.user?.email || (updatedOrder.billingAddress as any)?.email
    const orderTrackingUrl = buildOrderTrackingLink(updatedOrder.id, customerEmail)
    
    if (customerEmail) {
      const orderDataForEmail = {
        orderNumber: updatedOrder.orderNumber,
        totalCents: updatedOrder.totalCents,
        currency: updatedOrder.currency,
        items: updatedOrder.items.map(item => ({
          productName: item.productName,
          variantName: item.variantName,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents
        })),
        shippingAddress: updatedOrder.shippingAddress as any,
        billingAddress: updatedOrder.billingAddress as any,
        trackingNumber: updatedOrder.trackingNumber ?? undefined,
        trackingUrl: updatedOrder.trackingUrl ?? undefined,
        orderTrackingUrl: orderTrackingUrl ?? undefined
      }

      if (status === 'SHIPPED') {
        sendShippingNotificationEmail(orderDataForEmail, customerEmail)
          .catch(err => console.error('Erreur email expedition:', err))
      } else if (status === 'DELIVERED') {
        sendDeliveryConfirmationEmail(orderDataForEmail, customerEmail)
          .catch(err => console.error('Erreur email livraison:', err))
      }
    }

    res.json({
      message: 'Statut de la commande mis à jour',
      order: updatedOrder
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Statistiques des commandes (admin)
router.get('/stats/orders', async (_req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      totalRevenue
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { status: 'REFUNDED' } }),
      prisma.order.aggregate({
        where: {
          status: {
            notIn: ['CANCELLED', 'REFUNDED']
          }
        },
        _sum: {
          totalCents: true
        }
      })
    ])

    res.json({
      stats: {
        total: totalOrders,
        byStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          refunded: refundedOrders
        },
        totalRevenue: totalRevenue._sum.totalCents || 0
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== DASHBOARD ====================
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      topProducts
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.product.count(),
      prisma.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        _sum: { totalCents: true }
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.productVariant.count({ where: { stock: { lte: 10 }, isActive: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, username: true }
          },
          items: true
        }
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      })
    ])

    // Récupérer les détails des produits les plus vendus
    const topProductsDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            images: { take: 1 },
            variants: { take: 1 }
          }
        })
        return {
          product,
          totalSold: item._sum.quantity || 0
        }
      })
    )

    res.json({
      stats: {
        orders: {
          total: totalOrders,
          pending: pendingOrders
        },
        users: {
          total: totalUsers
        },
        products: {
          total: totalProducts,
          lowStock: lowStockProducts
        },
        revenue: {
          total: totalRevenue._sum.totalCents || 0
        }
      },
      recentOrders,
      topProducts: topProductsDetails
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du dashboard:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== PRODUITS (CRUD) ====================
// Liste des produits (admin)
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, category } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { description: { contains: String(search) } }
      ]
    }
    if (category) {
      where.category = String(category)
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { position: 'asc' } },
          variants: true,
          reviews: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ])

    // Ajouter le count de reviews manuellement
    const productsWithCount = products.map(product => ({
      ...product,
      _count: {
        reviews: product.reviews.length
      }
    }))

    res.json({
      products: productsWithCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Créer un produit
router.post('/products', [
  body('name').isString().notEmpty().withMessage('Le nom est obligatoire'),
  body('slug').isString().notEmpty().withMessage('Le slug est obligatoire'),
  body('category').isString().notEmpty().withMessage('La catégorie est obligatoire'),
  body('description').optional().isString(),
  body('variants').isArray().withMessage('Au moins une variante est requise')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { name, slug, category, description, images, variants } = req.body

    // Vérifier si le slug existe déjà
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    })

    if (existingProduct) {
      return res.status(409).json({
        error: 'Un produit avec ce slug existe déjà',
        code: 'SLUG_ALREADY_EXISTS'
      })
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        category,
        description: description || null,
        images: images ? {
          create: images.map((img: any, index: number) => ({
            url: img.url,
            altText: img.altText || null,
            position: index
          }))
        } : undefined,
        variants: {
          create: variants.map((variant: any) => ({
            name: variant.name,
            language: variant.language || null,
            edition: variant.edition || null,
            priceCents: variant.priceCents,
            stock: variant.stock || 0,
            sku: variant.sku || null,
            isActive: variant.isActive !== false
          }))
        }
      },
      include: {
        images: true,
        variants: true
      }
    })

    res.status(201).json({ product })
  } catch (error: any) {
    console.error('Erreur lors de la création du produit:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Modifier un produit
router.put('/products/:productId', [
  body('name').optional().isString().notEmpty(),
  body('category').optional().isString().notEmpty()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { productId } = req.params
    const { name, slug, category, description, images, variants } = req.body

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, variants: true }
    })

    if (!existingProduct) {
      return res.status(404).json({
        error: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND'
      })
    }

    // Mise à jour des données de base
    const updateData: any = {}
    if (name) updateData.name = name
    if (slug) updateData.slug = slug
    if (category) updateData.category = category
    if (description !== undefined) updateData.description = description

    // Mise à jour des images
    if (images !== undefined) {
      // Supprimer toutes les anciennes images
      await prisma.productImage.deleteMany({
        where: { productId }
      })
      
      // Créer les nouvelles images
      if (images && images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img: any, index: number) => ({
            productId,
            url: img.url,
            altText: img.altText || null,
            position: index
          }))
        })
      }
    }

    // Mise à jour des variantes
    if (variants !== undefined) {
      // Récupérer les IDs des variantes existantes
      const existingVariantIds = existingProduct.variants.map(v => v.id)
      const incomingVariantIds = variants.filter((v: any) => v.id).map((v: any) => v.id)
      
      // Supprimer les variantes qui ne sont plus présentes
      const variantsToDelete = existingVariantIds.filter(id => !incomingVariantIds.includes(id))
      if (variantsToDelete.length > 0) {
        await prisma.productVariant.deleteMany({
          where: { id: { in: variantsToDelete } }
        })
      }
      
      // Mettre à jour ou créer les variantes
      for (const variant of variants) {
        if (variant.id && existingVariantIds.includes(variant.id)) {
          // Mise à jour
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              name: variant.name,
              language: variant.language || null,
              edition: variant.edition || null,
              priceCents: variant.priceCents,
              stock: variant.stock || 0,
              sku: variant.sku || null,
              isActive: variant.isActive !== false
            }
          })
        } else {
          // Création
          await prisma.productVariant.create({
            data: {
              productId,
              name: variant.name,
              language: variant.language || null,
              edition: variant.edition || null,
              priceCents: variant.priceCents,
              stock: variant.stock || 0,
              sku: variant.sku || null,
              isActive: variant.isActive !== false
            }
          })
        }
      }
    }

    // Récupérer le produit mis à jour
    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: true
      }
    })

    res.json({ product })
  } catch (error) {
    console.error('Erreur lors de la modification du produit:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Supprimer un produit
router.delete('/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: {
            orderItems: {
              take: 1
            }
          }
        }
      }
    })

    if (!product) {
      return res.status(404).json({
        error: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND'
      })
    }

    // Vérifier s'il y a des commandes associées
    const hasOrders = product.variants.some(variant => variant.orderItems.length > 0)
    if (hasOrders) {
      return res.status(400).json({
        error: 'Ce produit ne peut pas être supprimé car il a des commandes associées',
        code: 'PRODUCT_HAS_ORDERS'
      })
    }

    await prisma.product.delete({
      where: { id: productId }
    })

    res.json({ message: 'Produit supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== UTILISATEURS ====================
// Liste des utilisateurs
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, role } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { username: { contains: String(search) } },
        { firstName: { contains: String(search) } },
        { lastName: { contains: String(search) } }
      ]
    }
    if (role === 'admin') {
      where.isAdmin = true
    } else if (role === 'user') {
      where.isAdmin = false
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isAdmin: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ])

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Détails d'un utilisateur
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true
          }
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            favorites: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      })
    }

    res.json({ user })
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Modifier un utilisateur
router.patch('/users/:userId', [
  body('isAdmin').optional().isBoolean(),
  body('isVerified').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { userId } = req.params
    const { isAdmin, isVerified } = req.body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(isAdmin !== undefined && { isAdmin }),
        ...(isVerified !== undefined && { isVerified })
      },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        isVerified: true
      }
    })

    res.json({ user })
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== STOCK ====================
// Vue d'ensemble du stock
router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const { lowStockThreshold = 10 } = req.query

    const [allVariants, lowStockVariants] = await Promise.all([
      prisma.productVariant.findMany({
        where: { isActive: true },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: { take: 1 }
            }
          }
        },
        orderBy: { stock: 'asc' }
      }),
      prisma.productVariant.findMany({
        where: {
          isActive: true,
          stock: { lte: Number(lowStockThreshold) }
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: { stock: 'asc' }
      })
    ])

    res.json({
      variants: allVariants,
      lowStock: lowStockVariants,
      stats: {
        total: allVariants.length,
        lowStock: lowStockVariants.length,
        outOfStock: allVariants.filter(v => v.stock === 0).length
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du stock:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Ajuster le stock
router.patch('/inventory/:variantId', [
  body('stock').isInt({ min: 0 }).withMessage('Le stock doit être un nombre positif'),
  body('reason').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { variantId } = req.params
    const { stock, reason } = req.body

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json({ variant })
  } catch (error) {
    console.error('Erreur lors de l\'ajustement du stock:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== CODES PROMO ====================
// Liste des codes promo
router.get('/promos', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, active } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (active !== undefined) {
      where.isActive = active === 'true'
    }

    const [promos, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.promoCode.count({ where })
    ])

    res.json({
      promos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des codes promo:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Créer un code promo
router.post('/promos', [
  body('code').isString().notEmpty().withMessage('Le code est obligatoire'),
  body('type').isIn(['PERCENTAGE', 'FIXED']).withMessage('Type invalide'),
  body('value').isInt({ min: 1 }).withMessage('La valeur est obligatoire'),
  body('validFrom').isISO8601().withMessage('Date de début invalide'),
  body('validUntil').isISO8601().withMessage('Date de fin invalide')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { code, type, value, minPurchase, maxDiscount, usageLimit, validFrom, validUntil, isActive } = req.body

    // Vérifier si le code existe déjà
    const existing = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (existing) {
      return res.status(409).json({
        error: 'Ce code promo existe déjà',
        code: 'PROMO_ALREADY_EXISTS'
      })
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        minPurchase: minPurchase || null,
        maxDiscount: maxDiscount || null,
        usageLimit: usageLimit || null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: isActive !== false
      }
    })

    res.status(201).json({ promo })
  } catch (error) {
    console.error('Erreur lors de la création du code promo:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Modifier un code promo
router.put('/promos/:promoId', [
  body('type').optional().isIn(['PERCENTAGE', 'FIXED']),
  body('value').optional().isInt({ min: 1 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { promoId } = req.params
    const updateData: any = {}

    if (req.body.type) updateData.type = req.body.type
    if (req.body.value) updateData.value = req.body.value
    if (req.body.minPurchase !== undefined) updateData.minPurchase = req.body.minPurchase || null
    if (req.body.maxDiscount !== undefined) updateData.maxDiscount = req.body.maxDiscount || null
    if (req.body.usageLimit !== undefined) updateData.usageLimit = req.body.usageLimit || null
    if (req.body.validFrom) updateData.validFrom = new Date(req.body.validFrom)
    if (req.body.validUntil) updateData.validUntil = new Date(req.body.validUntil)
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive

    const promo = await prisma.promoCode.update({
      where: { id: promoId },
      data: updateData
    })

    res.json({ promo })
  } catch (error) {
    console.error('Erreur lors de la modification du code promo:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Supprimer un code promo
router.delete('/promos/:promoId', async (req: Request, res: Response) => {
  try {
    const { promoId } = req.params

    await prisma.promoCode.delete({
      where: { id: promoId }
    })

    res.json({ message: 'Code promo supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du code promo:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== MODÉRATION DES AVIS ====================
// Liste des avis en attente
router.get('/reviews', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (status === 'pending') {
      where.isApproved = false
    } else if (status === 'approved') {
      where.isApproved = true
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.productReview.count({ where })
    ])

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des avis:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Approuver/Rejeter un avis
router.patch('/reviews/:reviewId', [
  body('isApproved').isBoolean().withMessage('isApproved doit être un booléen')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const { reviewId } = req.params
    const { isApproved } = req.body

    const review = await prisma.productReview.update({
      where: { id: reviewId },
      data: { isApproved },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        },
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json({ review })
  } catch (error) {
    console.error('Erreur lors de la modération de l\'avis:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Supprimer un avis
router.delete('/reviews/:reviewId', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params

    await prisma.productReview.delete({
      where: { id: reviewId }
    })

    res.json({ message: 'Avis supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'avis:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// ==================== RAPPORTS ====================
// Rapports de ventes
router.get('/reports/sales', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query

    const where: any = {
      status: { notIn: ['CANCELLED', 'REFUNDED'] }
    }

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(String(startDate)) }
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(String(endDate)) }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Grouper par période selon groupBy
    const salesByPeriod: Record<string, { revenue: number; orders: number; items: number }> = {}

    orders.forEach(order => {
      const date = new Date(order.createdAt)
      let key = ''
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!salesByPeriod[key]) {
        salesByPeriod[key] = { revenue: 0, orders: 0, items: 0 }
      }

      salesByPeriod[key].revenue += order.totalCents
      salesByPeriod[key].orders += 1
      salesByPeriod[key].items += order.items.reduce((sum, item) => sum + item.quantity, 0)
    })

    res.json({
      sales: Object.entries(salesByPeriod).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        orders: data.orders,
        items: data.items
      })),
      total: {
        revenue: orders.reduce((sum, o) => sum + o.totalCents, 0),
        orders: orders.length,
        items: orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

export default router

