import { MongoClient } from "mongodb";
import fs from "fs";
import { EJSON } from "bson";
import { DuplicateSubContentIdReplacer } from "./duplicateSubContentIdReplacer";

const url = "mongodb://localhost:27017/h5p";
const client = new MongoClient(url, {});

async function main() {
  await client.connect();
  console.log("Connected successfully to server");

  try {
    const db = client.db();
    const collection = db.collection("h5p");
    const findResult = await collection.find({}).toArray();
    //console.log("Found documents =>", findResult.length);
    const json1 = EJSON.stringify(findResult, { relaxed: false });
    // fs.writeFileSync("alpha-content.json", json);
    console.log("json length", json1.length);

    // const deleteResult = await collection.deleteMany({});
    // console.log("Deletion count =>", deleteResult.deletedCount);
    const json = fs.readFileSync("alpha-content-extended.json").toString();
    console.log("original json length", json.length);
    // const documents = EJSON.parse(json, { relaxed: false }) as [];
    // const insertResult = await collection.insertMany(documents);
    // console.log("Insertion count =>", insertResult.insertedCount);
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
