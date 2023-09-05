import pg from 'pg'
import express, { Request, Response } from 'express'
import session from 'express-session'
import cors from 'cors'
import bodyParser from 'body-parser'
import connectPgSession from 'connect-pg-simple'
import { getClientConfig } from 'solarwind-common/dist/session/postgres.js'
import { createAsyncRouter } from './router.js'

const app = express()

const { DB_HOST } = process.env
if (!DB_HOST) {
  throw new Error('Missing DB_HOST environment variable')
  process.exit(1)
}

const PostgresqlStore = connectPgSession(session)
const pgPool = new pg.Pool(getClientConfig())

app.use(session({
  store: new PostgresqlStore({
    pool: pgPool,
    tableName: 'sessions'
  }),
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}))

app.use(cors())
app.use(bodyParser.json())

createAsyncRouter().then((router) => {
  app.use('/', router)
})

const { API_HTTP_PORT = 3002 } = process.env
app.listen(API_HTTP_PORT, () => {
  console.log(`SOLARWIND-BACKEND running, PORT ${API_HTTP_PORT}`)
})