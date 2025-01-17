import { MongoClient, ObjectId } from "mongodb";
import { EJSON } from "bson";
import { DuplicateSubContentIdDetector } from "./helpers/duplicateSubContentIdDetector";
import { SubContentIdReplacer } from "./helpers/subContentIdReplacer";
import { connectToSshTunnel } from "./helpers/connectToSshTunnel";

const url = String(process.env.MONGO_URL);
const client = new MongoClient(url, {
  auth: process.env.MONGO_USERNAME ? {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
  } : undefined,
  // NOTE - avoid configuring the connection here - this should all be done in the connection url parameters
  // DocumentDB settings
  // ssl: true,
  // tlsCAFile: "rds-combined-ca-bundle.pem",
  // tlsAllowInvalidHostnames: true,
  // tlsInsecure: true,
  // directConnection: true,

  // OTHER BOILERPLATE STUFF

  //tlsAllowInvalidCertificates: true,
  //authMechanism: "SCRAM-SHA-1",
  //replicaSet: "rs0",
  //readPreference: ReadPreferenceMode.secondaryPreferred,
});

async function main() {
  if (process.env.USE_SSH_TUNNEL === "true") {
    connectToSshTunnel()
  }
  await client.connect();
  console.log("Connected successfully to server");

  try {
    const db = client.db();
    const collection = db.collection("h5p");
    const a = {"metadata.mainLibrary":{ $regex : /^H5P.CoursePresentation/ }}
    const b = {"metadata.mainLibrary":"H5P.Column", "parameters.content.content.library":{ $regex : /^H5P.CoursePresentation/ }}
    const c = {"metadata.mainLibrary":"H5P.InteractiveBook", "parameters.chapters.params.content.content.library":{ $regex : /^H5P.CoursePresentation/ }}
    const d = {"metadata.mainLibrary":"H5P.BranchingScenario", "parameters.branchingScenario.content.type.library":{ $regex : /^H5P.CoursePresentation/ }}
    
    const totalDocs = await collection.count({});
    console.log('Total docs', totalDocs)
    const docs = await collection.find({$or:[a, b, c, d]}).toArray();
    console.log('Total docs containing course presentation', docs.length)
    console.log('Executing detection and replacement...')

    let duplicateIdCount = 0
    const docReplacements: any[] = []
    for (const doc of docs) {
      const json = EJSON.stringify(doc)
      const duplicateSubContentIds =
        new DuplicateSubContentIdDetector().getDuplicates(json);
      duplicateIdCount += duplicateSubContentIds.length

      if (duplicateSubContentIds.length === 0) {
        continue;
      }

      const newJson = new SubContentIdReplacer().replaceWithNewIds(
        json,
        duplicateSubContentIds
      );
      docReplacements.push(EJSON.parse(newJson))
    }

    console.log("Total duplicate IDs", duplicateIdCount);
    console.log("Total docs affected", docReplacements.length);

    if (docReplacements.length === 0) {
      console.log('No duplicates to replace. Exiting early...')
      return
    }

    const isDryRun = process.env.DRY_RUN !== "false";
    if (isDryRun) {
      console.log('DRY_RUN is set to true. Exiting without writing changes...')
      return
    }

    console.log("Writing changes to database...");
    const updateOps = docReplacements.map(x => {
      return { replaceOne: { filter: { _id: x._id }, replacement: x } }
    })
    const updateResult = await collection.bulkWrite(updateOps, { retryWrites: false });
    console.log("Write result", updateResult);
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
