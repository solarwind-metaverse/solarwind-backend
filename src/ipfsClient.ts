import { create, IPFSHTTPClient } from 'ipfs-http-client'

export const createIpfsClient = (): IPFSHTTPClient => {
  const { IPFS_URL } = process.env
  const client = create({ url: IPFS_URL })
  return client
}