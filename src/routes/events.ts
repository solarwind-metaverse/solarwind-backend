import { Request, Response } from 'express'
import { RouterContext, AppRoute } from '../router'
import { auth } from '../middleware/auth.js'
import { getUserSession } from '../utils/session.js'

const getEvents = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { user: userId } = session
    const { eventService } = ctx
    const events = await eventService.getEvents(userId)

    res.json({ events })

  }

const dismissEvent = (ctx: RouterContext) => 
  async (req: Request, res: Response) => {
  
    const session = getUserSession(req)

    if (!session) {
      res.status(401).send('Unauthorized')
      return
    }

    const { user: userId } = session
    const { eventService } = ctx

    const { id } = req.params

    const event = await eventService.getEvent(id)
    if (!event) {
      res.status(404).send(`Event ${id} not found`)
      return
    }

    if (event.userId.toString() !== userId) {
      res.status(403).send(`Event ${id} does not belong to user ${userId}`)
      return
    }

    await eventService.dismissEvent(id)

    res.json({ status: 'OK' })

  }
 
const routes: AppRoute[] = [
  {
    path: '/events',
    method: 'GET',
    handler: getEvents,
    middleware: [auth]
  },
  {
    path: '/events/:id/dismiss',
    method: 'PUT',
    handler: dismissEvent,
    middleware: [auth]
  }
]

export default routes
