import { Request, Response } from 'express'
import { RouterContext, AppRoute, RouteHandler } from '../router'
import { StarData } from 'solarwind-common/dist/model/star.js'
import { admin, auth } from '../middleware/auth.js'
import { getUserSession } from '../utils/session.js'

const createStar = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const data = req.body as StarData

    const { starService } = ctx
    const createdStar = await starService.createStar(data)

    res.send(createdStar)

  }


const updateStar = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const data = req.body as Record<string, any>
    const { id } = req.params
    const { starService } = ctx

    const updatedStar = await starService.updateStar(id, data)

    res.send(updatedStar)

  }

const mintStarNft = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const { id } = req.params
    const { starService } = ctx

    const tokenId = await starService.mintStarNft(id)

    res.send({ tokenId })

  }


const deleteStar = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const { id } = req.params
  
    const { starService } = ctx
    await starService.deleteStar(id)
  
    res.send({ status: 'OK' })

  }

const getStars = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
    
    const { starService } = ctx
    const stars = await starService.getAllStarsWithNeighbours()
    res.json({ stars })

  }

const searchStars = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
    
    const { id, name } = req.params

    const { starService } = ctx
    const star = await starService.getStar(id)
    if (!star) {
      res.status(404).send(`Star ${id} not found`)
      return
    }

    const stars = await starService.searchStars(name, star)
    res.json({ stars })

  }

const getStar = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
    
    const { id } = req.params

    const { starService } = ctx
    const star = await starService.getStar(id)
    if (!star) {
      res.status(404).send(`Star ${id} not found`)
      return
    }
    res.json(star)
    
  }

const claimStar = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
    
    const { id } = req.params

    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }
    
    const { 
      starService,
      userService
    } = ctx

    const user = await userService.getUser(session.user)
    if (!user) {
      res.status(500).send('User not found')
      return
    }

    const star = await starService.claimStar(id, user)

    if (!star) {
      res.status(404).send(`Star ${id} not found`)
    }
    res.json(star)

  }

const getTaxPayments = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
    
    const { id } = req.params

    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { starService } = ctx

    const star = await starService.getStar(id)
    if (!star) {
      res.status(404).send(`Star ${id} not found`)
      return
    }

    if (star.ownerId.toString() !== session.user) {
      console.log('Forbidden', star.ownerId, session.user)
      res.status(403).send('Forbidden')
      return
    }

    const taxPayments = await starService.getTaxPayments(id)
    
    res.json({ taxPayments })

  }

const routes: AppRoute[] = [
  {
    path: '/stars',
    method: 'GET',
    handler: getStars
  },
  {
    path: '/stars/:id',
    method: 'GET',
    handler: getStar
  },
  {
    path: '/stars/:id/taxes',
    method: 'GET',
    handler: getTaxPayments,
    middleware: [auth]
  },
  {
    path: '/stars/:id/:name',
    method: 'GET',
    handler: searchStars
  },
  {
    path: '/stars/:id/claim',
    method: 'GET',
    handler: claimStar
  },
  {
    path: '/stars',
    method: 'POST',
    handler: createStar,
    middleware: [admin]
  },
  {
    path: '/stars/:id',
    method: 'PUT',
    handler: updateStar,
    middleware: [admin]
  },
  {
    path: '/stars/:id/mint',
    method: 'PUT',
    handler: mintStarNft,
    middleware: [admin]
  },
  {
    path: '/stars/:id',
    method: 'DELETE',
    handler: deleteStar,
    middleware: [admin]
  }
]

export default routes
