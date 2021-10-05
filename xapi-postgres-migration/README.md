# XApi Postgres Migration

The purpose of this script is to migrate XApi records data from a DynamoDB table to a Postgres (or any other SQL) database.

### Flow of the script:

- Fetch a chunk of records from the DynamoDB table using the `scan` method
- Use Regex to validate the `user_id` field (must be valid Uuid). ***XApi records which do not have a valid Uuid in the `user_id` field will not be copied over.***
- Insert the valid records into the Postgres table in batches
- Repeat until all the records from the DynamoDB table have been scanned (when `lastEvaluatedKey` becomes null)


## 🎈 Installation

If your system has `npm` installed, simply install the necessary modules:

```sh
npm install --global typescript ts-node
npm install
```


## 🚀 Running the migration

Setup the environment variables (can be found in `.env.example`)

```sh
# AWS credentials
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
export AWS_SESSION_TOKEN=

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

👉 Run the migration script (add `--dry` flag to do a dry run to check that things are in order):

```sh
ts-node src/migrate.ts [--dry]
```


## 🐳 Running the migration inside a docker container

Build the container where to run the migration script from (in our example we're calling it `sandbox`):

```sh
docker build -t sandbox .
```

👉 Setup the environment variables in a `.env` file as before and run the script using the docker container we just built:

```sh
docker run -it --network="host" --env-file .env sandbox ts-node src/migrate.ts [--dry]
```


# 🛠 Local development and testing

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
