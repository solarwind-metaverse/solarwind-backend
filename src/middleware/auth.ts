import session from 'express-session'
import { Request, Response } from 'express'
import { RouterContext } from '../router'

interface PassportSession extends session.Session {
    passport?: {
        user: string
    }
}

export const auth = (ctx: RouterContext) => 
  async (req: Request, res: Response, next: () => void) => {

    const session = req.session as PassportSession

    if (!session || !session.passport) {
      return res.status(401).json({
        error: new Error('Unauthorized')
      })
    }

    next()

  }

export const admin = (ctx: RouterContext) => 
  async (req: Request, res: Response, next: () => void) => {

    const session = req.session as PassportSession

    if (!session || !session.passport) {
      return res.status(401).json({
        error: new Error('Unauthorized')
      })
    } else {
      const { user: userId } = session.passport
      const { userService } = ctx
      const user = await userService.getUser(userId)
      const { ADMIN_USERS } = process.env
      if (!user || !ADMIN_USERS || !ADMIN_USERS.split(',').includes(user.email)
      ) {
        return res.status(403).json({
          error: new Error('Forbidden')
        })
      }
    }

    next()

  }