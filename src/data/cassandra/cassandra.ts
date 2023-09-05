import cassandra from 'cassandra-driver'

export const createDbConnection = (dbHost?: string): cassandra.Client => {
  
  const { DB_HOST } = process.env

  const host = dbHost || DB_HOST
  console.log('Establishing Cassandra connection to', host)
  if (!host) throw new Error('Host not provided for Cassandra connection')

  const client = new cassandra.Client({
    //contactPoints: [ '127.0.0.1' ],
    contactPoints: [ host ],
    credentials: { username: 'cassandra', password: 'eeL2Lvdz0z4q' },
    localDataCenter: 'datacenter1'
  })
      
  client.connect((err) => {
    if (err) {
      console.error(err)
      return
    }
    console.log('Connected to Cassandra')
  })

  return client

}