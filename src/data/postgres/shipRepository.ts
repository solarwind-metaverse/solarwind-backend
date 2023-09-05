import pg from 'pg'
import { ship } from './schema/model.js'
import { select, insert, generatePostgresInsertQuery, execute, generatePostgresUpdateQuery, PartialRecord, selectFirst } from './utils.js'

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

export const initialize = (db: pg.Client): ShipRepository => {

  return {

    getShipById: async (id: string) => {
  
      const query = `
        SELECT 
          ${SHIP_COLUMNS}
        FROM ships
        WHERE id = $1`
      
      const ship = await selectFirst<ship>(db, query, id)
    
      return ship
    
    },

    getShipsByOwnerId: async (ownerId) => {
  
      const query = `
        SELECT 
          ${SHIP_COLUMNS}
        FROM ships WHERE owner_id = $1`
    
      const result = await select<ship>(db, query, ownerId)
    
      return result
    
    },

    getShipsByStarId: async (starId) => {
  
      const query = `
        SELECT 
          ${SHIP_COLUMNS}
        FROM ships WHERE star_id = $1`
    
      const result = await select<ship>(db, query, starId)
    
      return result
    
    },

    createShip: async (ship: ship) => {

      const [query, values] = generatePostgresInsertQuery<ship>('ships', ship)
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid
    
    },

    updateShip: async (id, ship) => {

      const [query, values] = generatePostgresUpdateQuery<ship>('ships', id, ship)
      console.log(query, values)
    
      await execute(
        db, query,
        ...values
      )
    
    }

  }

}