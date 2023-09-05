import { Request, Response } from 'express'
import { RouterContext, AppRoute } from '../router'
import { auth } from '../middleware/auth.js'
import { getUserSession } from '../utils/session.js'
  
const getPublicUser = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {

    const {
      userService
    } = ctx

    const { id } = req.params
    const user = await userService.getUser(id)
    
    if (!user) throw new Error('User not found')

    res.json({
      id: user.id,
      username: user.username,
      address: user.address
    })

  }

const routes: AppRoute[] = [
  {
    path: '/users/:id',
    method: 'GET',
    handler: getPublicUser
  }
]

export default routes
