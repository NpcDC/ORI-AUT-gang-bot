require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup bot for this server"),

  new SlashCommandBuilder()
    .setName("addally")
    .setDescription("Add ally")
    .addStringOption(o =>
      o.setName("display").setDescription("Display name").setRequired(true))
    .addStringOption(o =>
      o.setName("username").setDescription("Username").setRequired(true)),

  new SlashCommandBuilder()
    .setName("addenemy")
    .setDescription("Add enemy")
    .addStringOption(o =>
      o.setName("display").setDescription("Display name").setRequired(true))
    .addStringOption(o =>
      o.setName("username").setDescription("Username").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removeally")
    .setDescription("Remove ally")
    .addStringOption(o =>
      o.setName("username").setDescription("Username").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removeenemy")
    .setDescription("Remove enemy")
    .addStringOption(o =>
      o.setName("username").setDescription("Username").setRequired(true)),

  new SlashCommandBuilder()
    .setName("checkally")
    .setDescription("Check ally/enemy status")
    .addStringOption(o =>
      o.setName("username").setDescription("Username").setRequired(true)),

  new SlashCommandBuilder()
    .setName("warjumpping")
    .setDescription("Start a war")
    .addStringOption(o =>
      o.setName("user1").setDescription("Target 1").setRequired(true))
    .addStringOption(o =>
      o.setName("user2").setDescription("Target 2"))
    .addStringOption(o =>
      o.setName("user3").setDescription("Target 3"))
    .addStringOption(o =>
      o.setName("user4").setDescription("Target 4"))
    .addStringOption(o =>
      o.setName("user5").setDescription("Target 5"))
    .addStringOption(o =>
      o.setName("user6").setDescription("Target 6"))
    .addStringOption(o =>
      o.setName("serverid").setDescription("Optional tracking id")),

  new SlashCommandBuilder()
    .setName("endwar")
    .setDescription("End a war")
    .addIntegerOption(o =>
      o.setName("war").setDescription("War ID").setRequired(true))
    .addStringOption(o =>
      o.setName("result").setDescription("Result").setRequired(true)),

  new SlashCommandBuilder()
    .setName("resetwarcount")
    .setDescription("Reset war counter to 1")

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🚀 Deploying GLOBAL commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✔ Commands deployed globally");
  } catch (err) {
    console.error("❌ Deploy failed:", err);
  }
})();