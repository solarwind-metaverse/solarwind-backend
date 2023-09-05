import fs from 'fs'
import pg from 'pg'

export const createDbConnection = (dbHost?: string): pg.Client => {

  const { DB_HOST, DB_USER, DB_PASSWORD } = process.env

  const host = dbHost || DB_HOST

  console.log('Establishing PostgreSQL connection', `${DB_USER}@${host}`)
  if (!host) throw new Error('Host not provided for Cassandra connection')

  const dbConfig = {
    user: DB_USER,
    host,
    database: 'solarwind',
    password: DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false,
      ca: fs.readFileSync('certs/ca-certificate.pem'),
      key: fs.readFileSync('certs/client-key.pem'),
      cert: fs.readFileSync('certs/client-cert.pem'),
    }
  }

  const client = new pg.Client(dbConfig)
  client.connect().then(() => {
    console.log('Connected to PostgreSQL')
  })

  return client

}