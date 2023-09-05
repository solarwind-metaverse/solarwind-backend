import session from 'express-session'
import { Request } from 'express'

interface PassportSession extends session.Session {
  passport?: {
      user: string
  }
}

export const getUserSession = (req: Request) => {

  const session = req.session as PassportSession

  if (!session || !session.passport) {
    return null
  }

  return session.passport

}