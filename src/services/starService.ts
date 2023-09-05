import { NearestStar, Star, StarData, StarLocation, StarWithNeighbours } from 'solarwind-common/dist/model/star'
import { TaxPayment } from 'solarwind-common/dist/model/taxPayment'
import createKdTree from 'static-kdtree'
import { StarRepository } from '../data/postgres/starRepository'
import { camelToSnake, snakeToCamel } from '../utils/mapping.js'
import { BlockchainClient } from 'solarwind-blockchain/dist/src/client.js'
import { math } from 'solarwind-common'
import { star, tax_payment } from '../data/postgres/schema/model'
import { PartialRecord } from '../data/postgres/utils'
import { User } from 'solarwind-common/dist/model/user'
import { UserService } from './userService'
import { UserRepository } from '../data/postgres/userRepository'
import { findNearestStarsInAllOctants } from './distanceMapping.js'

export interface StarService {
  getStar: (starId: string) => Promise<StarWithNeighbours | null>
  claimStar: (starId: string, user: User) => Promise<Star | null>
  getAllStars: () => Promise<Star[]>
  getAllStarsWithNeighbours: () => Promise<StarWithNeighbours[]>
  getNearestStars: (starId: string) => Promise<NearestStar[]>
  searchStars: (name: string, from: Star) => Promise<NearestStar[]>
  createStar: (star: StarData) => Promise<StarWithNeighbours>
  updateStar: (starId: string, data: Record<string, any>) => Promise<StarWithNeighbours>
  mintStarNft: (starId: string) => Promise<number | null>
  updateNearestStars: (starId: string) => Promise<NearestStar[]>
  updateNearestStarsWithNeighbours: (starId: string) => Promise<NearestStar[]>
  deleteStar: (starId: string) => Promise<void>
  collectTax: (shipId: string, shipName: string, starId: string, amount: number) => Promise<void>
  getTaxPayments: (starId: string) => Promise<TaxPayment[]>
}

export function initialize(starRepository: StarRepository, userRepository: UserRepository, blockchainClient: BlockchainClient): StarService {

  const { mintStar, mintSLW, setStarLuminosity } = blockchainClient

  const service: StarService = {

    getAllStars: async () => {
      const dbStars = await starRepository.getStars()
      const stars = dbStars.map(star => mapStar(star))
      return stars
    },

    getAllStarsWithNeighbours: async () => {
      const dbStars = await starRepository.getStars()
      const stars = dbStars.map(star => mapStar(star))
      const starsWithNeighbours = await Promise.all(stars.map(async (star) => {
        const nearestStars = await service.getNearestStars(star.id)
        return {
          ...star,
          nearestStars
        }
      }))
      return starsWithNeighbours
    },

    getStar: async (starId) => {
      const dbStar = await starRepository.getStarById(starId)
      if (!dbStar) return null
      const nearestStars = await service.getNearestStars(starId)
      return {
        ...mapStar(dbStar),
        nearestStars
      }
    },

    claimStar: async (starId, user) => {
      
      const star = await service.getStar(starId)
      if (!star) return null

      const starOwnerPrivateKey = star.ownerId ? await userRepository.getPrivateKeyById(star.ownerId) : null
      await blockchainClient.claimStar(star.tokenId, user.address, starOwnerPrivateKey)
      await starRepository.updateStar(starId, { owner_id: user.id })
      return {
        ...star,
        ownerId: user.id
      }
    },

    getNearestStars: async (starId) => {
    
      const nearestStars = await starRepository.getNearestStars(starId)
      if (nearestStars.length === 0) return []
      const starIds = nearestStars.map((s) => s.nearest_star_id)
      const stars = await starRepository.getStars('id = ANY ($1::uuid[])', starIds)
      return nearestStars.map((nearestStar) => {
        const star = stars.find((s) => s.id?.toString() === nearestStar.nearest_star_id.toString())
        return {
          // Should always be fine, since it's in the result set of the query
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ...mapStar(star!),
          distance: nearestStar.distance 
        }
      })

    },

    searchStars: async (name: string, from?: Star) => {
      const stars = await starRepository.getStars(`NAME LIKE '%${name}%'`)
      return stars.map((star) => {
        const distance = math.calculateDistance(from || { x: 0, y: 0, z: 0 }, star)
        return {
          ...mapStar(star),
          distance
        }
      }).sort((a, b) => a.distance - b.distance)
    },

    createStar: async (star) => {
    
      const starLocation = math.getStarLocation(star.ra, star.dec, star.parallax, star.pmRa, star.pmDec)
      const dbStar = camelToSnake({ ...star, ...starLocation }) as star
      const starId = await starRepository.createStar({ ...dbStar, ship_count: 0 })

      await service.updateNearestStarsWithNeighbours(starId)
      const createdStar = await service.getStar(starId)

      // Should always be fine, since we just created it
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return createdStar!

    },

    updateStar: async (starId, data) => {
    
      const currentStar = await service.getStar(starId)
      if (!currentStar) throw new Error(`Star with id ${starId} not found`)

      let starLocation: StarLocation | null = null
      if (data.ra && data.dec && data.parallax && data.pmRa && data.pmDec) {
        starLocation = math.getStarLocation(data.ra, data.dec, data.parallax, data.pmRa, data.pmDec)
      }

      const dbStar = camelToSnake({ ...data, ...(starLocation || {}) }) as PartialRecord<star>
      await starRepository.updateStar(starId, dbStar)

      if (
        starLocation) {
        //(starLocation.x !== currentStar.x || starLocation.y !== currentStar.y || starLocation.z !== currentStar.z)) {
        await service.updateNearestStarsWithNeighbours(starId)
      }

      const updatedStar = await service.getStar(starId)
      
      // Should never happen
      if (!updatedStar) throw new Error(`Updated star with id ${starId} not found`)
      
      if (updatedStar.luminosity && updatedStar.luminosity !== currentStar.luminosity) {
        console.log('Updating luminosity on blockchain...')
        await setStarLuminosity(updatedStar.tokenId, Math.round(updatedStar.luminosity * 1000000))
        console.log('Done.')
      }
      
      return updatedStar

    },

    mintStarNft: async (starId) => {
    
      const tokenId = await mintStar(starId)
      console.log(`Mint Star NFT ${tokenId} for star ${starId}`)

      if (tokenId) {
        await starRepository.updateStar(starId, { token_id: tokenId })
      }
      
      return tokenId

    },

    updateNearestStars: async (starId) => {

      const star = await starRepository.getStarById(starId)
      if (!star) return []

      await starRepository.deleteNearestStars(starId)

      const allStars = (await service.getAllStars()).filter((s) => {
        return s.id !== starId 
      })
      const nearestStars = await findNearestStars(star.name, mapStar(star), allStars)

      return Promise.all(nearestStars.map(async (nearestStar) => {

        const distance = math.calculateDistance(star, nearestStar)
        await starRepository.createNearestStar({
          star_id: starId,
          nearest_star_id: nearestStar.id,
          distance
        })

        const updatedNearestStar = await starRepository.getStarById(nearestStar.id)

        return {
          // Should always be fine, since we just created it
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ...mapStar(updatedNearestStar!),
          distance
        }

      }))

    },

    updateNearestStarsWithNeighbours: async (starId) => {
      
      const star = await starRepository.getStarById(starId)
      if (!star) return []

      const nearestStars = await service.updateNearestStars(starId)
      const maxDistance = Math.max(...nearestStars.map(star => star.distance))

      const allStars = (await service.getAllStars()).filter((s) => {
        return s.id !== starId 
      })

      updateStarsInRange(star, maxDistance, allStars, async (starId: string) => {
        await service.updateNearestStars(starId)
      })

      return nearestStars

    },

    deleteStar: async (starId) => {
      await starRepository.deleteStar(starId)
    },

    collectTax: async (shipId, shipName, starId, amount) => {

      const star = await starRepository.getStarById(starId)
      if (!star) return
      if (!star.owner_id) return

      const user = await userRepository.getUserById(star.owner_id.toString())
      if (!user) return

      await mintSLW(user.address, amount)
      await starRepository.createTaxPayment(shipId, shipName, starId, amount)
    
    },

    getTaxPayments: async(starId) => {
      const taxPayments = await starRepository.getTaxPayments(starId)
      return taxPayments.map(taxPayment => mapTaxPayment(taxPayment))
    }

  }

  return service

}

const findNearestStars = async (name: string, star: Star, stars: Star[]): Promise<Star[]> => {

  const nearestStars = findNearestStarsInAllOctants(star, stars, 10)
  return nearestStars

  /*
  const points = stars.map((star) => [star.x, star.y, star.z])
  const tree = createKdTree(points)
  const nearest = tree.knn([star.x, star.y, star.z], 10)
  return nearest.map(index => stars[index])
  */

}

const updateStarsInRange = (star: StarLocation, range: number, stars: Star[], update: (starId: string) => Promise<void>): void => {
  const points = stars.map((star) => [star.x, star.y, star.z])
  const tree = createKdTree(points)
  tree.rnn([star.x, star.y, star.z], range, function(idx) {
    update(stars[idx].id)
  })
}

const mapStar = (star: star): Star => {
  return snakeToCamel(star, { id: (id) => id.toString() }) as Star
}

const mapTaxPayment = (tax_payment: tax_payment): TaxPayment => {
  return snakeToCamel(tax_payment, { 
    id: (id) => id.toString(),
    shipId: (shipId) => shipId.toString(),
    starId: (starId) => starId.toString()
  }) as TaxPayment
}

export {
  findNearestStars
}