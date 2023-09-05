import { CID } from 'ipfs-http-client'
import { createIpfsClient } from '../../ipfsClient.js'

const client = createIpfsClient()

const concatUint8Arrays = (arrays: Uint8Array[]) => {
  let totalLength = 0
  for (const array of arrays) {
    totalLength += array.length
  }
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const array of arrays) {
    result.set(array, offset)
    offset += array.length
  }
  return result
}

export const createDirectory = async (dirPath: string): Promise<CID> => {
  try {
    const statResult = await client.files.stat(dirPath)
    console.log('Directory already exists', statResult.cid)
    return statResult.cid
  } catch (error) {
    await client.files.mkdir(dirPath, { parents: true })
    const statResult = await client.files.stat(dirPath)
    console.log('Directory created', statResult.cid)
    return statResult.cid
  }
}

export const readFileByDirCid = async (cid: string, filePath: string) => {
  const chunks = []
  for await (const chunk of client.files.read(`/ipfs/${cid}/${filePath}`)) {
    chunks.push(chunk)
  }
  console.log('chunks size', chunks.length)
  const fileContent = new TextDecoder().decode(concatUint8Arrays(chunks))
  console.log('fileContent', fileContent)
  return fileContent
}

export const appendToFileByDirCid = async (dirCid: string, filePath: string, content: string): Promise<string> => {
  const path = `/${dirCid}/${filePath}`
  const ipfsPath = `/ipfs${path}`
  try {
    const stat = await client.files.stat(ipfsPath)
    console.log('stat', stat)
    const fileContent = await readFileByDirCid(dirCid, filePath)
    const updatedContent = `${fileContent}\n${content}`
    console.log('updatedContent', updatedContent)
    const updateResult = await client.add({
      path,
      content: Buffer.from(updatedContent)
    }, { pin: true })
    console.log('appendResult', updateResult)
    return updateResult.cid.toString()
  } catch (error) {
    console.log(`Add to ${path}`)
    const addResult = await client.add({
      path,
      content: Buffer.from(content)
    }, { pin: true })
    console.log('addResult', addResult)
    return addResult.cid.toString()
  }
}

export default {
  createDirectory,
  appendToFileByDirCid,
  readFileByDirCid
}