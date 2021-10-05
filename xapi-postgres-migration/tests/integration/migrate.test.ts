import { expect } from 'chai'
import {
  CreateTableCommand,
  DynamoDBClient,
  PutItemCommand,
  ListTablesCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { Connection } from 'typeorm'
import { Container as MutableContainer } from 'typedi'
import { v4 } from 'uuid'
import { connectToXApiDatabase } from '../../src/connectToDatabase'
import { executeMigration } from '../../src/migrate'
import { XApiRecordSql } from '../../src/entities'
import { Config } from '../../src/utils'

const dynamoTableName = process.env.TEST_DYNAMODB_TABLE_NAME || 'xapi'
const xapiPgTestDatabaseUrl = String(process.env.TEST_XAPI_DATABASE_URL)

const setup = async () => {
  const dynamoClient = new DynamoDBClient({
    endpoint: process.env.TEST_AWS_ENDPOINT || 'http://localhost:4566',
    region: 'ap-northeast-2',
  })
  MutableContainer.set('dynamoClient', dynamoClient)

  const pgConnection = await connectToXApiDatabase(xapiPgTestDatabaseUrl)
  MutableContainer.set('pgConnection', pgConnection)
}

const teardown = async () => {
  const connection: Connection = MutableContainer.get('pgConnection')
  await connection.close()
}

describe('', () => {
  const xapiData = {
    data: 'xapi',
  }
  const xapiRecord = {
    userId: v4(),
    serverTimestamp: Math.trunc(Math.random() * 100000000000),
    xapi: JSON.stringify(xapiData),
    ipHash: '127.0.0.1',
  }
  let dynamoClient: DynamoDBClient
  let pgConnection: Connection

  before(async () => {
    await setup()
    dynamoClient = MutableContainer.get('dynamoClient')
    pgConnection = MutableContainer.get('pgConnection')

    // Recreate the DynamoDB table
    const listOfTables =
      (await dynamoClient.send(new ListTablesCommand({}))).TableNames || []

    if (listOfTables.includes(dynamoTableName)) {
      console.log(`Dynamodb: Deleting the table ${dynamoTableName}`)
      const deleteTableCmd = new DeleteTableCommand({
        TableName: dynamoTableName,
      })
      await dynamoClient.send(deleteTableCmd)
    }

    // Wait a little bit for the new table to become available (just DynamoDB things...)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log(`Dynamodb: Creating the table ${dynamoTableName}`)
    const createTableCmd = new CreateTableCommand({
      TableName: dynamoTableName,
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'serverTimestamp', AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'serverTimestamp', KeyType: 'RANGE' },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 2, WriteCapacityUnits: 2 },
    })
    await dynamoClient.send(createTableCmd)

    console.log(`Dynamodb: inserting item into table`)
    const putItemCmd = new PutItemCommand({
      TableName: dynamoTableName,
      Item: marshall(xapiRecord),
    })
    await dynamoClient.send(putItemCmd)

    // Prepare the Postgres table by letting TypORM create it (or truncate an existing table)
    const pgTableName =
      pgConnection.getRepository(XApiRecordSql).metadata.tableName
    await pgConnection.query(`TRUNCATE TABLE ${pgTableName}`)
  })

  after(async () => {
    await teardown()
  })

  it('Runs the migration script', async () => {
    const config: Config = {
      awsRegion: 'ap-northeast-2',
      dynamodbTableName: dynamoTableName,
      xapiPgDatabaseUrl: xapiPgTestDatabaseUrl,
    }
    await executeMigration(config)

    const rows = await pgConnection.getRepository(XApiRecordSql).find()
    expect(rows.length).to.equal(1)
    expect(rows[0]).to.deep.equal(xapiRecord)
  })
})
