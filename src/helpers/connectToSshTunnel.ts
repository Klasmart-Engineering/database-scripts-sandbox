import tunnel from "tunnel-ssh";

export function connectToSshTunnel() {
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
  const server = tunnel(sshTunnelConfig, function (error: any, server: any) {
    if (error) {
      console.error("SSH error", error);
    }
  });
  server.on("error", function (err: any) {
    console.error("SSH error", err);
  });
}
