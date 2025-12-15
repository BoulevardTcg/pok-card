import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createApp } from '../app.js'
import { cleanupDatabase, createTestUser, prisma } from './setup.js'
import { generateAccessToken, generateRefreshToken } from '../utils/auth.js'

const app = createApp()

describe('Auth Routes', () => {
  beforeAll(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await cleanupDatabase()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanupDatabase()
  })

  describe('POST /api/auth/register', () => {
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('newuser@example.com')
      expect(response.body.user.username).toBe('newuser')
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('devrait rejeter un email déjà utilisé', async () => {
      await createTestUser({ email: 'existing@example.com', username: 'existing' })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          username: 'newuser2',
          password: 'TestPassword123!',
        })

      expect(response.status).toBe(409)
      expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('devrait rejeter un nom d\'utilisateur déjà utilisé', async () => {
      await createTestUser({ email: 'user1@example.com', username: 'existinguser' })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          username: 'existinguser',
          password: 'TestPassword123!',
        })

      expect(response.status).toBe(409)
      expect(response.body.code).toBe('USERNAME_ALREADY_EXISTS')
    })

    it('devrait rejeter un mot de passe trop court', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'shortpass@example.com',
          username: 'shortpass',
          password: 'Short1!',
        })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const user = await createTestUser({
        email: 'login@example.com',
        username: 'loginuser',
        password: 'TestPassword123!',
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'TestPassword123!',
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.id).toBe(user.id)
      expect(response.body.user.email).toBe('login@example.com')
    })

    it('devrait rejeter un email incorrect', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'TestPassword123!',
        })

      expect(response.status).toBe(401)
      expect(response.body.code).toBe('INVALID_CREDENTIALS')
    })

    it('devrait rejeter un mot de passe incorrect', async () => {
      await createTestUser({
        email: 'wrongpass@example.com',
        username: 'wrongpass',
        password: 'TestPassword123!',
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123!',
        })

      expect(response.status).toBe(401)
      expect(response.body.code).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('devrait rafraîchir un token d\'accès valide', async () => {
      const user = await createTestUser()
      const refreshToken = await generateRefreshToken(user.id)

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(typeof response.body.accessToken).toBe('string')
    })

    it('devrait rejeter un refresh token invalide', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })

      expect(response.status).toBe(401)
      expect(response.body.code).toBe('INVALID_REFRESH_TOKEN')
    })

    it('devrait rejeter une requête sans refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('REFRESH_TOKEN_REQUIRED')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('devrait déconnecter un utilisateur avec un refresh token valide', async () => {
      const user = await createTestUser()
      const refreshToken = await generateRefreshToken(user.id)

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
    })
  })
})

