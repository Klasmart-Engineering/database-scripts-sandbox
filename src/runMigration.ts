import { MongoClient } from "mongodb";
import tunnel from "tunnel-ssh";
import { DuplicateSubContentIdReplacer } from "./duplicateSubContentIdReplacer";

const sshTunnelConfig = {
  username: process.env.SSH_USERNAME,
  privateKey: require("fs").readFileSync(process.env.PRIVATE_KEY_PATH ?? ""),
  passphrase: process.env.PASSPHRASE,
  host: process.env.SSH_HOST,
  port: 22,
  dstHost: process.env.DST_HOST,
  dstPort: 27017,
  localPort: 27017,
};
var server = tunnel(sshTunnelConfig, function (error: any, server: any) {
  if (error) {
    console.error("SSH error", error);
  }
});
server.on("error", function (err: any) {
  console.error("SSH error", err);
});

const url = "mongodb://localhost:27017/h5p";
const client = new MongoClient(url, {
  auth: {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
  },
  tls: true,
  //sslValidate: true,
  //ssl: true,
  //tlsCAFile: "src/rds-combined-ca-bundle.pem",
  //tlsAllowInvalidHostnames: true,
  //tlsAllowInvalidCertificates: true,
  //authMechanism: "SCRAM-SHA-1",
  //replicaSet: "rs0",
  tlsInsecure: true,
  directConnection: true,
  //readPreference: ReadPreferenceMode.secondaryPreferred,
});

async function main() {
  await client.connect();
  console.log("Connected successfully to server");

  try {
    const db = client.db();
    const collection = db.collection("h5p");
    const duplicateSubContentIdReplacer = new DuplicateSubContentIdReplacer(
      client,
      collection
    );
    const isDryRun = false;
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
