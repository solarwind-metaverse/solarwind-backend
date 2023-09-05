import cassandra from 'cassandra-driver'

export type CQLParamType = string | number | cassandra.types.dataTypes.uuid | CQLParamType[]