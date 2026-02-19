const { 
  default: makeWASocket, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");

const OWNER_NUMBER = "918920017674"; // apna number without +

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

  // 🔥 Pairing Code Generate
  if (!sock.authState?.creds?.registered) {
    const pairingCode = await sock.requestPairingCode(OWNER_NUMBER);
    console.log("Your Pairing Code is:", pairingCode);
  }

  // Welcome / Goodbye
  sock.ev.on("group-participants.update", async (update) => {
    const metadata = await sock.groupMetadata(update.id);
    const groupName = metadata.subject;

    for (let user of update.participants) {
      const number = user.split("@")[0];

      if (update.action === "add") {
        await sock.sendMessage(update.id, {
          text: `👋 Welcome @${number} to *${groupName}*`,
          mentions: [user]
        });
      }

      if (update.action === "remove") {
        await sock.sendMessage(update.id, {
          text: `👋 @${number} left *${groupName}*\n1 contact left from group.`,
          mentions: [user]
        });
      }
    }
  });

  // Commands
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = (msg.key.participant || msg.key.remoteJid).split("@")[0];
    const jid = msg.key.remoteJid;

    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text;

    if (!text) return;

    // Public
    if (text === "/botinfo") {
      await sock.sendMessage(jid, {
        text: `🤖 Bot Info\nOwner: wa.me/${OWNER_NUMBER}`
      });
    }

    // Owner Only
    if (sender !== OWNER_NUMBER) return;

    if (text.startsWith(".send ")) {
      const message = text.replace(".send ", "");
      await sock.sendMessage(jid, { text: message });
    }

    if (text === ".ping") {
      await sock.sendMessage(jid, { text: "Bot Active ✅" });
    }
  });
}

startBot();
