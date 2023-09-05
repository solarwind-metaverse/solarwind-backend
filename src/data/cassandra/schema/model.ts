import cassandra from 'cassandra-driver'

export type user = {
    id: string | cassandra.types.dataTypes.uuid
    email: string
    address: string
    private_key?: string
}

export type star = {
    id?: string | cassandra.types.dataTypes.uuid
    edr3_id: number
    ra: string
    dec: string
    pm_ra: number
    pm_dec: number
    parallax: number
    x: number
    y: number
    z: number
    mass: number
    radius: number
    temperature: number
    magnitude: number
    luminosity: number
    evolutionary_stage: string
    spectral_type: string
    age: number
    name: string
    token_id: number
    owner_id: string | cassandra.types.dataTypes.uuid
    ship_count: number
}

export type nearest_star = {
    id?: string | cassandra.types.dataTypes.uuid
    star_id: string | cassandra.types.dataTypes.uuid
    nearest_star_id: string | cassandra.types.dataTypes.uuid
    distance: number
    direction?: string
}

export type star_designation = {
    id?: string | cassandra.types.dataTypes.uuid
    star_id: string | cassandra.types.dataTypes.uuid
    designation: string
}

export type ship = {
    id?: string | cassandra.types.dataTypes.uuid
    owner_id: string | cassandra.types.dataTypes.uuid
    star_id: string | cassandra.types.dataTypes.uuid | null
    target_star_id: string | cassandra.types.dataTypes.uuid | null
    star_name: string | null
    target_star_name: string | null
    health: number
    status: number
    last_harvested: Date
    speed: number
    fuel: number
    name: string
    token_id: number
}

export type event = {
  id?: string | cassandra.types.dataTypes.uuid
  user_id: string | cassandra.types.dataTypes.uuid
  type: number
  text: string
  seen: boolean
  closed: boolean
}

export type tax_payment = {
  id?: string | cassandra.types.dataTypes.uuid
  ship_id: string | cassandra.types.dataTypes.uuid
  ship_name: string
  star_id: string | cassandra.types.dataTypes.uuid
  amount: number,
  timestamp: Date
}