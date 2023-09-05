import { types } from 'cassandra-driver'
import { createDbConnection } from './cassandra.js'
import migrations from './schema/migrations.js'

const currentVersion = 0

const cassandra = createDbConnection()

const execute = async (migration: string) => {
  const result = await cassandra.execute(migration)
  return result
}

export const runMigration = async (version: number, revert: boolean): Promise<types.ResultSet[]> => {
    
  if (version > 0) {
    await execute('USE solarwind;')
  }

  const results = []
  const migration = migrations[version]
  const operations = migration[revert ? 'revert' : 'migrate']
  for (let i = 0; i < operations.length; i++) {
    const result = await execute(operations[i])
    results.push(result)
  }
    
  return results

}

export const copyTable = async (tableFrom: string, tableTo: string): Promise<types.ResultSet> => {
    
  await execute('USE solarwind;')

  const result = await execute(`SELECT * FROM ${tableFrom};`)

  const columns = result.columns.map(col => col.name).join(', ')
  console.log(columns)
  for (const row of result.rows) {
    //const query = `INSERT INTO ${tableTo} (${columns}) VALUES (${row.values().map((v: any) => '?').join(', ')});`
    const query = `INSERT INTO solarwind.${tableTo} (${columns}) VALUES (${row.values().map((v: any, i: number) => {
      if (!v) return 'NULL'
      else if (i !== 0 && isNaN(v)) return `'${v}'`
      else return v
    }).join(', ')});`
    console.log(query)
    //await cassandra.execute(query, row.values(), { prepare: true })
  } 

  return result

}