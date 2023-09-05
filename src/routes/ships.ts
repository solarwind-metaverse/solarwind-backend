import { Request, Response } from 'express'
import { RouterContext, AppRoute } from '../router'
import { auth } from '../middleware/auth.js'
import { getUserSession } from '../utils/session.js'

const getShip = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const { id } = req.params
    const { shipService } = ctx
    const ship = await shipService.getShip(id)

    res.json(ship)

  }

const getOwnShips = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { user: userId } = session
    const { shipService } = ctx
    const ships = await shipService.getOwnedShips(userId)

    res.json({ ships })

  }

const getShipsOnOrbit = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const { starId } = req.params

    const { shipService } = ctx
    const ships = await shipService.getShipsOnOrbit(starId)

    res.json({ ships })

  }

const claimShip = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { 
      shipService,
      userService
    } = ctx

    const { user: userId } = session
    const user = await userService.getUser(userId)
    if (!user) {
      res.status(500).send('User not found')
      return
    }

    const data = req.body as { name: string }

    const ship = await shipService.claimShip(userId, data.name)
    res.json(ship)

  }

const buildShip = (ctx: RouterContext) => 
    
  async (req: Request, res: Response) => {

    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { user: userId } = session

    const { 
      shipService,
      userService
    } = ctx

    const balance = await userService.getUserSLWBalance(userId)

    if (balance < 1000000) {
      res.json({ success: false, message: 'Insufficient SLW balance' })
      return
    }
    const data = req.body as { name: string }

    const ship = await shipService.claimShip(userId, data.name, 1000000)

    res.json({
      success: true,
      ship
    })

  }

const sendShip = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const { id, starId } = req.params
    const { fuel } = req.body as { fuel: number }

    const { 
      shipService,
      starService
    } = ctx

    const ship = await shipService.getShip(id)
    if (!ship) throw new Error(`Ship ${id} not found`)
    if (!ship.starId) throw new Error('Ship orbit unknown')

    const toStar = await starService.getStar(starId)
    if (!toStar) throw new Error(`Destination star ${starId} not found`)

    const fromStar = await starService.getStar(ship.starId)
    if (!fromStar) throw new Error(`Departure star ${ship.starId} not found`)

    const sentShip = await shipService.sendShip(id, fromStar, toStar, fuel)
    const shipCount = fromStar.shipCount || 1
    starService.updateStar(fromStar.id, { shipCount: shipCount - 1 })

    res.json(sentShip)

  }

const putShipOnOrbit = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const { id, starId } = req.params

    const { 
      shipService,
      starService
    } = ctx

    const star = await starService.getStar(starId)
    if (!star) throw new Error(`Star ${starId} not found`)
    
    shipService.updateShip(id, { status: 802 }).then(async ship => {
      console.log('Placing ship in orbit...')
      return shipService.placeShipInOrbit(ship.id, star)
    }).then(() => {
      const shipCount = star.shipCount || 0
      starService.updateStar(star.id, { shipCount: shipCount + 1 })
      shipService.updateShip(id, { status: 101 })
    })

    res.json({ status: 'OK' })

  }

  const attackShip = (ctx: RouterContext) => 
    async (req: Request, res: Response) => {

    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { user: userId } = session
  
    const { attackerId, targetId, power } = req.params

    const { 
      shipService
    } = ctx

    const ship = await shipService.getShip(attackerId)

    console.log('Ship ownership', ship?.ownerId.toString(), userId)
    if (ship?.ownerId.toString() !== userId) {
      res.status(403).send('Forbidden')
      return
    }

    const result = await shipService.attackShip(attackerId, targetId, Number(power))

    res.json(result)

  }
 
const routes: AppRoute[] = [
  {
    path: '/ships',
    method: 'GET',
    handler: getOwnShips,
    middleware: [auth]
  },
  {
    path: '/ships/:id',
    method: 'GET',
    handler: getShip
  },
  {
    path: '/ships/star/:starId',
    method: 'GET',
    handler: getShipsOnOrbit
  },
  {
    path: '/ships/:id/stars/:starId',
    method: 'PUT',
    handler: putShipOnOrbit,
    middleware: [auth]
  },
  {
    path: '/ships/:id/travel/:starId',
    method: 'POST',
    handler: sendShip,
    middleware: [auth]
  },
  {
    path: '/ships/:attackerId/attack/:targetId/:power',
    method: 'POST',
    handler: attackShip,
    middleware: [auth]
  },
  {
    path: '/ships/claim',
    method: 'POST',
    handler: claimShip,
    middleware: [auth]
  },
  {
    path: '/ships/build',
    method: 'POST',
    handler: buildShip,
    middleware: [auth]
  }
]

export default routes
