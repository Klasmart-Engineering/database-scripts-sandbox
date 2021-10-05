# XApi Postgres Migration

The purpose of this script is to migrate XApi records data from a DynamoDB table to a Postgres (or any other SQL) database.

***Important***: XApi records which do not have a valid Uuid in the `user_id` field will not be copied over.

Flow of the script:

- Fetch a chunk of records from the DynamoDB table using the `scan` method
- Use Regex to validate the `user_id` field (must be valid Uuid)
- Insert the valid records into the Postgres table in batches
- Repeat until all the records from the DynamoDB table have been scanned (when `lastEvaluatedKey` becomes null)


## Installation

If your system has `ts-node` installed, simply install the necessary modules:

```sh
npm install
```


## Running the migration

Setup the environment variables (can be found in `.env.example`)

```sh
# Source
export DYNAMODB_TABLE_NAME=kidsloop-env-xapi
export AWS_REGION=ap-northeast-2

# Destination
export XAPI_DATABASE_URL=postgres://user:password@127.0.0.1:5432/db_name

# DynamoDB scan limit (recommended)
export SCAN_LIMIT=1000

# SQL Batch Insert size
export SQL_BATCH_INSERT_SIZE=50
```

Run the migration script:

```sh
ts-node src/migrate.ts [--dry-mode]
```


## Running the migration inside a docker container

```sh
docker build -t sandbox .
```

```sh
docker run -it --network="host" sandbox npx ts-node src/migrate.ts [--dry-mode]
```


# Local development and testing

Run a local postgres database:

```sh
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=xapi postgres
```

Run a local simulated AWS environment with `localstack`:

```sh
docker run -d --rm -it -p 4566:4566 -p 4571:4571 -e "SERVICES=dynamodb" localstack/localstack start
```

Localstack's endpoint will be available at `http://localhost:4566`. Specify a `TEST_AWS_ENDPOINT` in your `.env` to make use of it.

Run tests
```sh
$ npm run test
```
