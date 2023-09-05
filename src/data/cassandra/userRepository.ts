import cassandra from 'cassandra-driver'
import { user } from './schema/model.js'
import { selectFirst } from './utils.js'

export interface UserRepository {
  getUserById: (id: string) => Promise<user | null>
  getUserByAddress: (address: string) => Promise<user | null>
  getPrivateKeyById: (id: string) => Promise<string | null>
}

export const initialize = (db: cassandra.Client): UserRepository => {

  return {

    getUserById: async (id) => {
      const user = await selectFirst<user>(db, 'SELECT id, email, address FROM solarwind.users WHERE id = ?', id)
      return user
    },

    getUserByAddress: async (address) => {
      const user = await selectFirst<user>(db, 'SELECT id, address FROM solarwind.users WHERE address = ?', address)
      return user
    },

    getPrivateKeyById: async (id) => {
      const user = await selectFirst<user>(db, 'SELECT id, private_key FROM solarwind.users WHERE id = ?', id)
      return user?.private_key || null
    },

  }

}