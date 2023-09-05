import { UserRepository } from '../data/postgres/userRepository'
import { camelToSnake, snakeToCamel } from '../utils/mapping.js'
import { BlockchainClient } from 'solarwind-blockchain/dist/src/client.js'
import { user, event } from '../data/postgres/schema/model'
import { Event, EventData } from 'solarwind-common/dist/model/event'
import { EventRepository } from '../data/postgres/eventRepository.js'

export interface EventService {
  getEvent: (id: string) => Promise<Event | null>,
  getEvents: (userId: string) => Promise<Event[]>,
  createEvent: (event: EventData) => Promise<Event>,
  dismissEvent: (id: string) => Promise<void>
}

const mapEvent = (event: event): Event => {
  return snakeToCamel(event, { id: (id) => id.toString() }) as Event
}

export function initialize(eventRepository: EventRepository): EventService {

  const service: EventService = {

    getEvent: async (id) => {
      const dbEvent = await eventRepository.getById(id)
      if (!dbEvent) return null
      else return mapEvent(dbEvent)
    },

    getEvents: async (userId) => {
      const events = await eventRepository.getByUserId(userId)
      return events.map(event => mapEvent(event))
    },

    createEvent: async (event) => {
    
      const dbEvent = camelToSnake(event) as event
      const eventId = await eventRepository.createEvent(dbEvent)

      const createdEvent = await service.getEvent(eventId)

      // Should always be fine, since we just created it
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return createdEvent!

    },
    
    dismissEvent: async (id) => {
      await eventRepository.updateEvent(id, { seen: true, closed: true })
    }

  }

  return service

}