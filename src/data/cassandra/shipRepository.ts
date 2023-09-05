import cassandra from 'cassandra-driver'
import { ship } from './schema/model.js'
import { select, insert, generateCassandraInsertQuery, execute, generateCassandraUpdateQuery, PartialRecord, selectFirst } from './utils.js'

const SHIP_COLUMNS = `
  id,
  owner_id,
  star_id,
  target_star_id,
  star_name,
  target_star_name,
  health,
  arrival_time,
  status,
  last_harvested,
  speed,
  fuel,
  name,
  token_id 
`
export interface ShipRepository {
  getShipById: (id: string) => Promise<ship | null>
  getShipsByOwnerId: (ownerId: string) => Promise<ship[]>
  getShipsByStarId: (starId: string) => Promise<ship[]>
  createShip: (ship: ship) => Promise<string>
  updateShip: (id: string, star: PartialRecord<ship>) => Promise<void>
}

export const initialize = (db: cassandra.Client): ShipRepository => {

  return {

    getShipById: async (id: string) => {
  
      const query = `
        SELECT 
          ${SHIP_COLUMNS}
        FROM solarwind.ships
        WHERE id = ?`
      
      const ship = await selectFirst<ship>(db, query, id)
    
      return ship
    
    },

    getShipsByOwnerId: async (ownerId) => {
  
      const query = `
        SELECT 
          ${SHIP_COLUMNS}
        FROM solarwind.ships WHERE owner_id = ?`
    
      const result = await select<ship>(db, query, ownerId)
    
      return result
    
    },

    getShipsByStarId: async (starId) => {
  
      const query = `
        SELECT 
          ${SHIP_COLUMNS}
        FROM solarwind.ships WHERE star_id = ?`
    
      const result = await select<ship>(db, query, starId)
    
      return result
    
    },

    createShip: async (ship: ship) => {

      const [query, values] = generateCassandraInsertQuery<ship>('solarwind.ships', ship)
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    updateShip: async (id, ship) => {

      const [query, values] = generateCassandraUpdateQuery<ship>('solarwind.ships', id, ship)
      console.log(query, values)
    
      await execute(
        db, query,
        ...values
      )
    
    }

  }

}