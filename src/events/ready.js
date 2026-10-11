
import { Events } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import config from "../config/application.js";
import { reconcileReactionRoleMessages } from "../services/reactionRoleService.js";
import {
  reconcileTicketPanels,
  reconcileVerificationPanels,
  reconcileReactionRolePanelHealth
} from "../services/panelHealthService.js";
import { reconcileLevelRoles } from "../services/leveling/levelRoleSyncService.js";
import { initRiffyAfterReady } from "../services/music/riffySetup.js";

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      // Clear an older timer if one exists
      if (client.botPresenceInterval) {
        clearInterval(client.botPresenceInterval);
      }

      let showOwner = true;

      const rotatePresence = async () => {
        try {
          // Get the latest guild and member counts
          const guilds = client.guilds.cache;
          const totalServers = guilds.size;

          const totalMembers = guilds.reduce(
            (sum, guild) =>
              sum + (Number(guild.memberCount) || 0),
            0
          );

          const activity = showOwner
            ? {
                name: "💗 ᴋɪʀʙʏ ʙᴏᴛ ・ ᴍᴀᴅᴇ ʙʏ ØG CODES ✨",
                type: 3
              }
            : {
                name:
                  `${totalServers.toLocaleString("en-US")} Servers | ` +
                  `${totalMembers.toLocaleString("en-US")} Members`,
                type: 3
              };

          await client.user.setPresence({
            status: config.bot.presence?.status || "online",
            activities: [activity]
          });

          startupLog(
            `Presence updated: ${activity.name}`
          );

          showOwner = !showOwner;
        } catch (error) {
          logger.error("Presence rotation failed:", error);
        }
      };

      // Show the first status immediately
      await rotatePresence();

      // Rotate the two statuses every 15 seconds
      client.botPresenceInterval = setInterval(
        rotatePresence,
        15_000
      );

      client.botPresenceInterval.unref?.();

      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      if (client.config?.features?.music) {
        initRiffyAfterReady(client);
      }

      const reconciliationSummary =
        await reconcileReactionRoleMessages(client);

      startupLog(
        `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
      );

      const ticketPanelSummary =
        await reconcileTicketPanels(client);

      startupLog(
        `Ticket panel health: scanned ${ticketPanelSummary.scannedGuilds} guilds, healthy ${ticketPanelSummary.healthyPanels}, deleted ${ticketPanelSummary.deletedPanels}, missing channel ${ticketPanelSummary.missingChannels}, recovered ${ticketPanelSummary.recoveredIds}, errors ${ticketPanelSummary.errors}`
      );

      const verificationPanelSummary =
        await reconcileVerificationPanels(client);

      startupLog(
        `Verification panel health: scanned ${verificationPanelSummary.scannedGuilds} guilds, healthy ${verificationPanelSummary.healthyPanels}, deleted ${verificationPanelSummary.deletedPanels}, missing channel ${verificationPanelSummary.missingChannels}, recovered ${verificationPanelSummary.recoveredIds}, errors ${verificationPanelSummary.errors}`
      );

      const reactionRolePanelSummary =
        await reconcileReactionRolePanelHealth(client);

      startupLog(
        `Reaction role panel health: scanned ${reactionRolePanelSummary.scannedPanels} panels, healthy ${reactionRolePanelSummary.healthyPanels}, deleted ${reactionRolePanelSummary.deletedPanels}, missing channel ${reactionRolePanelSummary.missingChannels}, recovered ${reactionRolePanelSummary.recoveredIds}, errors ${reactionRolePanelSummary.errors}`
      );

      const levelRoleSummary =
        await reconcileLevelRoles(client);

      startupLog(
        `Level role sync: scanned ${levelRoleSummary.scannedGuilds} guilds, pruned ${levelRoleSummary.prunedRewardEntries} stale rewards, re-awarded ${levelRoleSummary.rolesReAwarded} roles, errors ${levelRoleSummary.errors}`
      );
    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  }
};
