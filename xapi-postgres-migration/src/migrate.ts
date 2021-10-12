import {
  ScanCommand,
  ScanOutput,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { InsertResult, Connection } from 'typeorm'
import { Container as MutableContainer } from 'typedi'

import { XApiRecord } from './entities'
import { connectToXApiDatabase } from './connectToDatabase'
import { parser } from './argv'
import { checkIsUuid, getProdConfig, Config } from './utils'

interface DynamoTableKey {
  userId: string
  serverTimestamp: number
}

interface ScanResult {
  items?: XApiRecord[]
  lastEvaluatedKey?: DynamoTableKey
}

const setup = async (config: Config) => {
  const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
  })
  MutableContainer.set('dynamoClient', dynamoClient)

  const pgConnection = await connectToXApiDatabase(config.xapiPgDatabaseUrl)
  MutableContainer.set('pgConnection', pgConnection)
}

const teardown = async () => {
  const connection: Connection = MutableContainer.get('pgConnection')
  await connection.close()
}

export const readFromDynamoDb = async (
  tableName: string,
  startKey?: DynamoTableKey,
): Promise<ScanResult> => {
  const scanCmd = new ScanCommand({
    TableName: tableName,
    ExclusiveStartKey: startKey ? marshall(startKey) : undefined,
    Limit: Number(process.env.SCAN_LIMIT || 1000),
    ProjectionExpression: 'userId,serverTimestamp,xapi,ipHash,geo',
  })
  const dynamoClient: DynamoDBClient = MutableContainer.get('dynamoClient')
  const output: ScanOutput = await dynamoClient.send(scanCmd)

  const result = {
    items: output.Items
      ? output.Items.map((x) => unmarshall(x) as XApiRecord)
      : undefined,
    lastEvaluatedKey: output.LastEvaluatedKey
      ? (unmarshall(output.LastEvaluatedKey) as DynamoTableKey)
      : undefined,
  }
  return result
}

export const bulkImport = async (
  items: XApiRecord[],
  overwrite: boolean,
): Promise<InsertResult> => {
  const connection: Connection = MutableContainer.get('pgConnection')
  const query = connection
    .createQueryBuilder()
    .insert()
    .into(XApiRecord)
    .values(items)

  const result = overwrite
    ? query
        .orUpdate({
          conflict_target: ['user_id', 'server_timestamp'],
          overwrite: ['xapi', 'ip_hash', 'geo'],
        })
        .execute()
    : query.orIgnore().execute()
  return result
}

export const executeMigration = async ({
  dynamodbTableName,
  overwrite,
}: Config): Promise<void> => {
  let lastEvaluatedKey: DynamoTableKey | undefined = undefined
  // let lastEvaluatedKey: any = {
  //   userId: '2c0aa9c2-bd4e-4662-b5e2-990aba436eab',
  //   serverTimestamp: 1624613371030,
  // }
  let i = 0
  let totalImported = 0
  let totalInvalidUuid = 0
  do {
    i += 1
    console.log('\nlastEvaluatedKey:', lastEvaluatedKey)

    const result: ScanResult = await readFromDynamoDb(
      dynamodbTableName,
      lastEvaluatedKey,
    )
    lastEvaluatedKey = result.lastEvaluatedKey

    if (!result.items) {
      console.warn('No items found in DynamoDB table')
      continue
    }

    const items = result.items
    const chunkSize = Number(process.env.SQL_BATCH_INSERT_SIZE || 50)
    let invalidUuid = 0

    process.stdout.write('Inserting into Postgres')
    for (let j = 0; j < items.length; j += chunkSize) {
      const itemsChunk = items.slice(j, j + chunkSize).filter((item) => {
        const isUuid =
          item.userId && checkIsUuid(item.userId as unknown as string)
        if (!isUuid) {
          invalidUuid += 1
        }
        return isUuid
      })

      await bulkImport(itemsChunk, overwrite)
      process.stdout.clearLine(1)
      process.stdout.cursorTo(0)
      process.stdout.write(
        `${i}. Inserting into Postgres: ${j + itemsChunk.length}/${
          items.length
        }`,
      )
    }
    totalImported += items.length
    process.stdout.write(`. Found ${invalidUuid} records with invalid user_id`)
    totalInvalidUuid += invalidUuid
    process.stdout.write('\n')
  } while (lastEvaluatedKey)

  console.log(`\nTotal scanned:         ${totalImported}`)
  console.log(`Total imported:        ${totalImported - totalInvalidUuid}`)
  console.log(`Total invalid user_id: ${totalInvalidUuid}`)
  console.log('Done 🙌')
}

export const dryRunMigration = async (config: Config): Promise<void> => {
  const { dynamodbTableName } = config

  let lastEvaluatedKey = undefined
  let totalItemCount = 0
  do {
    const scanCmd = new ScanCommand({
      TableName: dynamodbTableName,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: Number(process.env.SCAN_LIMIT || 1000),
      Select: 'COUNT',
    })
    const dynamoClient: DynamoDBClient = MutableContainer.get('dynamoClient')
    const result: ScanOutput = await dynamoClient.send(scanCmd)
    lastEvaluatedKey = result.LastEvaluatedKey
    totalItemCount += result.Count || 0
  } while (lastEvaluatedKey)
  console.log(
    `♦️  The DynamoDB table ${dynamodbTableName} has a total of ${totalItemCount} items`,
  )

  // check database connection
  const connection: Connection = MutableContainer.get('pgConnection')
  const numXapiRecordsInPg = await connection.getRepository(XApiRecord).count()
  console.log(
    `🐘 The target Postgres table contains ${numXapiRecordsInPg} rows.`,
  )

  console.log('Done 🙌')
}

const main = async () => {
  const argv = await parser.argv
  const config = getProdConfig(argv)
  await setup(config)

  if (argv.dryRun) {
    console.log('\n🧪 Running in dry mode')
    console.log('----------------------')
    await dryRunMigration(config)
  } else {
    console.log('\n🚀 Executing migration')
    console.log('----------------------')
    await executeMigration(config)
  }

  await teardown()
  process.exit(0)
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
  })
}
