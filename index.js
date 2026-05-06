require("dotenv").config();

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= FILE HELPERS ================= */

const read = (p, f) => {
  try { return JSON.parse(fs.readFileSync(p)); }
  catch { return f; }
};

const write = (p, d) =>
  fs.writeFileSync(p, JSON.stringify(d, null, 2));

const getGlobal = () =>
  read("./globalData.json", {
    allies: [],
    enemies: [],
    warCounter: 0,
    activeWars: []
  });

const saveGlobal = (d) => write("./globalData.json", d);

const getServers = () => read("./serverConfig.json", {});
const saveServers = (d) => write("./serverConfig.json", d);

/* ================= SAFE CONFIG MERGE ================= */

function updateServerConfig(guildId, data) {
  const servers = getServers();

  servers[guildId] = {
    ...(servers[guildId] || {}),
    ...data
  };

  saveServers(servers);
  return servers[guildId];
}

/* ================= NORMALIZER ================= */

const norm = (s) => (s || "").toLowerCase().trim();

/* ================= UI SYSTEM ================= */

async function renderUI(guildId) {
  const servers = getServers();
  const global = getGlobal();
  const cfg = servers[guildId];
  if (!cfg) return;

  const channel = await client.channels.fetch(cfg.dashboard).catch(() => null);
  if (!channel) return;

  const allyEmbed = new EmbedBuilder()
    .setTitle("🤝 ALLIES")
    .setColor(0x00ff88)
    .setDescription(
      global.allies.length
        ? global.allies.map(a => `• **${a.display}** → ${a.username}`).join("\n")
        : "None"
    );

  const enemyEmbed = new EmbedBuilder()
    .setTitle("⚔️ ENEMIES")
    .setColor(0xff4444)
    .setDescription(
      global.enemies.length
        ? global.enemies.map(e => `• ${e.display} (${e.username})`).join("\n")
        : "None"
    );

  let allyMsg, enemyMsg;

  if (cfg.allyMsg) {
    try {
      allyMsg = await channel.messages.fetch(cfg.allyMsg);
      await allyMsg.edit({ embeds: [allyEmbed] });
    } catch {
      allyMsg = await channel.send({ embeds: [allyEmbed] });
      updateServerConfig(guildId, { allyMsg: allyMsg.id });
    }
  } else {
    allyMsg = await channel.send({ embeds: [allyEmbed] });
    updateServerConfig(guildId, { allyMsg: allyMsg.id });
  }

  if (cfg.enemyMsg) {
    try {
      enemyMsg = await channel.messages.fetch(cfg.enemyMsg);
      await enemyMsg.edit({ embeds: [enemyEmbed] });
    } catch {
      enemyMsg = await channel.send({ embeds: [enemyEmbed] });
      updateServerConfig(guildId, { enemyMsg: enemyMsg.id });
    }
  } else {
    enemyMsg = await channel.send({ embeds: [enemyEmbed] });
    updateServerConfig(guildId, { enemyMsg: enemyMsg.id });
  }
}

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`✔ ONLINE ${client.user.tag}`);
});

/* ================= COMMANDS ================= */

client.on("interactionCreate", async (i) => {
  try {
    if (!i.isChatInputCommand()) return;

    const global = getGlobal();
    const servers = getServers();
    const cfg = servers[i.guildId];

    console.log("[CMD]", i.commandName);

    /* ================= SETUP ================= */

    if (i.commandName === "setup") {
      await i.reply({ content: "🧭 Setup started", flags: 64 });

      let step = 0;
      let dash, warLog, warCall, warPing, jumpPing;

      const collector = i.channel.createMessageCollector({
        filter: m => m.author.id === i.user.id,
        time: 300000
      });

      collector.on("collect", async (msg) => {
        step++;

        if (step === 1) {
          dash = msg.mentions.channels.first();
          if (!dash) return msg.reply("❌ dashboard invalid"), step--;
          return msg.reply("⚔️ war log?");
        }

        if (step === 2) {
          warLog = msg.mentions.channels.first();
          if (!warLog) return msg.reply("❌ war log invalid"), step--;
          return msg.reply("🎯 war call?");
        }

        if (step === 3) {
          warCall = msg.mentions.channels.first();
          if (!warCall) return msg.reply("❌ war call invalid"), step--;
          return msg.reply("📢 war ping role?");
        }

        if (step === 4) {
          warPing = msg.mentions.roles.first();
          if (!warPing) return msg.reply("❌ war ping invalid"), step--;
          return msg.reply("🚀 jump ping role?");
        }

        if (step === 5) {
          jumpPing = msg.mentions.roles.first();
          if (!jumpPing) return msg.reply("❌ jump ping invalid"), step--;

          updateServerConfig(i.guildId, {
            dashboard: dash.id,
            warLog: warLog.id,
            warCall: warCall.id,
            warPingRole: warPing.id,
            jumpPingRole: jumpPing.id
          });

          await msg.reply("✔ setup complete");
          await renderUI(i.guildId);

          collector.stop();
        }
      });

      return;
    }

    if (!cfg) {
      return i.reply({ content: "❌ run setup first", flags: 64 });
    }

    /* ================= ALLY SYSTEM ================= */

    if (i.commandName === "addally") {
      global.allies.push({
        display: i.options.getString("display"),
        username: norm(i.options.getString("username"))
      });

      saveGlobal(global);
      await i.reply({ content: "✔ ally added", flags: 64 });
      return renderUI(i.guildId);
    }

    if (i.commandName === "addenemy") {
      global.enemies.push({
        display: i.options.getString("display"),
        username: norm(i.options.getString("username"))
      });

      saveGlobal(global);
      await i.reply({ content: "✔ enemy added", flags: 64 });
      return renderUI(i.guildId);
    }

    if (i.commandName === "removeally") {
      const u = norm(i.options.getString("username"));

      global.allies = global.allies.filter(a => norm(a.username) !== u);
      saveGlobal(global);

      await i.reply({ content: "✔ ally removed", flags: 64 });
      return renderUI(i.guildId);
    }

    if (i.commandName === "removeenemy") {
      const u = norm(i.options.getString("username"));

      global.enemies = global.enemies.filter(e => norm(e.username) !== u);
      saveGlobal(global);

      await i.reply({ content: "✔ enemy removed", flags: 64 });
      return renderUI(i.guildId);
    }

    if (i.commandName === "checkally") {
      const u = norm(i.options.getString("username"));

      if (global.allies.find(a => norm(a.username) === u))
        return i.reply({ content: "🤝 ally", flags: 64 });

      if (global.enemies.find(e => norm(e.username) === u))
        return i.reply({ content: "⚔️ enemy", flags: 64 });

      return i.reply({ content: "⚪ neutral", flags: 64 });
    }

    /* ================= WAR SYSTEM ================= */

    if (i.commandName === "warjumpping") {
      try {
        await i.deferReply({ flags: 64 });

        if (!cfg.warLog || !cfg.warPingRole || !cfg.jumpPingRole)
          return i.editReply("❌ setup incomplete");

        const targets = [
          i.options.getString("user1"),
          i.options.getString("user2"),
          i.options.getString("user3"),
          i.options.getString("user4"),
          i.options.getString("user5"),
          i.options.getString("user6")
        ].filter(Boolean);

        global.warCounter++;
        const warId = global.warCounter;

        const log = await client.channels.fetch(cfg.warLog).catch(() => null);
        if (!log) return i.editReply("❌ war log missing");

        const ping =
          targets.length < 5
            ? cfg.jumpPingRole
            : cfg.warPingRole;

        const msg = await log.send({
          content: `<@&${ping}>`,
          embeds: [
            new EmbedBuilder()
              .setTitle(`WAR #${warId}`)
              .setDescription(targets.join("\n"))
          ]
        });

        global.activeWars.push({
          id: warId,
          msgId: msg.id,
          channelId: log.id,
          startTime: Date.now(),
          targets,
          status: "ACTIVE",
          result: null
        });

        saveGlobal(global);

        setTimeout(async () => {
          const g = getGlobal();
          const war = g.activeWars.find(w => w.id === warId);
          if (!war || war.status === "ENDED") return;

          war.status = "ENDED";
          war.result = "null";
          saveGlobal(g);

          try {
            const ch = await client.channels.fetch(war.channelId);
            const m = await ch.messages.fetch(war.msgId);

            await m.edit({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`WAR #${war.id}`)
                  .setDescription(war.targets.join("\n"))
                  .addFields(
                    { name: "Status", value: "AUTO ENDED" },
                    { name: "Result", value: "null" }
                  )
              ]
            });
          } catch {}
        }, 2 * 60 * 60 * 1000);

        return i.editReply("✔ War started");

      } catch (err) {
        console.error(err);
        if (i.deferred) return i.editReply("❌ war failed");
      }
    }

    if (i.commandName === "endwar") {
      try {
        await i.deferReply({ flags: 64 });

        const warId = i.options.getInteger("war");
        const result = i.options.getString("result");

        const war = global.activeWars.find(w => w.id === warId);
        if (!war) return i.editReply("❌ war not found");

        war.status = "ENDED";
        war.result = result;
        saveGlobal(global);

        const ch = await client.channels.fetch(war.channelId).catch(() => null);
        if (!ch) return i.editReply("❌ channel missing");

        const msg = await ch.messages.fetch(war.msgId).catch(() => null);
        if (!msg) return i.editReply("❌ message missing");

        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle(`WAR #${war.id}`)
              .setDescription(war.targets.join("\n"))
              .addFields(
                { name: "Status", value: "ENDED" },
                { name: "Result", value: result }
              )
          ]
        });

        return i.editReply("✔ war ended");

      } catch (err) {
        console.error(err);
        if (i.deferred) return i.editReply("❌ endwar failed");
      }
    }

    /* ================= RESET WAR ================= */

    if (i.commandName === "resetwarcount") {
      try {
        await i.deferReply({ flags: 64 });

        const global = getGlobal();

        global.warCounter = 0;
        global.activeWars = [];

        saveGlobal(global);

        return i.editReply("🔄 War counter reset");

      } catch (err) {
        console.error(err);
        if (i.deferred) return i.editReply("❌ reset failed");
      }
    }

  } catch (err) {
    console.error("GLOBAL ERROR:", err);

    if (i.replied || i.deferred)
      i.followUp({ content: "❌ error", flags: 64 }).catch(() => {});
    else
      i.reply({ content: "❌ error", flags: 64 }).catch(() => {});
  }
});

client.login(process.env.TOKEN);