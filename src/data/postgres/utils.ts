import pg from 'pg'

export type PartialRecord<T> = {
    [P in keyof T]?: T[P];
}

function getUpdateExpression<T>(fields: PartialRecord<T>): {
  columnNames: string[],
  values: any[]
} {

  const values = []
  const columnNames = []
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      columnNames.push(key)
      values.push(value)
    }
  }

  return {
    columnNames,
    values
  }

}

export const execute = async (db: pg.Client, query: string, ...params: any): Promise<pg.QueryResult> => {
  const result = (params && params.length > 0) ?
    await db.query(query, params) : await db.query(query)
  return result
}

export const select = async <T>(db: pg.Client, query: string, ...params: any): Promise<T[]> => {
  const result = await execute(db, query, ...params)
  return result.rows.map(row => row as T)
}

export const selectFirst = async <T>(db: pg.Client, query: string, ...params: any): Promise<T | null> => {
  const results = await select<T>(db, query, ...params)
  return results.length > 0 ? results[0] : null
}

export const insert = async <T>(db: pg.Client, query: string, ...params: any): Promise<string> => {
  const { rows } = await execute(db, query, ...params)
  return rows[0].id
}

export function generatePostgresUpdateQuery<T>(
  table: string,
  id: string,
  fields: PartialRecord<T>
): [string, any[]] {

  const { columnNames, values } = getUpdateExpression<T>(fields)
  const pairs = columnNames.map((columnName, i) => `${columnName} = $${i + 1}`).join(',')
  let query = `UPDATE ${table} SET ${pairs} WHERE id = $${columnNames.length + 1}`
  return [query, values.concat(id)]

}

export function generatePostgresInsertQuery<T>(
  table: string,
  fields: PartialRecord<T>
): [string, any[]] {
  
  const { columnNames, values } = getUpdateExpression<T>(fields)

  const columns = columnNames.join(', ')
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
  const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING id`
  
  return [query, values]
  
}
  
  