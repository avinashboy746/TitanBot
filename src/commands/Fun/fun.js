
import { Events, EmbedBuilder } from "discord.js";

const cooldowns = new Map();

const commands = {
  kiss: {
    api: "https://nekos.best/api/v2/kiss",
    emoji: "💋",
    action: "kissed",
    color: 0xff69b4,
    footer: "That was kinda cute~ 🌸",
  },
  hug: {
    api: "https://nekos.best/api/v2/hug",
    emoji: "🫂",
    action: "hugged",
    color: 0xff69b4,
    footer: "A hug a day keeps sadness away 💞",
  },
  punch: {
    api: "https://nekos.best/api/v2/punch",
    emoji: "👊",
    action: "playfully punched",
    color: 0xff4500,
    footer: "It's just anime logic ⚡",
  },
};

export default {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const match = message.content.trim().match(/^\.(kiss|hug|punch)\b/i);
    if (!match) return;

    const command = match[1].toLowerCase();
    const settings = commands[command];
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply(
        `${settings.emoji} Mention someone! Example: \`.${command} @user\``
      );
    }

    if (target.id === message.author.id) {
      return message.reply("😅 Choose someone else for this command!");
    }

    const key = `${message.author.id}:${command}`;
    const now = Date.now();
    const last = cooldowns.get(key) || 0;
    const wait = 10000 - (now - last);

    if (wait > 0) {
      return message.reply(
        `⏳ Please wait ${Math.ceil(wait / 1000)} seconds!`
      );
    }

    cooldowns.set(key, now);

    try {
      await message.channel.sendTyping();

      const response = await fetch(settings.api, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const gif = data.results?.[0]?.url;

      if (!gif || !/^https?:\/\//i.test(gif)) {
        throw new Error("No valid GIF returned");
      }

      const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setDescription(
          `${settings.emoji} <@${message.author.id}> ${settings.action} <@${target.id}>! 💖`
        )
        .setImage(gif)
        .setFooter({ text: settings.footer });

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`[${command}]`, error);
      cooldowns.delete(key);

      await message.reply(
        "❌ The anime GIF could not be loaded. Please try again later."
      );
    }
  },
};
    
