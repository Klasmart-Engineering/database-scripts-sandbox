export const checkIsUuid = (text: string): boolean => {
  const uuidv4Regex =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
  const test = uuidv4Regex.test(text)
  return test
}

export interface Config {
  awsRegion: string
  dynamodbTableName: string
  xapiPgDatabaseUrl: string
}

export const getProdConfig = (): Config => {
  const awsRegion = process.env.AWS_REGION
  const dynamodbTableName = process.env.DYNAMODB_TABLE_NAME
  const xapiEventsDatabaseUrl = process.env.XAPI_DATABASE_URL
  console.log('\n⚙️  Config:')
  console.log('AWS_REGION =', awsRegion)
  console.log('DYNAMODB_TABLE_NAME =', dynamodbTableName)
  console.log('XAPI_DATABASE_URL =', xapiEventsDatabaseUrl)
  console.log()
  if (!awsRegion) console.error('Please specify a value for AWS_REGION')
  if (!dynamodbTableName)
    console.error('Please specify a value for DYNAMODB_TABLE_NAME')
  if (!xapiEventsDatabaseUrl)
    console.error('Please specify a value for XAPI_DATABASE_URL')
  if (!awsRegion || !dynamodbTableName || !xapiEventsDatabaseUrl) {
    throw Error('Undefined Environment Variable(s)')
  }
  return {
    awsRegion,
    dynamodbTableName,
    xapiPgDatabaseUrl: xapiEventsDatabaseUrl,
  }
}
