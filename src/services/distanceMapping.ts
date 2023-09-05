import { Star, StarLocation } from 'solarwind-common/dist/model/star.js'
import createKdTree from 'static-kdtree'
import * as d3 from 'd3-octree'

const findNearestStars = (star: Star, stars: Star[], limit?: number): Star[] => {
  
  console.log(`find nearest to ${star.name} from ${stars.length} stars`)
  const points = stars.map((star) => [star.x, star.y, star.z])
  const tree = createKdTree(points)

  const nearest = tree.knn([star.x, star.y, star.z], limit || 10)
  return nearest.map(index => stars[index])

}


const findNearestStarsInAllOctants = (star: Star, stars: Star[], limitTarget: number): Star[] => {
  
  
  console.log(`find nearest in all quadrants to ${star.name} from ${stars.length} stars`)

  const points = stars.map((star) => [star.x, star.y, star.z])
  // const tree = createKdTree(points)
  
  const tree = d3.octree()
    .x(function (d: any) { return d.x })
    .y(function (d: any) { return d.y })
    .z(function (d: any) { return d.z })
    .addAll(stars)

  console.log('Stars num', stars.length)

  type Octant = {
    id: number;
    xmin: number; ymin: number; zmin: number;
    xmax: number; ymax: number; zmax: number; 
  }

  type OctantResult = {
    id: number
    stars: Star[]
  }

  const allOctants: Octant[] = [
    {
      id: 1,
      xmin: -1, ymin: 0, zmin: -1,
      xmax: 0, ymax: 1, zmax: 0
    },
    {
      id: 2,
      xmin: -1, ymin: 0, zmin: 0,
      xmax: 0, ymax: 1, zmax: 1
    },
    {
      id: 3,
      xmin: -1, ymin: -1, zmin: -1,
      xmax: 0, ymax: 0, zmax: 0
    },
    {
      id: 4,
      xmin: -1, ymin: -1, zmin: 0,
      xmax: 0, ymax: 0, zmax: 1
    },

    {
      id: 5,
      xmin: 0, ymin: 0, zmin: -1,
      xmax: 1, ymax: 1, zmax: 0
    },
    {
      id: 6,
      xmin: 0, ymin: 0, zmin: 0,
      xmax: 1, ymax: 1, zmax: 1
    },
    {
      id: 7,
      xmin: 0, ymin: -1, zmin: -1,
      xmax: 1, ymax: 0, zmax: 0
    },
    {
      id: 8,
      xmin: 0, ymin: -1, zmin: 0,
      xmax: 1, ymax: 0, zmax: 1
    }

  ]
  
  type Node = {
    data: any
    length: number
    next: Node
  }


  let resultOctants: OctantResult[] = []

  let currentDistance = 10

  const iterateOctants = (octants: Octant[], distance: number): Octant[] => {

    const emptyOctants = []

    for (let i = 0; i < octants.length; i++) {
    
      const { xmin, xmax, ymin, ymax, zmin, zmax } = octants[i]
      
      const { x, y, z } = star

      const ds = [
        x + (xmin * distance), y + (ymin * distance), z + (zmin * distance),
        x + (xmax * distance), y + (ymax * distance), z + (zmax * distance)
      ]

      const starsInOctant: Star[] = []
  
      tree.visit(function(node: Node, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
        if (!node.length) {
          do {
            const d = node.data;
            if (
              d.x >= ds[0] && d.x < ds[3] &&
              d.y >= ds[1] && d.y < ds[4] &&
              d.z >= ds[2] && d.z < ds[5]
            ) {
              starsInOctant.push(d);
            }
          } while (node = node.next);
        }
        return x1 >= ds[3] || y1 >= ds[4] || z1 >= ds[5] || x2 < ds[0] || y2 < ds[1] || z2 < ds[2];
      })
  
      if (starsInOctant.length > 0) {
        resultOctants.push({ id: octants[i].id, stars: starsInOctant })
        console.log(`OCTANT[${octants[i].id}] (${ds[0]}, ${ds[1]}, ${ds[2]}) x (${ds[3]}, ${ds[4]}, ${ds[5]}) @ ${distance}`)
        console.log(starsInOctant.map(s => s.name))
      } else {
        // console.log(`OCTANT[${octants[i].id}] (${ds[0]}, ${ds[1]}, ${ds[2]}) x (${ds[3]}, ${ds[4]}, ${ds[5]}) is empty`)
        emptyOctants.push(octants[i])
      }
  
    }

    return emptyOctants

  }

  let remainingOctants = [...allOctants]

  while (remainingOctants.length > 0 && currentDistance < 1000) {
    remainingOctants = iterateOctants(remainingOctants, currentDistance)
    currentDistance += 10
  }
  
  console.log(`Found stars in ${resultOctants.length} octants, scan depth ${currentDistance} parsecs`)
  resultOctants = resultOctants.sort((a, b) => a.stars.length - b.stars.length)

  const result: Star[] = []

  const limitPerOctant = Math.ceil(limitTarget / resultOctants.length)

  let limit = limitPerOctant
  let deficit = 0

  for (const octant of resultOctants) {

    limit += deficit

    const nearestStars = findNearestStars(star, octant.stars, limit)
    result.push(...nearestStars)
    console.log(`Adding from OCTANT ${octant.id}: ${nearestStars.length} stars`)

    if (nearestStars.length < limit) {
      deficit = limitPerOctant - nearestStars.length
    }

    console.log(`OCTANT[${octant.id}]:`, octant.stars.length, `(L=${limit}`, `D=${deficit})`)
  
  }

  return result

}

export {
  findNearestStars,
  findNearestStarsInAllOctants
}