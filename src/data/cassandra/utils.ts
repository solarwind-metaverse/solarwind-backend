import cassandra from 'cassandra-driver'

export type PartialRecord<T> = {
    [P in keyof T]?: T[P];
}

export const execute = async (db: cassandra.Client, query: string, ...params: any): Promise<cassandra.types.ResultSet> => {
  const result = (params && params.length > 0) ?
    await db.execute(query, params, { prepare: true }) : await db.execute(query)
  return result
}

export const select = async <T>(db: cassandra.Client, query: string, ...params: any): Promise<T[]> => {
  const result = await execute(db, query, ...params)
  return result.rows.map(row => row as T)
}

export const selectFirst = async <T>(db: cassandra.Client, query: string, ...params: any): Promise<T | null> => {
  const results = await select<T>(db, query, ...params)
  return results.length > 0 ? results[0] : null
}

export const insert = async <T>(db: cassandra.Client, query: string, ...params: any): Promise<cassandra.types.Uuid> => {
  const uuid = cassandra.types.Uuid.random()
  await execute(db, query, uuid, ...params)
  return uuid
}
  
export function generateCassandraUpdateQuery<T>(
  table: string,
  id: string,
  fields: PartialRecord<T>
): [string, any[]] {

  let query = `UPDATE ${table} SET `
  const values = []
  
  let i = 0
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      values.push(value)
      query += `${i === 0 ? '' : ','} ${key} = ?`
      i++
    }
  }
  
  values.push(id)
  query += ' WHERE id = ?'
  
  return [query, values]

}

export function generateCassandraInsertQuery<T>(
  table: string,
  fields: PartialRecord<T>
): [string, any[]] {
  
  const values = []
  let coulmns = ''
  let placeholders = ''

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      values.push(value)
      coulmns += `, ${key}`
      placeholders += ', ?'
    }
  }
  
  const query = `INSERT INTO ${table} (id${coulmns}) VALUES (?${placeholders})`
  
  return [query, values]
  
}
  
  