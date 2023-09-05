import pg from 'pg'
import { user, event, ship } from './schema/model.js'
import { selectFirst, select, generatePostgresInsertQuery, insert, generatePostgresUpdateQuery, execute } from './utils.js'

export interface EventRepository {
  getById: (id: string) => Promise<event | null>
  getByUserId: (userId: string) => Promise<event[]>,
  createEvent: (event: event) => Promise<string>,
  updateEvent: (id: string, event: Partial<event>) => Promise<void>
}

export const initialize = (db: pg.Client): EventRepository => {

  return {

    getById: async (id) => {
      const event = await selectFirst<event>(db, 'SELECT id, user_id, type, text, seen, closed FROM events WHERE id = $1', id)
      return event
    },

    getByUserId: async (userId) => {
      const events = await select<event>(db, 'SELECT id, user_id, type, text, seen, closed FROM events WHERE user_id = $1 AND closed = FALSE', userId)
      return events
    },

    createEvent: async (event: event) => {

      const [query, values] = generatePostgresInsertQuery<ship>('events', event)
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    updateEvent: async (id, event) => {

      const [query, values] = generatePostgresUpdateQuery<event>('events', id, event)
      console.log(query, values)
    
      await execute(
        db, query,
        ...values
      )
    
    }

  }

}