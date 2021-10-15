import path from 'path'
import { Connection, ConnectionOptions, createConnection } from 'typeorm'

export function getXApiDatabaseConnectionOptions(
  url: string,
): ConnectionOptions {
  return {
    type: 'postgres',
    url,
    synchronize: false,
    entities: [
      path.join(__dirname, './entities/*.ts'),
      path.join(__dirname, './entities/*.js'),
    ],
  }
}

export async function connectToXApiDatabase(url: string): Promise<Connection> {
  console.log('🐘 Attempting connection')
  try {
    const connection = await createConnection(
      getXApiDatabaseConnectionOptions(url),
    )
    console.info('🐘 Connected to postgres: XApi database')
    return connection
  } catch (e) {
    console.error(
      `❌ Failed to connect or initialize postgres: XApi database ${url}`,
    )
    throw e
  }
}
