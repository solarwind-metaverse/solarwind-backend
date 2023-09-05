type TxFunction = (value: string) => any
type Transforms = { [key: string]: string | TxFunction }

export function snakeToCamel(obj: Record<string, any>, transforms?: Transforms): Record<string, any> {

  const newObj: Record<string, any> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = key.replace(/(_\w)/g, m => m[1].toUpperCase())
      processObjectValue(newObj, newKey, obj[key], transforms)
    }
  }

  return newObj

}

export function camelToSnake(obj: Record<string, any>, transforms?: Transforms): Record<string, any> {
  const newObj: Record<string, any> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      let newKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)
      if (newKey.startsWith('_')) {
        newKey = newKey.substring(1)
      }
      processObjectValue(newObj, newKey, obj[key], transforms)
    }
  }

  return newObj

}

function processObjectValue(obj: Record<string, any>, key: string, value: any, transforms?: Transforms) {
  
  if (value !== null && !isNaN(value) && !(value instanceof Date)) {
    if (!value.toString().startsWith('0x')) {
      value = Number(value)
    }
  }
  
  obj[key] = value
  
  if (transforms && transforms[key]) {
    if (typeof transforms[key] === 'function') {
      obj[key] = (transforms[key] as TxFunction)(obj[key])
    } else if (typeof transforms[key] === 'string') {
      if (transforms[key] === 'omit') {
        delete obj[key]
      }
    }
  }

}
