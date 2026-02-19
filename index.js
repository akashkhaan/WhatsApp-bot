const { 
  default: makeWASocket, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const express = require("express");

const OWNER_NUMBER = "918920017674";

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;

    if (connection === "open") {
      console.log("Bot Connected ✅");
    }

    if (connection === "close") {
      console.log("Reconnecting...");
      startBot();
    }
  });

  if (!sock.authState?.creds?.registered) {
    const pairingCode = await sock.requestPairingCode(OWNER_NUMBER);
    console.log("Your Pairing Code is:", pairingCode);
  }
}

startBot();


// ✅ EXPRESS SERVER FOR RENDER
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
