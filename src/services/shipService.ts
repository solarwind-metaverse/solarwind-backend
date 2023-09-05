import { ShipRepository } from '../data/postgres/shipRepository'
import { camelToSnake, snakeToCamel } from '../utils/mapping.js'
import { BlockchainClient } from 'solarwind-blockchain/dist/src/client.js'
import { ship } from '../data/postgres/schema/model'
import { PartialRecord } from '../data/postgres/utils'
import { Ship, ShipData } from 'solarwind-common/dist/model/ship'
import { Star, StarLocation } from 'solarwind-common/dist/model/star'
import { Event, EventData } from 'solarwind-common/dist/model/event'
import { math } from 'solarwind-common'
import { StarService } from './starService'
import { UserService } from './userService'
import { EventService } from './eventService'

export interface ShipService {
  getShip: (shipId: string) => Promise<Ship | null>
  getOwnedShips: (ownerId: string) => Promise<Ship[]>
  getShipsOnOrbit: (starId: string) => Promise<Ship[]>
  createShip: (ship: ShipData) => Promise<Ship>
  updateShip: (shipId: string, data: Record<string, any>) => Promise<Ship>
  sendShip: (shipId: string, from: Star, to: Star, fuel: number) => Promise<Ship>
  claimShip: (userId: string, name: string, cost?: number) => Promise<Ship>
  mintShipNft: (shipId: string, ownerAddress: string) => Promise<number | null>
  placeShipInOrbit: (shipId: string, star: Star) => Promise<void>
  collectHarvest: (shipId: string) => Promise<number>
  attackShip: (attackerId: string, targetId: string, power: number) => Promise<{ success: boolean, amount?: number }>
}

const mapShip = (ship: ship): Ship => {
  return snakeToCamel(ship, { id: (id) => id.toString() }) as Ship
}

const calculateHarvestAmount = (lastHarvest: Date | number, luminosity: number, numShips?: number): number =>  {

  const now = new Date()
  const secondsPassed = (now.getTime() - new Date(lastHarvest).getTime()) / 1000

  const luminosityLog2 = Math.log2(luminosity)
  const numShipsLog2 = Math.log2(1 + (numShips || 1))
  let multiplier = luminosityLog2 < 0 ? 1 / (1 + Math.abs(luminosityLog2)) : 1 + luminosityLog2
  multiplier = multiplier / numShipsLog2

  return Math.round(secondsPassed * multiplier)

}

const calculateArrivalDate = (slw: any, from: StarLocation, to: StarLocation, ffwd?: boolean): Date => {
  if (isNaN(slw)) throw new Error('Fuel ammount must be a number')
  const slwNumber = Number(slw)
  if (slwNumber < 1) throw new Error('Fuel ammount must be greater than 0')
  const distance = math.calculateDistance(from, to)
  const time = (distance * (ffwd ? 1 : (24 * 60 * 60))) / Number(slw)
  console.log('time', time)
  const arrivalTime = new Date(Date.now() + (time * 1000))
  return arrivalTime
}

const simulateAttack = (attacker: Ship, target: Ship, star: Star, fuel: number): { success: boolean; amount?: number } => {
  const rand = Math.round(100 * Math.random())
  const powerLog = fuel > 172800 ? Math.log2(fuel) : Math.log10(fuel);
  const powerThreshhold = 50 - powerLog

      if (rand > powerThreshhold) {
        return {
          success: true,
          amount: calculateHarvestAmount(target.lastHarvested, star.luminosity, star.shipCount)
        }
      } else {
        return {
          success: false
        }
      }
}

export function initialize(
  shipRepository: ShipRepository,
  userService: UserService,
  starService: StarService,
  eventService: EventService,
  blockchainClient: BlockchainClient): ShipService {

  const { mintShip, mintSLW, burnSLW, enterOrbit, harvest, attackShip } = blockchainClient

  const service: ShipService = {

    getShip: async (shipId) => {
      const dbShip = await shipRepository.getShipById(shipId)
      if (!dbShip) return null
      else return mapShip(dbShip)
    },

    getOwnedShips: async (ownerId: string) => {
      const dbShips = await shipRepository.getShipsByOwnerId(ownerId)
      const ships = dbShips.map(ship => mapShip(ship))
      return ships
    },

    getShipsOnOrbit: async (starId: string) => {
      const dbShips = await shipRepository.getShipsByStarId(starId)
      const ships = dbShips.map(ship => mapShip(ship))
      return ships
    },
    
    createShip: async (ship) => {
    
      const dbShip = camelToSnake(ship) as ship
      const shipId = await shipRepository.createShip(dbShip)

      const createdShip = await service.getShip(shipId)

      // Should always be fine, since we just created it
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return createdShip!

    },

    updateShip: async (shipId, data) => {
    
      const dbShip = camelToSnake(data) as PartialRecord<ship>
      await shipRepository.updateShip(shipId, dbShip)

      const updatedShip = await service.getShip(shipId)
      
      // Should always be fine, since we just updated it
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return updatedShip!

    },

    sendShip: async (shipId, from, to, fuel) => {

      const ship = await service.getShip(shipId)
      if (!ship) throw new Error(`Ship ${shipId} not found`)
      if (!ship.tokenId) throw new Error(`Ship ${shipId} does not have an NFT`)
      await service.updateShip(shipId, { status: 200 })

      const distance = math.calculateDistance(from, to)

      //const arrivalTime = await blockchainClient.sendShip(ship.tokenId, to.tokenId, distance, fuel, true)
      const arrivalTime = calculateArrivalDate(fuel, from, to, false).getTime() / 1000
      const user = await userService.getUser(ship.ownerId)

      try {
        await burnSLW(user!.address, fuel)
      } catch (err) {
        await service.updateShip(shipId, { status: 101 })
      }
      
      console.log(`Ship sent from ${from.name} to ${to.name} (distance: ${distance} parsecs) with arrival time ${arrivalTime}`)
      const updatedShip = await service.updateShip(shipId, {
        status: 201,
        star_id: null,
        star_name: null,
        target_star_name: to.name,
        target_star_id: to.id,
        arrival_time: new Date(arrivalTime * 1000).toISOString()
      })
      console.log('Ship will arrive', new Date(arrivalTime * 1000).toISOString())
      return updatedShip

    },

    claimShip: async (userId, name, cost) => {

      const { SOL_ID } = process.env
      if (!SOL_ID) {
        throw new Error('SOL_ID not set')
      }

      const user = await userService.getUser(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const ship = await service.createShip({
        name: name,
        ownerId: userId,
        starId: null,
        targetStarId: null,
        arrivalTime: null,
        starName: null,
        targetStarName: null,
        status: 0,
        lastHarvested: new Date(),
        speed: 0,
        fuel: 0,
        health: 100,
        tokenId: null
      })
  
      const sol = await starService.getStar(SOL_ID)
      if (!sol) {
        throw new Error('Sol not found')
      }
  
      service.mintShipNft(ship.id, user.address).then(async tokenId => {
        if (cost) {
          await userService.burnSLW(userId, cost)
        }
        return service.updateShip(ship.id, { tokenId, status: 801 })
      }).then(async ship => {
        console.log('Ship NFT minted, place in Solar orbit, Sol token ID:', sol.tokenId)
        await service.updateShip(ship.id, { status: 802 })
        let star = sol
        if (!sol.tokenId) {
          const tokenId = await starService.mintStarNft(sol.id)
          star = {
            ...sol,
            tokenId: Number(tokenId)
          }
        }
  
        return service.placeShipInOrbit(ship.id, star)
  
      }).then(() => {
        const shipCount = sol.shipCount || 0
        starService.updateStar(sol.id, { shipCount: shipCount + 1 })
        service.updateShip(ship.id, { status: 101, starName: 'Sol' })
      }).catch((err) => {
        console.log('Error while claiming new ship', err)
        service.updateShip(ship.id, { status: 900 })
      })

      return ship

    },

    mintShipNft: async (shipId, ownerAddress) => {
    
      console.log('Mint ship NFT', shipId, ownerAddress)
      const tokenId = await mintShip(shipId, ownerAddress)
      console.log('Ship NFT minted:', tokenId)
      if (tokenId) {
        await shipRepository.updateShip(shipId, { token_id: tokenId })
      }
      
      return tokenId

    },

    placeShipInOrbit: async (shipId, star) => {
    
      const ship = await service.getShip(shipId)
      if (!ship) throw new Error('Ship not found')
      if (!ship.tokenId) throw new Error('Ship not minted')
      console.log('Start orbit insertion')
      // await enterOrbit(ship.tokenId, star.tokenId)

      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          console.log('Orbit insertion complete')
          await shipRepository.updateShip(shipId, { 
            last_harvested: new Date(),
            star_id: star.id,
            star_name: star.name,
            target_star_id: null,
            target_star_name: null
          })
          resolve()
          console.log('Ship star updated')
        }, 6000)
      })

    },

    collectHarvest: async (shipId) => {
    
      const ship = await service.getShip(shipId)
      if (!ship) throw new Error('Ship not found')
      if (!ship.tokenId) throw new Error('Ship not minted')
      
      console.log('Start harvesting...')
      
      // const harvestedSlw = await harvest(ship.tokenId)
      const star = await starService.getStar(ship.starId!)
      const user = await userService.getUser(ship.ownerId)
      const harvestedSlw = calculateHarvestAmount(ship.lastHarvested, star!.luminosity, star!.shipCount)
       
      await mintSLW(user!.address, harvestedSlw)

      console.log('Harvested ' + harvestedSlw + ' SLW')
      await shipRepository.updateShip(shipId, { last_harvested: new Date() })
      console.log('Ship harvest time updated')

      const taxAmount = harvestedSlw / 100
      await starService.collectTax(ship.id, ship.name, star!.id, taxAmount)

      return harvestedSlw || 0

    },

    attackShip: async (attackerId, targetId, power) => {
    
      const attackingShip = await service.getShip(attackerId)
      if (!attackingShip) throw new Error('Attacking ship not found')
      if (!attackingShip.tokenId) throw new Error('Attacking ship not minted')

      const targetShip = await service.getShip(targetId)
      if (!targetShip) throw new Error('Target ship not found')
      if (!targetShip.tokenId) throw new Error('Target ship not minted')

      console.log('Attack...')

      // const attackResult = await attackShip(attackingShip.tokenId, targetShip.tokenId, power)
      // if (!attackResult) throw new Error('Attack failed')

      if (!targetShip.starId) throw new Error(`Target ship ${targetShip.id} not in orbit`)
      const balance = await userService.getUserSLWBalance(attackingShip.ownerId)
      if (balance < power) throw new Error(`Insufficient balance for attack`)
      const star = await starService.getStar(targetShip.starId)
      const attackResult = simulateAttack(attackingShip, targetShip, star!, power)
      const attacker = await userService.getUser(attackingShip.ownerId)
      const attackedUser = await userService.getUser(targetShip.ownerId)
      const attackerAddress = attacker?.address
      await burnSLW(attackerAddress!, power)
      if (attackResult.success && attackResult.amount) {
        await service.updateShip(targetId, { lastHarvested: new Date() })
        if (!attackerAddress) throw new Error('Attacker address not found')
        const event: EventData = {
          userId: attackedUser?.id!,
          type: 1,
          seen: false,
          closed: false,
          text: `${targetShip.name} was raided by ${attackingShip.name}. You lost ${attackResult.amount} SLW in the attack.`
        }
        eventService.createEvent(event)
        await mintSLW(attackerAddress, attackResult.amount)
      }

      console.log('Attack result', attackResult)
      return attackResult

    }

  }

  return service

}