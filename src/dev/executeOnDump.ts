import { MongoClient } from "mongodb";
import fs from "fs";
import { deserializeStream, EJSON } from "bson";

const url = "mongodb://localhost:27017/h5p";
const client = new MongoClient(url, {});

async function main() {
  await client.connect();
  console.log("Connected successfully to server");

  try {
    const db = client.db();
    const collection = db.collection("h5p_dump");

    const bson = fs.readFileSync("h5p.bson");
    const parsedDocs: Document[] = [];
    // Total documents: 37526
    // Start index in the buffer for the last document: 425395504
    const nextIndex = deserializeStream(bson, 0, 37526, parsedDocs, 0, {});
    const json = EJSON.stringify(parsedDocs, { relaxed: false });

    // const duplicateSubContentIds =
    //   new DuplicateSubContentIdDetector().getDuplicates(json);
    // console.log("Duplicate subContentIds", duplicateSubContentIds.length);
    // console.log("Replacing duplicates...");
    // const newJson = new SubContentIdReplacer().replaceWithNewIds(
    //   json,
    //   duplicateSubContentIds
    // );
    // console.log("Verifying duplicates were replaced...");
    // const leftoverDuplicates =
    //   new DuplicateSubContentIdDetector().getDuplicates(newJson);
    // console.log("Remaining duplicates", leftoverDuplicates.length);

    const deleteResult = await collection.deleteMany({});
    console.log('Deleted document count', deleteResult.deletedCount)
    console.log("Inserting new documents...");
    const newDocuments = EJSON.parse(json, { relaxed: false }) as [];
    const insertResult = await collection.insertMany(newDocuments);
    console.log("Inserted document count", insertResult.insertedCount);
  } finally {
    await client.close();
  }
}

(async () => {
  await main();
  console.log("COMPLETED");
})().catch((e) => {
  console.log(e);
});
