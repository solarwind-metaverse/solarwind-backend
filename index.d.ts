import cassandra from 'cassandra-driver'

interface RequestContext {
  db: cassandra.Client
}

declare module 'express-serve-static-core' {
  interface Request {
    context: RequestContext
  }
}