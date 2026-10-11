
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
      // Rotate between owner name and live server/member statistics.
      const updateLivePresence = () => {
        const totalServers = client.guilds.cache.size;

        const totalMembers = client.guilds.cache.reduce(
          (total, guild) =>
            total + (Number(guild.memberCount) || 0),
          0
        );

        const activities = [
          {
            name: "BOT OWNER ØG CODES",
            type: 3
          },
          {
            name:
              `${totalServers.toLocaleString("en-US")} Servers | ` +
              `${totalMembers.toLocaleString("en-US")} Members`,
            type: 3
          }
        ];

        let index = 0;

        const showActivity = () => {
          client.user.setPresence({
            status: config.bot.presence?.status || "online",
            activities: [activities[index]]
          }).catch((error) => {
            logger.error("Presence update failed:", error);
          });

          index = (index + 1) % activities.length;
        };

        showActivity();

        if (client.botPresenceInterval) {
          clearInterval(client.botPresenceInterval);
        }

        client.botPresenceInterval = setInterval(
          showActivity,
          15_000
        );

        client.botPresenceInterval.unref?.();
      };

      updateLivePresence();

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
