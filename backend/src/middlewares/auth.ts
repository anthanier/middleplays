import { Elysia } from 'elysia'
import { jwtPlugin } from '@/plugins/jwt'
import type { JWTPayloadSpec } from '@elysiajs/jwt'

interface JWTPayload extends JWTPayloadSpec {
  userId: string
  type: 'access' | 'refresh'
}

// 1. Tambahkan { as: 'global' } supaya userId & user tersedia di plugin lain
export const authMiddleware = new Elysia({ name: 'auth' })
  .use(jwtPlugin)
  .derive({ as: 'global' }, async ({ request, jwt }) => {
    const auth = request.headers.get('authorization')

    if (!auth || !auth.startsWith('Bearer ')) {
      return { user: null, userId: null }
    }

    const token = auth.slice(7)

    try {
      const payload = (await jwt.verify(token)) as unknown as JWTPayload | false

      if (!payload || payload.type !== 'access') {
        return { user: null, userId: null }
      }

      return {
        user: payload,
        userId: payload.userId,
      }
    } catch {
      return { user: null, userId: null }
    }
  })

// 2. Gunakan pattern plugin yang konsisten
export const requireAuth = new Elysia({ name: 'require-auth' })
  .use(authMiddleware)
  .onBeforeHandle({ as: 'global' }, ({ userId, set }) => {
    // Sekarang userId sudah tidak merah lagi
    if (!userId) {
      set.status = 401
      throw new Error('Unauthorized. Please login.')
    }
  })

// 3. Gunakan { as: 'global' } juga di sini agar sellerUser bisa dipake di route
export const requireVerifiedSeller = new Elysia({ name: 'require-verified-seller' })
  .use(requireAuth)
  .derive({ as: 'global' }, async ({ userId, set }) => {
    const { db } = await import('@/db')
    const { users } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    // Pakai non-null assertion (!) karena sudah divalidasi di requireAuth sebelumnya
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId!),
    })

    if (!user || user.role !== 'verified_seller') {
      set.status = 403
      throw new Error('Access denied. Verified seller account required.')
    }

    return { sellerUser: user }
  })