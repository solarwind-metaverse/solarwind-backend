import { UserRepository } from '../data/postgres/userRepository'
import { snakeToCamel } from '../utils/mapping.js'
import { BlockchainClient } from 'solarwind-blockchain/dist/src/client.js'
import { user } from '../data/postgres/schema/model'
import { User } from 'solarwind-common/dist/model/user'
import { EventService } from './eventService'

export interface UserService {
  getUser: (userId: string) => Promise<User | null>
  getUserSLWBalance: (userId: string) => Promise<number>
  burnSLW: (userId: string, amount: number) => Promise<number>
}

const mapUser = (user: user): User => {
  return snakeToCamel(user, { id: (id) => id.toString() }) as User
}

export function initialize(userRepository: UserRepository, eventService: EventService, blockchainClient: BlockchainClient): UserService {

  const { getSLWBalance, burnSLW } = blockchainClient

  const service: UserService = {

    getUser: async (userId) => {
      const dbUser = await userRepository.getUserById(userId)
      if (!dbUser) return null
      const events = await eventService.getEvents(userId)
      console.log('User events', events)
      return {
        ...mapUser(dbUser),
        events
      }
    },

    getUserSLWBalance: async (userId) => {
      
      const user = await service.getUser(userId)
      if (!user) throw new Error(`User ${userId} not found`)
      
      const balance = await getSLWBalance(user.address)
      return balance
    },

    burnSLW: async (userId, amount) => {
      
      const user = await service.getUser(userId)
      if (!user) throw new Error(`User ${userId} not found`)
      
      await burnSLW(user.address, amount)
      const balance = await getSLWBalance(user.address)

      return balance
    
    }

  }

  return service

}