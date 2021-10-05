import { MongoClient } from "mongodb";
import fs from "fs";
import { EJSON } from "bson";
import { connectToSshTunnel } from "../helpers/connectToSshTunnel";

const url = String(process.env.MONGO_URL);
const useSshTunnel = process.env.USE_SSH_TUNNEL === "true"
const client = new MongoClient(url, {
  auth: {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
  },
  // I tried different combinations of these options, but this is the one
  // that I had success with so far.
  tls: useSshTunnel,
  //sslValidate: true,
  //ssl: true,
  //tlsCAFile: "src/rds-combined-ca-bundle.pem",
  //tlsAllowInvalidHostnames: true,
  //tlsAllowInvalidCertificates: true,
  //authMechanism: "SCRAM-SHA-1",
  //replicaSet: "rs0",
  tlsInsecure: useSshTunnel,
  directConnection: useSshTunnel,
  //readPreference: ReadPreferenceMode.secondaryPreferred,
});

async function main() {
  if (useSshTunnel) {
    connectToSshTunnel()
  }
  await client.connect();
  console.log("Connected successfully to server");

  try {
    const db = client.db();
    const collection = db.collection("h5p");
    const documents = await collection.find({}).toArray();
    console.log("Document count", documents.length);
    const json = EJSON.stringify(documents, { relaxed: false });
    fs.writeFileSync("exportedData.json", json);
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
