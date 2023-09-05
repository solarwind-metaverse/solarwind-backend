import express, { Request, Response } from 'express'
import cassandra from 'cassandra-driver'
import pg from 'pg'
import { IPFSHTTPClient } from 'ipfs-http-client'
import { createDbConnection } from './data/postgres/postgres.js'
import account from './routes/account.js'
import events from './routes/events.js'
import stars from './routes/stars.js'
import ships from './routes/ships.js'
import users from './routes/users.js'
import ping from './routes/ping.js'
import { BlockchainClient, initializeMock as initBlockchainClient } from 'solarwind-blockchain/dist/src/client.js'
import { initialize as initStarRepository } from './data/postgres/starRepository.js'
import { initialize as initShipRepository } from './data/postgres/shipRepository.js'
import { initialize as initUserRepository } from './data/postgres/userRepository.js'
import { initialize as initEventRepository } from './data/postgres/eventRepository.js'
import { StarService, initialize as initStarService } from './services/starService.js'
import { ShipService, initialize as initShipService } from './services/shipService.js'
import { UserService, initialize as initUserService } from './services/userService.js'
import { EventService, initialize as initEventService } from './services/eventService.js'
import { createIpfsClient } from './ipfsClient.js'

export type RouteHandler = (ctx: RouterContext) => (req: Request, res: Response) => Promise<void>

export type AppRoute = {
  method: string
  path: string
  handler: RouteHandler
  middleware?: Array<(ctx: RouterContext) => (req: Request, res: Response, next: () => void) => void>
}

export type RouterContext = {
  db: pg.Client,
  ipfsClient: IPFSHTTPClient,
  starService: StarService,
  shipService: ShipService,
  userService: UserService,
  eventService: EventService
}

export const createAsyncRouter = async (): Promise<express.Router> => {
  return initBlockchainClient()
    .then((blockchainClient) => {
      return createRouter(blockchainClient)
    })
}

export const createRouter = (blockchain: BlockchainClient) => {

  const router = express.Router()

  const db = createDbConnection()
  const ipfsClient = createIpfsClient()

  const starRepository = initStarRepository(db)
  const shipRepository = initShipRepository(db)
  const userRepository = initUserRepository(db)
  const eventRepository = initEventRepository(db)

  const eventService = initEventService(eventRepository)
  const userService = initUserService(userRepository, eventService, blockchain)
  const starService = initStarService(starRepository, userRepository, blockchain)
  const shipService = initShipService(shipRepository, userService, starService, eventService, blockchain)
  
  const ctx = {
    db,
    ipfsClient,
    starService,
    shipService,
    userService,
    eventService
  }
  
  const routes = [
    ...account,
    ...events,
    ...stars,
    ...ships,
    ...users,
    ...ping
  ]

  const handleRoute = (handler: RouteHandler) => {
    return (ctx: RouterContext) => 
      async (req: Request, res: Response) => {
        try {
          await handler(ctx)(req, res)
        } catch (err: any) {
          console.error('Route handling error', err)
          res.status(500).send({ error: err.message })
        }
      }
  }

  routes.forEach(route => {

    const { path, method, middleware, handler } = route

    const apiPath = `/api${path}`
    const routeParams = [...(middleware || []).map(m => m(ctx)), handleRoute(handler)(ctx) ]

    if (method === 'GET') router.get(apiPath, ...routeParams)
    else if (method === 'POST') router.post(apiPath, ...routeParams)
    else if (method === 'PUT') router.put(apiPath, ...routeParams)
    else if (method === 'DELETE') router.delete(apiPath, ...routeParams)
    else console.info(`Skipping ${method} ${apiPath}, unknown method`)

  })

  return router

}