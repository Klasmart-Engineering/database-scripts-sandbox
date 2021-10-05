import util from 'util'
import { exec as _exec } from 'child_process'
const exec = util.promisify(_exec)
import {
  DocumentClient,
  // ScanOutput,
  // ScanInput,
  Key,
} from 'aws-sdk/clients/dynamodb'
import {
  ScanCommand,
  ScanOutput,
  AttributeValue,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { getConnection, InsertResult, Connection } from 'typeorm'
import { Container as MutableContainer } from 'typedi'

import { XApiRecord } from './interfaces'
import { XApiRecordSql } from './entities'
import { connectToXApiDatabase } from './connectToDatabase'
import { parser } from './argv'
import { checkIsUuid, getProdConfig, Config } from './utils'

interface DynamoTableKey {
  [key: string]: AttributeValue
}

interface ScanResult {
  items?: XApiRecordSql[]
  lastEvaluatedKey?: {
    [key: string]: AttributeValue
  }
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
    ExclusiveStartKey: startKey || undefined,
    Limit: Number(process.env.SCAN_LIMIT || 1000),
    ProjectionExpression: 'userId,serverTimestamp,xapi,ipHash',
  })
  const dynamoClient: DynamoDBClient = MutableContainer.get('dynamoClient')
  const output: ScanOutput = await dynamoClient.send(scanCmd)

  const result = {
    items: output.Items
      ? output.Items.map((x) => unmarshall(x) as XApiRecordSql)
      : undefined,
    lastEvaluatedKey: output.LastEvaluatedKey,
  }
  return result
}

export const bulkImport = async (
  items: XApiRecord[],
): Promise<InsertResult> => {
  const connection: Connection = MutableContainer.get('pgConnection')
  const result = connection
    .createQueryBuilder()
    .insert()
    .into(XApiRecordSql)
    .values(items)
    .orIgnore()
    .execute()
  return result
}

export const executeMigration = async ({
  dynamodbTableName,
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
    for (let i = 0; i < items.length; i += chunkSize) {
      const itemsChunk = items.slice(i, i + chunkSize).filter((item) => {
        const isUuid =
          item.userId && checkIsUuid(item.userId as unknown as string)
        console.log({
          userId: item.userId,
          isUuid: checkIsUuid(item.userId as unknown as string),
        })
        if (!isUuid) {
          invalidUuid += 1
        }
        return isUuid
      })

      await bulkImport(itemsChunk)
      process.stdout.clearLine(1)
      process.stdout.cursorTo(0)
      process.stdout.write(
        `${i}. Inserting into Postgres: ${i + itemsChunk.length}/${
          items.length
        }`,
      )
    }
    totalImported += items.length
    process.stdout.write(`. Found ${invalidUuid} records with invalid user_id`)
    totalInvalidUuid += invalidUuid
    process.stdout.write('\n\n')
  } while (lastEvaluatedKey)

  console.log(`Total scanned:         ${totalImported}`)
  console.log(`Total imported:        ${totalImported - totalInvalidUuid}`)
  console.log(`Total invalid user_id: ${totalInvalidUuid}`)

  // getConnection().close()
  console.log('Done 🙌')
}

// export const dryRunMigration2 = async (): Promise<void> => {
//   const { awsRegion, dynamodbTableName, xapiEventsDatabaseUrl } = getConfig()

//   // check Dynamodb table
//   const { stdout } = await exec(
//     `aws dynamodb scan --region ${awsRegion} --table-name ${dynamodbTableName} --select "COUNT"`,
//   )
//   const tableRowCount = JSON.parse(stdout).Count
//   console.log(
//     `♦️  The DynamoDB table ${dynamodbTableName} has a total of ${tableRowCount} items`,
//   )

//   // check database connection
//   await connectToXApiDatabase(xapiEventsDatabaseUrl)
// }

export const dryRunMigration = async (config: Config): Promise<void> => {
  const { dynamodbTableName } = config

  let lastEvaluatedKey = undefined
  let totalItemCount = 0
  do {
    const scanCmd = new ScanCommand({
      TableName: dynamodbTableName,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: Number(process.env.SCAN_LIMIT || 1000),
    })
    const dynamoClient: DynamoDBClient = MutableContainer.get('dynamoClient')
    const result: ScanOutput = await dynamoClient.send(scanCmd)
    lastEvaluatedKey = result.LastEvaluatedKey
    totalItemCount += result.Count || 0
  } while (lastEvaluatedKey)
  console.log(
    `♦️  The DynamoDB table ${dynamodbTableName} has a total of ${totalItemCount} items`,
  )

  // // check database connection
  // await connectToXApiDatabase(xapiPgDatabaseUrl)

  console.log('Done 🙌')
}

const main = async () => {
  const argv = await parser.argv
  const config = getProdConfig()
  await setup(config)

  if (argv.dryRun) {
    console.log('🧪 Running in dry mode')
    await dryRunMigration(config)
  } else {
    console.log('🚀 Executing migration')
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

/**
 * Tests
 *
 * - make simple assertations with some integration tests
 * connect to dynamodb
 * - use localstack?
 *
 * - simple testing:
 *  - with dummy data with valid and invalid user_id
 */
