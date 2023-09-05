import pg from 'pg'
import { star, nearest_star, tax_payment } from './schema/model.js'
import { insert, select, execute, PartialRecord, generatePostgresUpdateQuery, selectFirst, generatePostgresInsertQuery } from './utils.js'
import { PostgresParamType } from './types.js'

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
  getStars: (where?: string, ...params: PostgresParamType[]) => Promise<star[]>
  createStar: (star: star) => Promise<string>
  updateStar: (id: string, star: PartialRecord<star>) => Promise<void>
  deleteStar: (id: string) => Promise<void>
  createNearestStar: (nearestStar: nearest_star) => Promise<string>
  deleteNearestStars: (starId: string) => Promise<void>
  getNearestStars: (starId: string) => Promise<nearest_star[]>
  createTaxPayment: (starId: string, shipId: string, shipName: string, amount: number) => Promise<string>
  getTaxPayments: (starId: string) => Promise<tax_payment[]>
}

export const initialize = (db: pg.Client): StarRepository => {

  const repository: StarRepository = {

    getStarById: async (id: string) => {
  
      const query = `
        SELECT 
          ${STAR_COLUMNS}
        FROM stars
        WHERE id = $1`
      
      const star = await selectFirst<star>(db, query, id)
    
      return star
    
    },

    getStars: async (where?: string, ...params: PostgresParamType[]) => {
  
      let query = `
        SELECT 
          ${STAR_COLUMNS}
        FROM stars`
    
      if (where) {
        query += ` WHERE ${where}`
      }

      console.log('PARAMS', params, ...params)
      const result = await select<star>(db, query, ...params)
    
      return result
    
    },

    createStar: async (star) => {


      const [query, values] = generatePostgresInsertQuery<star>('stars', star)
    
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    updateStar: async (id, star) => {

      const [query, values] = generatePostgresUpdateQuery<star>('stars', id, star)
    
      await execute(
        db, query,
        ...values
      )
    
    },

    deleteStar: async (id) => {
      const query = 'DELETE FROM stars WHERE id = $1'
      await execute(db, query, id)
    },

    createNearestStar: async (nearestStar) => {
      const query = `
        INSERT INTO nearest_stars (star_id, distance, nearest_star_id)
        VALUES ($1, $2, $3);`
    
      const uuid = await execute(
        db, query,
        nearestStar.star_id, nearestStar.distance, nearestStar.nearest_star_id
      )
    
      return uuid.toString()
    
    },

    deleteNearestStars: async (starId) => {
      const query = 'DELETE FROM nearest_stars WHERE star_id = $1;'
      await execute(db, query, starId)
    },

    getNearestStars: async (starId) => {
      const result = await select<nearest_star>(db, 'SELECT star_id, nearest_star_id, distance FROM nearest_stars WHERE star_id = $1 ORDER BY distance ASC', starId)
      return result
    },

    createTaxPayment: async (shipId: string, shipName: string, starId: string, amount: number) => {

      console.log('createTaxPayment', shipId, shipName, starId, amount)
      const [query, values] = generatePostgresInsertQuery<tax_payment>('tax_payments', {
        ship_id: shipId,
        ship_name: shipName,
        star_id: starId,
        amount: Math.ceil(amount),
        timestamp: new Date()
      })
    
      console.log(query, values)
      const uuid = await insert(
        db, query,
        ...values
      )
    
      return uuid.toString()
    
    },

    getTaxPayments: async (starId) => {
      console.log('getTaxPayments', starId)
      const result = await select<tax_payment>(db, 'SELECT id, ship_id, ship_name, star_id, amount, timestamp FROM tax_payments WHERE star_id = $1 ORDER BY timestamp DESC LIMIT 10', starId)
      return result
    },

  }

  return repository

}