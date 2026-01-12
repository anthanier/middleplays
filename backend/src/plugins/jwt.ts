import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { env } from '@/configs/env'

export const jwtPlugin = new Elysia({ name: 'jwt' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
      exp: env.JWT_ACCESS_EXPIRES,
    })
  )
  .use(
    jwt({
      name: 'jwtRefresh',
      secret: env.JWT_REFRESH_SECRET,
      exp: env.JWT_REFRESH_EXPIRES,
    })
  )
  .derive(({ jwt, jwtRefresh }) => ({
    generateTokens: async (userId: string) => {
      const accessToken = await jwt.sign({ userId, type: 'access' })
      const refreshToken = await jwtRefresh.sign({ userId, type: 'refresh' })
      
      return { accessToken, refreshToken }
    },
  }))