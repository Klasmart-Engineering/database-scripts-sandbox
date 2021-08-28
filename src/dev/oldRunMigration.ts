import { MongoClient } from "mongodb";
import { connectToSshTunnel } from "../helpers/connectToSshTunnel";
import { DuplicateSubContentIdReplacer } from "./duplicateSubContentIdReplacer";

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
    const duplicateSubContentIdReplacer = new DuplicateSubContentIdReplacer(
      client,
      collection
    );
    const isDryRun = process.env.DRY_RUN ? Boolean(process.env.DRY_RUN) : true;
    await duplicateSubContentIdReplacer.replaceDuplicates(isDryRun);
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
