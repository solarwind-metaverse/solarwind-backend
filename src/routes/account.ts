import { Request, Response } from 'express'
import { RouterContext, AppRoute } from '../router'
import { auth } from '../middleware/auth.js'
import { getUserSession } from '../utils/session.js'
  
const collectHarvest = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    // TODO: Allow only to ship owners !!!

    const { id } = req.params

    const { 
      shipService
    } = ctx

    shipService.updateShip(id, { status: 102 })
      .then(async ship => {
        return shipService.collectHarvest(ship.id)
      })
      .then(harvested => {
        console.log('Harvest collected', harvested)
        return shipService.updateShip(id, { status: 101 })
      })
      .catch(err => {
        console.log('Error while collecting harvest', err)
        shipService.updateShip(id, { status: 101 })
      })
    
    res.json({ status: 'OK' })

  }

const getBalance = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { user: userId } = session

    const {
      userService
    } = ctx

    const balance = await userService.getUserSLWBalance(userId)

    res.json({ balance })

  }

const routes: AppRoute[] = [
  {
    path: '/ships/:id/collect-harvest',
    method: 'GET',
    handler: collectHarvest,
    middleware: [auth]
  },
  {
    path: '/balance',
    method: 'GET',
    handler: getBalance,
    middleware: [auth]
  }
]

export default routes
