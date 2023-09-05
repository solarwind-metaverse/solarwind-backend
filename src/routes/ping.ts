import { Request, Response } from 'express'
import { AppRoute, RouterContext } from '../router'

const pong = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
    res.send('PONG')
  }

const routes: AppRoute[] = [
  {
    path: '/ping',
    method: 'GET',
    handler: pong
  }
]

export default routes

