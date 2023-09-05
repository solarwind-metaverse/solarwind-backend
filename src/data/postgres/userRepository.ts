import pg from 'pg'
import { user } from './schema/model.js'
import { selectFirst } from './utils.js'

export interface UserRepository {
  getUserById: (id: string) => Promise<user | null>
  getUserByAddress: (address: string) => Promise<user | null>
  getPrivateKeyById: (id: string) => Promise<string | null>
}

export const initialize = (db: pg.Client): UserRepository => {

  return {

    getUserById: async (id) => {
      const user = await selectFirst<user>(db, 'SELECT id, email, address FROM users WHERE id = $1', id)
      return user
    },

    getUserByAddress: async (address) => {
      const user = await selectFirst<user>(db, 'SELECT id, address FROM users WHERE address = $1', address)
      return user
    },

    getPrivateKeyById: async (id) => {
      const user = await selectFirst<user>(db, 'SELECT id, private_key FROM users WHERE id = $1', id)
      return user?.private_key || null
    },

  }

}