import cassandra from 'cassandra-driver'
import { star, nearest_star, tax_payment } from './schema/model.js'
import { insert, select, execute, PartialRecord, generateCassandraUpdateQuery, selectFirst, generateCassandraInsertQuery } from './utils.js'
import { CQLParamType } from './types.js'

const STAR_COLUMNS = `
  id,
  edr3_id,
  ra,
  dec,
  pm_ra,
  pm_dec,
  parallax,
  x, y, z,
  mass,
  radius,
  temperature,
  magnitude,
  luminosity,
  evolutionary_stage,
  spectral_type,
  age,
  name,
  token_id,
  owner_id,
  ship_count
`

export interface StarRepository {
  getStarById: (id: string) => Promise<star | null>
  getStars: (where?: string, ...params: CQLParamType[]) => Promise<star[]>
  createStar: (star: star) => Promise<string>
  updateStar: (id: string, star: PartialRecord<star>) => Promise<void>
  deleteStar: (id: string) => Promise<void>
  createNearestStar: (nearestStar: nearest_star) => Promise<string>
  deleteNearestStars: (starId: string) => Promise<void>
  getNearestStars: (starId: string) => Promise<nearest_star[]>
  createTaxPayment: (starId: string, shipId: string, shipName: string, amount: number) => Promise<string>
  getTaxPayments: (starId: string) => Promise<tax_payment[]>
}

export const initialize = (db: cassandra.Client): StarRepository => {

  const repository: StarRepository = {

    getStarById: async (id: string) => {
  
      const query = `
        SELECT 
          ${STAR_COLUMNS}
        FROM solarwind.stars
        WHERE id = ?`
      
      const star = await selectFirst<star>(db, query, id)
    
      return star
    
    },

    getStars: async (where?: string, ...params: CQLParamType[]) => {
  
      let query = `
        SELECT 
          ${STAR_COLUMNS}
        FROM solarwind.stars`
    
      if (where) {
        query += ` WHERE ${where}`
      }

      const result = await select<star>(db, query, ...params)
    
      return result
    
    },

    createStar: async (star) => {


      const [query, values] = generateCassandraInsertQuery<star>('solarwind.stars', star)
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    updateStar: async (id, star) => {

      const [query, values] = generateCassandraUpdateQuery<star>('solarwind.stars', id, star)
    
      await execute(
        db, query,
        ...values
      )
    
    },

    deleteStar: async (id) => {
      const query = 'DELETE FROM solarwind.stars WHERE id = ?'
      await execute(db, query, id)
    },

    createNearestStar: async (nearestStar) => {
      const query = `
        INSERT INTO solarwind.nearest_stars (star_id, distance, nearest_star_id)
        VALUES (?, ?, ?);`
    
      const uuid = await execute(
        db, query,
        nearestStar.star_id, nearestStar.distance, nearestStar.nearest_star_id
      )
    
      return uuid.toString()
    
    },

    deleteNearestStars: async (starId) => {
      const query = 'DELETE FROM solarwind.nearest_stars WHERE star_id = ?;'
      await execute(db, query, starId)
    },

    getNearestStars: async (starId) => {
      const result = await select<nearest_star>(db, 'SELECT star_id, nearest_star_id, distance FROM solarwind.nearest_stars WHERE star_id = ? ORDER BY distance ASC', starId)
      return result
    },

    createTaxPayment: async (shipId: string, shipName: string, starId: string, amount: number) => {

      console.log('createTaxPayment', shipId, shipName, starId, amount)
      const [query, values] = generateCassandraInsertQuery<tax_payment>('solarwind.tax_payments', {
        ship_id: shipId,
        ship_name: shipName,
        star_id: starId,
        amount: amount,
        timestamp: new Date()
      })
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    getTaxPayments: async (starId) => {
      const result = await select<tax_payment>(db, 'SELECT id, ship_id, ship_name, star_id, amount, timestamp FROM solarwind.tax_payments WHERE star_id = ? ORDER BY timestamp DESC LIMIT 10', starId)
      return result
    },

  }

  return repository

}