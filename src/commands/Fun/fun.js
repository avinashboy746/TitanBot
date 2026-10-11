
import { EmbedBuilder } from "discord.js";

const cooldowns = new Map();

const funCommands = {
  kiss: {
    api: "https://nekos.best/api/v2/kiss",
    color: "#FF69B4",
    emoji: "💋",
    action: "kissed",
    footer: "That was... kinda cute~ 🌸",
    message: "Kawaii~"
  },

  hug: {
    api: "https://nekos.best/api/v2/hug",
    color: "#FF69B4",
    emoji: "🫂",
    action: "hugged",
    footer: "A hug a day keeps sadness away 💞",
    message: "So warm and fluffy~"
  },

  punch: {
    api: "https://nekos.best/api/v2/punch",
    color: "#FF4500",
    emoji: "👊",
    action: "playfully punched",
    footer: "It's just anime logic ⚡",
    message: "Ouchhh~"
  }
};

export default {
  name: "fun",
  description: "Kiss, hug, and punch fun commands",

  // Use this handler for !kiss, !hug and !punch
  async execute(message, args, client) {
    const prefix = client?.config?.bot?.prefix || "!";
    const command = message.content
      .slice(prefix.length)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

    const fun = funCommands[command];
    if (!fun) return;

    const target = message.mentions.users.first();

    if (!target) {
      return message.reply(
        `${fun.emoji} Mention someone! Example: \`${prefix}${command} @user\``
      );
    }

    const key = `${message.author.id}:${command}`;
    const now = Date.now();
    const lastUsed = cooldowns.get(key) || 0;
    const remaining = 10000 - (now - lastUsed);

    if (remaining > 0) {
      return message.reply(
        `⏳ Please wait ${Math.ceil(remaining / 1000)} seconds before using \`${command}\` again.`
      );
    }

    cooldowns.set(key, now);

    try {
      await message.channel.sendTyping();

      const response = await fetch(fun.api, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const gif = data.results?.[0]?.url;

      if (!gif) throw new Error("No GIF returned");

      const embed = new EmbedBuilder()
        .setColor(fun.color)
        .setDescription(
          `${fun.emoji} <@${message.author.id}> ${fun.action} <@${target.id}>! ${fun.message}`
        )
        .setImage(gif)
        .setFooter({ text: fun.footer });

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Fun command (${command}) error:`, error);
      cooldowns.delete(key);

      return message.reply(
        "❌ Couldn't load the anime GIF. Please try again later."
      );
    }
  }
};
