# Database Scripts Sandbox

A place to develop and test database scripts.

[TOC]

This script operates on _[Extended JSON](https://docs.mongodb.com/manual/reference/mongodb-extended-json/)_ in _Canonical Mode_ so it preserves type information.

Script flow:

1. Fetch all documents from MongoDB.
2. Convert the documents to _Extended JSON_ using `EJSON.stringify`.
3. Use Regex to find all subContentIds.
4. Detect the duplicates.
5. Replace the duplicates (as a new JSON string).
6. Convert the new JSON to documents using `EJSON.parse`.
7. Replace all affected documents in MongoDB with the modified versions.

## Local development

### Prerequisites

#### Installation

- Node v14.x.x
- Npm v6.x.x
- Docker (only necessary when running the integration tests and trying out the script with a local MongoDB)

#### Configuration

Copy/paste `.env.example` in the root directory, rename it to `.env`, and modify as necessary.

Create MongoDB container

```
docker run --name h5p-mongo -p 27017:27017 -d mongo
```

### Running

Ensure all dependencies are installed

```
npm install
```

Ensure MongoDB is running (not needed for the actual migration; only used when testing locally)

```
docker start h5p-mongo
```

Export all existing data to a file called `exportedData.json`.

```
npm run exportJson
```

Run migration

```
npm run migration
```

### Debugging

1. Navigate to the VS Code sidebar debug panel
2. Select `migration.ts` from the dropdown
3. Click the green arrow debug button

### Testing

Run tests

```
npm test
```
