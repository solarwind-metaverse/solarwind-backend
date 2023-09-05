import cassandra from 'cassandra-driver'
import { user, event, ship } from './schema/model.js'
import { selectFirst, select, generateCassandraInsertQuery, insert, generateCassandraUpdateQuery, execute } from './utils.js'

export interface EventRepository {
  getById: (id: string) => Promise<event | null>
  getByUserId: (userId: string) => Promise<event[]>,
  createEvent: (event: event) => Promise<string>,
  updateEvent: (id: string, event: Partial<event>) => Promise<void>
}

export const initialize = (db: cassandra.Client): EventRepository => {

  return {

    getById: async (id) => {
      const event = await selectFirst<event>(db, 'SELECT id, user_id, type, text, seen, closed FROM solarwind.events WHERE id = ?', id)
      return event
    },

    getByUserId: async (userId) => {
      const events = await select<event>(db, 'SELECT id, user_id, type, text, seen, closed FROM solarwind.events WHERE user_id = ? AND closed = FALSE ALLOW FILTERING', userId)
      return events
    },

    createEvent: async (event: event) => {

      const [query, values] = generateCassandraInsertQuery<ship>('solarwind.events', event)
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    updateEvent: async (id, event) => {

      const [query, values] = generateCassandraUpdateQuery<event>('solarwind.events', id, event)
      console.log(query, values)
    
      await execute(
        db, query,
        ...values
      )
    
    }

  }

}