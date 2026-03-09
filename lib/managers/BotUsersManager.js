"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotUser = void 0;
const fs_1 = require("fs");
const matrix_appservice_bridge_1 = require("matrix-appservice-bridge");
const mime = import("mime");
const log = new matrix_appservice_bridge_1.Logger("BotUsersManager");
class BotUser {
    as;
    userId;
    services;
    prefix;
    priority;
    avatar;
    displayname;
    constructor(as, userId, services, prefix, 
    // Bots with higher priority should handle a command first
    priority, avatar, displayname) {
        this.as = as;
        this.userId = userId;
        this.services = services;
        this.prefix = prefix;
        this.priority = priority;
        this.avatar = avatar;
        this.displayname = displayname;
    }
    get intent() {
        return this.as.getIntentForUserId(this.userId);
    }
}
exports.BotUser = BotUser;
// Sort bot users by highest priority first.
const higherPriority = (a, b) => b.priority - a.priority;
class BotUsersManager {
    config;
    as;
    // Map of user ID to config for all our configured bot users
    _botUsers = new Map();
    // Map of room ID to set of bot users in the room
    _botsInRooms = new Map();
    constructor(config, as) {
        this.config = config;
        this.as = as;
        // Default bot user
        this._botUsers.set(this.as.botUserId, new BotUser(this.as, this.as.botUserId, 
        // Default bot can handle all services
        this.config.enabledServices, "!hookshot", 0, this.config.bot?.avatar, this.config.bot?.displayname));
        // Service bot users
        if (this.config.serviceBots) {
            this.config.serviceBots.forEach((bot) => {
                const botUserId = this.as.getUserId(bot.localpart);
                this._botUsers.set(botUserId, new BotUser(this.as, botUserId, [bot.service], bot.prefix, 
                // Service bots should handle commands first
                1, bot.avatar, bot.displayname));
            });
        }
    }
    async start() {
        await this.ensureProfiles();
        await this.getJoinedRooms();
    }
    async ensureProfiles() {
        log.info("Ensuring bot users are set up...");
        for (const botUser of this.botUsers) {
            // Ensure the bot is registered
            log.debug(`Ensuring bot user ${botUser.userId} is registered`);
            await botUser.intent.ensureRegistered();
            await this.ensureProfile(botUser);
        }
    }
    /**
     * Ensures the bot user profile display name and avatar image are updated.
     *
     * @returns Promise resolving when the user profile has been ensured.
     */
    async ensureProfile(botUser) {
        const capabilites = await botUser.intent.underlyingClient.getCapabilities();
        const canSetDisplayname = capabilites["m.set_displayname"]?.enabled !== false;
        const canSetAvatarUrl = capabilites["m.set_avatar_url"]?.enabled !== false;
        log.debug(`Ensuring profile for ${botUser.userId} is updated`);
        let profile;
        try {
            profile = await botUser.intent.underlyingClient.getUserProfile(botUser.userId);
        }
        catch (e) {
            log.error(`Failed to get user profile for ${botUser.userId}:`, e);
            profile = {};
        }
        // Update display name if necessary
        if (canSetDisplayname &&
            botUser.displayname &&
            profile.displayname !== botUser.displayname) {
            try {
                await botUser.intent.underlyingClient.setDisplayName(botUser.displayname);
                log.info(`Updated displayname for "${botUser.userId}" to ${botUser.displayname}`);
            }
            catch (e) {
                log.error(`Failed to set displayname for ${botUser.userId}:`, e);
            }
        }
        if (!canSetAvatarUrl) {
            return;
        }
        if (!botUser.avatar) {
            // Unset any avatar
            if (profile.avatar_url) {
                await botUser.intent.underlyingClient.setAvatarUrl("");
                log.info(`Removed avatar for "${botUser.userId}"`);
            }
            return;
        }
        if (botUser.avatar.startsWith("mxc://")) {
            // Configured avatar is a Matrix content URL
            if (profile.avatar_url === botUser.avatar) {
                // Avatar is current, no need to update
                log.debug(`Avatar for ${botUser.userId} is already updated`);
                return;
            }
            try {
                await botUser.intent.underlyingClient.setAvatarUrl(botUser.avatar);
                log.info(`Updated avatar for ${botUser.userId} to ${botUser.avatar}`);
            }
            catch (e) {
                log.error(`Failed to set avatar for ${botUser.userId}:`, e);
            }
            return;
        }
        // Otherwise assume configured avatar is a file path
        let avatarImage;
        try {
            const contentType = (await mime).default.getType(botUser.avatar);
            if (!contentType) {
                throw new Error("Could not determine content type");
            }
            // File path
            avatarImage = {
                image: await fs_1.promises.readFile(botUser.avatar),
                contentType,
            };
        }
        catch (e) {
            log.error(`Failed to load avatar at ${botUser.avatar}:`, e);
            return;
        }
        // Determine if an avatar update is needed
        if (profile.avatar_url) {
            try {
                const res = await botUser.intent.underlyingClient.downloadContent(profile.avatar_url);
                const currentAvatarImage = {
                    image: res.data,
                    contentType: res.contentType,
                };
                if (currentAvatarImage.image.equals(avatarImage.image) &&
                    currentAvatarImage.contentType === avatarImage.contentType) {
                    // Avatar is current, no need to update
                    log.debug(`Avatar for ${botUser.userId} is already updated`);
                    return;
                }
            }
            catch (e) {
                log.error(`Failed to get current avatar image for ${botUser.userId}:`, e);
            }
        }
        // Update the avatar
        try {
            const uploadedAvatarMxcUrl = await botUser.intent.underlyingClient.uploadContent(avatarImage.image, avatarImage.contentType);
            await botUser.intent.underlyingClient.setAvatarUrl(uploadedAvatarMxcUrl);
            log.info(`Updated avatar for ${botUser.userId} to ${uploadedAvatarMxcUrl}`);
        }
        catch (e) {
            log.error(`Failed to set avatar for ${botUser.userId}:`, e);
        }
    }
    async getJoinedRooms() {
        log.info("Getting joined rooms...");
        for (const botUser of this.botUsers) {
            const joinedRooms = await botUser.intent.underlyingClient.getJoinedRooms();
            for (const roomId of joinedRooms) {
                this.onRoomJoin(botUser, roomId);
            }
        }
    }
    /**
     * Records a bot user having joined a room.
     *
     * @param botUser
     * @param roomId
     */
    onRoomJoin(botUser, roomId) {
        log.debug(`Bot user ${botUser.userId} joined room ${roomId}`);
        const botUsers = this._botsInRooms.get(roomId) ?? new Set();
        botUsers.add(botUser);
        this._botsInRooms.set(roomId, botUsers);
    }
    /**
     * Records a bot user having left a room.
     *
     * @param botUser
     * @param roomId
     */
    onRoomLeave(botUser, roomId) {
        log.info(`Bot user ${botUser.userId} left room ${roomId}`);
        const botUsers = this._botsInRooms.get(roomId) ?? new Set();
        botUsers.delete(botUser);
        if (botUsers.size > 0) {
            this._botsInRooms.set(roomId, botUsers);
        }
        else {
            this._botsInRooms.delete(roomId);
        }
    }
    /**
     * Gets the list of room IDs where at least one bot is a member.
     *
     * @returns List of room IDs.
     */
    get joinedRooms() {
        return Array.from(this._botsInRooms.keys());
    }
    /**
     * Gets the configured bot users, ordered by priority.
     *
     * @returns List of bot users.
     */
    get botUsers() {
        return Array.from(this._botUsers.values()).sort(higherPriority);
    }
    /**
     * Gets a configured bot user by user ID.
     *
     * @param userId User ID to get.
     */
    getBotUser(userId) {
        return this._botUsers.get(userId);
    }
    /**
     * Checks if the given user ID belongs to a configured bot user.
     *
     * @param userId User ID to check.
     * @returns `true` if the user ID belongs to a bot user, otherwise `false`.
     */
    isBotUser(userId) {
        return this._botUsers.has(userId);
    }
    /**
     * Gets all the bot users in a room, ordered by priority.
     *
     * @param roomId Room ID to get bots for.
     */
    getBotUsersInRoom(roomId) {
        return Array.from(this._botsInRooms.get(roomId) || new Set()).sort(higherPriority);
    }
    /**
     * Gets a bot user in a room, optionally for a particular service.
     * When a service is specified, the bot user with the highest priority which handles that service is returned.
     *
     * @param roomId Room ID to get a bot user for.
     * @param serviceType Optional service type for the bot.
     */
    getBotUserInRoom(roomId, serviceType) {
        const botUsersInRoom = this.getBotUsersInRoom(roomId);
        if (serviceType) {
            return botUsersInRoom.find((b) => b.services.includes(serviceType));
        }
        else {
            return botUsersInRoom[0];
        }
    }
    /**
     * Gets the bot user with the highest priority for a particular service.
     *
     * @param serviceType Service type for the bot.
     */
    getBotUserForService(serviceType) {
        return this.botUsers.find((b) => b.services.includes(serviceType));
    }
}
exports.default = BotUsersManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQm90VXNlcnNNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21hbmFnZXJzL0JvdFVzZXJzTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQkFBb0M7QUFFcEMsdUVBQWtEO0FBSWxELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLGlDQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUUxQyxNQUFhLE9BQU87SUFFQztJQUNSO0lBQ0E7SUFDQTtJQUVBO0lBQ0E7SUFDQTtJQVJYLFlBQ21CLEVBQWMsRUFDdEIsTUFBYyxFQUNkLFFBQWtCLEVBQ2xCLE1BQWM7SUFDdkIsMERBQTBEO0lBQ2pELFFBQWdCLEVBQ2hCLE1BQWUsRUFDZixXQUFvQjtRQVBaLE9BQUUsR0FBRixFQUFFLENBQVk7UUFDdEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUVkLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUNmLGdCQUFXLEdBQVgsV0FBVyxDQUFTO0lBQzVCLENBQUM7SUFFSixJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FDRjtBQWZELDBCQWVDO0FBRUQsNENBQTRDO0FBQzVDLE1BQU0sY0FBYyxHQUF1QyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUNsRSxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFFMUIsTUFBcUIsZUFBZTtJQVF2QjtJQUNBO0lBUlgsNERBQTREO0lBQ3BELFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztJQUUvQyxp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SUFDSixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsZ0JBQWdCLENBQUMsTUFBYyxFQUFFLFdBQW9CO1FBQ25ELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN0RSxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILG9CQUFvQixDQUFDLFdBQW1CO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQztDQUNGO0FBelRELGtDQXlUQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHByb21pc2VzIGFzIGZzIH0gZnJvbSBcImZzXCI7XHJcbmltcG9ydCB7IEFwcHNlcnZpY2UsIEludGVudCB9IGZyb20gXCJtYXRyaXgtYm90LXNka1wiO1xyXG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tIFwibWF0cml4LWFwcHNlcnZpY2UtYnJpZGdlXCI7XHJcblxyXG5pbXBvcnQgeyBCcmlkZ2VDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnL0NvbmZpZ1wiO1xyXG5cclxuY29uc3QgbWltZSA9IGltcG9ydChcIm1pbWVcIik7XHJcbmNvbnN0IGxvZyA9IG5ldyBMb2dnZXIoXCJCb3RVc2Vyc01hbmFnZXJcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgQm90VXNlciB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBwcml2YXRlIHJlYWRvbmx5IGFzOiBBcHBzZXJ2aWNlLFxyXG4gICAgcmVhZG9ubHkgdXNlcklkOiBzdHJpbmcsXHJcbiAgICByZWFkb25seSBzZXJ2aWNlczogc3RyaW5nW10sXHJcbiAgICByZWFkb25seSBwcmVmaXg6IHN0cmluZyxcclxuICAgIC8vIEJvdHMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgc2hvdWxkIGhhbmRsZSBhIGNvbW1hbmQgZmlyc3RcclxuICAgIHJlYWRvbmx5IHByaW9yaXR5OiBudW1iZXIsXHJcbiAgICByZWFkb25seSBhdmF0YXI/OiBzdHJpbmcsXHJcbiAgICByZWFkb25seSBkaXNwbGF5bmFtZT86IHN0cmluZyxcclxuICApIHt9XHJcblxyXG4gIGdldCBpbnRlbnQoKTogSW50ZW50IHtcclxuICAgIHJldHVybiB0aGlzLmFzLmdldEludGVudEZvclVzZXJJZCh0aGlzLnVzZXJJZCk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBTb3J0IGJvdCB1c2VycyBieSBoaWdoZXN0IHByaW9yaXR5IGZpcnN0LlxyXG5jb25zdCBoaWdoZXJQcmlvcml0eTogKGE6IEJvdFVzZXIsIGI6IEJvdFVzZXIpID0+IG51bWJlciA9IChhLCBiKSA9PlxyXG4gIGIucHJpb3JpdHkgLSBhLnByaW9yaXR5O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQm90VXNlcnNNYW5hZ2VyIHtcclxuICAvLyBNYXAgb2YgdXNlciBJRCB0byBjb25maWcgZm9yIGFsbCBvdXIgY29uZmlndXJlZCBib3QgdXNlcnNcclxuICBwcml2YXRlIF9ib3RVc2VycyA9IG5ldyBNYXA8c3RyaW5nLCBCb3RVc2VyPigpO1xyXG5cclxuICAvLyBNYXAgb2Ygcm9vbSBJRCB0byBzZXQgb2YgYm90IHVzZXJzIGluIHRoZSByb29tXHJcbiAgcHJpdmF0ZSBfYm90c0luUm9vbXMgPSBuZXcgTWFwPHN0cmluZywgU2V0PEJvdFVzZXI+PigpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHJlYWRvbmx5IGNvbmZpZzogQnJpZGdlQ29uZmlnLFxyXG4gICAgcmVhZG9ubHkgYXM6IEFwcHNlcnZpY2UsXHJcbiAgKSB7XHJcbiAgICAvLyBEZWZhdWx0IGJvdCB1c2VyXHJcbiAgICB0aGlzLl9ib3RVc2Vycy5zZXQoXHJcbiAgICAgIHRoaXMuYXMuYm90VXNlcklkLFxyXG4gICAgICBuZXcgQm90VXNlcihcclxuICAgICAgICB0aGlzLmFzLFxyXG4gICAgICAgIHRoaXMuYXMuYm90VXNlcklkLFxyXG4gICAgICAgIC8vIERlZmF1bHQgYm90IGNhbiBoYW5kbGUgYWxsIHNlcnZpY2VzXHJcbiAgICAgICAgdGhpcy5jb25maWcuZW5hYmxlZFNlcnZpY2VzLFxyXG4gICAgICAgIFwiIWhvb2tzaG90XCIsXHJcbiAgICAgICAgMCxcclxuICAgICAgICB0aGlzLmNvbmZpZy5ib3Q/LmF2YXRhcixcclxuICAgICAgICB0aGlzLmNvbmZpZy5ib3Q/LmRpc3BsYXluYW1lLFxyXG4gICAgICApLFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBTZXJ2aWNlIGJvdCB1c2Vyc1xyXG4gICAgaWYgKHRoaXMuY29uZmlnLnNlcnZpY2VCb3RzKSB7XHJcbiAgICAgIHRoaXMuY29uZmlnLnNlcnZpY2VCb3RzLmZvckVhY2goKGJvdCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGJvdFVzZXJJZCA9IHRoaXMuYXMuZ2V0VXNlcklkKGJvdC5sb2NhbHBhcnQpO1xyXG4gICAgICAgIHRoaXMuX2JvdFVzZXJzLnNldChcclxuICAgICAgICAgIGJvdFVzZXJJZCxcclxuICAgICAgICAgIG5ldyBCb3RVc2VyKFxyXG4gICAgICAgICAgICB0aGlzLmFzLFxyXG4gICAgICAgICAgICBib3RVc2VySWQsXHJcbiAgICAgICAgICAgIFtib3Quc2VydmljZV0sXHJcbiAgICAgICAgICAgIGJvdC5wcmVmaXgsXHJcbiAgICAgICAgICAgIC8vIFNlcnZpY2UgYm90cyBzaG91bGQgaGFuZGxlIGNvbW1hbmRzIGZpcnN0XHJcbiAgICAgICAgICAgIDEsXHJcbiAgICAgICAgICAgIGJvdC5hdmF0YXIsXHJcbiAgICAgICAgICAgIGJvdC5kaXNwbGF5bmFtZSxcclxuICAgICAgICAgICksXHJcbiAgICAgICAgKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZW5zdXJlUHJvZmlsZXMoKTtcclxuICAgIGF3YWl0IHRoaXMuZ2V0Sm9pbmVkUm9vbXMoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUHJvZmlsZXMoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBsb2cuaW5mbyhcIkVuc3VyaW5nIGJvdCB1c2VycyBhcmUgc2V0IHVwLi4uXCIpO1xyXG4gICAgZm9yIChjb25zdCBib3RVc2VyIG9mIHRoaXMuYm90VXNlcnMpIHtcclxuICAgICAgLy8gRW5zdXJlIHRoZSBib3QgaXMgcmVnaXN0ZXJlZFxyXG4gICAgICBsb2cuZGVidWcoYEVuc3VyaW5nIGJvdCB1c2VyICR7Ym90VXNlci51c2VySWR9IGlzIHJlZ2lzdGVyZWRgKTtcclxuICAgICAgYXdhaXQgYm90VXNlci5pbnRlbnQuZW5zdXJlUmVnaXN0ZXJlZCgpO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5lbnN1cmVQcm9maWxlKGJvdFVzZXIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRW5zdXJlcyB0aGUgYm90IHVzZXIgcHJvZmlsZSBkaXNwbGF5IG5hbWUgYW5kIGF2YXRhciBpbWFnZSBhcmUgdXBkYXRlZC5cclxuICAgKlxyXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHVzZXIgcHJvZmlsZSBoYXMgYmVlbiBlbnN1cmVkLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlUHJvZmlsZShib3RVc2VyOiBCb3RVc2VyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBjYXBhYmlsaXRlcyA9IGF3YWl0IGJvdFVzZXIuaW50ZW50LnVuZGVybHlpbmdDbGllbnQuZ2V0Q2FwYWJpbGl0aWVzKCk7XHJcbiAgICBjb25zdCBjYW5TZXREaXNwbGF5bmFtZSA9XHJcbiAgICAgIGNhcGFiaWxpdGVzW1wibS5zZXRfZGlzcGxheW5hbWVcIl0/LmVuYWJsZWQgIT09IGZhbHNlO1xyXG4gICAgY29uc3QgY2FuU2V0QXZhdGFyVXJsID0gY2FwYWJpbGl0ZXNbXCJtLnNldF9hdmF0YXJfdXJsXCJdPy5lbmFibGVkICE9PSBmYWxzZTtcclxuICAgIGxvZy5kZWJ1ZyhgRW5zdXJpbmcgcHJvZmlsZSBmb3IgJHtib3RVc2VyLnVzZXJJZH0gaXMgdXBkYXRlZGApO1xyXG5cclxuICAgIGxldCBwcm9maWxlOiB7XHJcbiAgICAgIGF2YXRhcl91cmw/OiBzdHJpbmc7XHJcbiAgICAgIGRpc3BsYXluYW1lPzogc3RyaW5nO1xyXG4gICAgfTtcclxuICAgIHRyeSB7XHJcbiAgICAgIHByb2ZpbGUgPSBhd2FpdCBib3RVc2VyLmludGVudC51bmRlcmx5aW5nQ2xpZW50LmdldFVzZXJQcm9maWxlKFxyXG4gICAgICAgIGJvdFVzZXIudXNlcklkLFxyXG4gICAgICApO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBsb2cuZXJyb3IoYEZhaWxlZCB0byBnZXQgdXNlciBwcm9maWxlIGZvciAke2JvdFVzZXIudXNlcklkfTpgLCBlKTtcclxuICAgICAgcHJvZmlsZSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVwZGF0ZSBkaXNwbGF5IG5hbWUgaWYgbmVjZXNzYXJ5XHJcbiAgICBpZiAoXHJcbiAgICAgIGNhblNldERpc3BsYXluYW1lICYmXHJcbiAgICAgIGJvdFVzZXIuZGlzcGxheW5hbWUgJiZcclxuICAgICAgcHJvZmlsZS5kaXNwbGF5bmFtZSAhPT0gYm90VXNlci5kaXNwbGF5bmFtZVxyXG4gICAgKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgYm90VXNlci5pbnRlbnQudW5kZXJseWluZ0NsaWVudC5zZXREaXNwbGF5TmFtZShcclxuICAgICAgICAgIGJvdFVzZXIuZGlzcGxheW5hbWUsXHJcbiAgICAgICAgKTtcclxuICAgICAgICBsb2cuaW5mbyhcclxuICAgICAgICAgIGBVcGRhdGVkIGRpc3BsYXluYW1lIGZvciBcIiR7Ym90VXNlci51c2VySWR9XCIgdG8gJHtib3RVc2VyLmRpc3BsYXluYW1lfWAsXHJcbiAgICAgICAgKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGxvZy5lcnJvcihgRmFpbGVkIHRvIHNldCBkaXNwbGF5bmFtZSBmb3IgJHtib3RVc2VyLnVzZXJJZH06YCwgZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNhblNldEF2YXRhclVybCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFib3RVc2VyLmF2YXRhcikge1xyXG4gICAgICAvLyBVbnNldCBhbnkgYXZhdGFyXHJcbiAgICAgIGlmIChwcm9maWxlLmF2YXRhcl91cmwpIHtcclxuICAgICAgICBhd2FpdCBib3RVc2VyLmludGVudC51bmRlcmx5aW5nQ2xpZW50LnNldEF2YXRhclVybChcIlwiKTtcclxuICAgICAgICBsb2cuaW5mbyhgUmVtb3ZlZCBhdmF0YXIgZm9yIFwiJHtib3RVc2VyLnVzZXJJZH1cImApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGJvdFVzZXIuYXZhdGFyLnN0YXJ0c1dpdGgoXCJteGM6Ly9cIikpIHtcclxuICAgICAgLy8gQ29uZmlndXJlZCBhdmF0YXIgaXMgYSBNYXRyaXggY29udGVudCBVUkxcclxuICAgICAgaWYgKHByb2ZpbGUuYXZhdGFyX3VybCA9PT0gYm90VXNlci5hdmF0YXIpIHtcclxuICAgICAgICAvLyBBdmF0YXIgaXMgY3VycmVudCwgbm8gbmVlZCB0byB1cGRhdGVcclxuICAgICAgICBsb2cuZGVidWcoYEF2YXRhciBmb3IgJHtib3RVc2VyLnVzZXJJZH0gaXMgYWxyZWFkeSB1cGRhdGVkYCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IGJvdFVzZXIuaW50ZW50LnVuZGVybHlpbmdDbGllbnQuc2V0QXZhdGFyVXJsKGJvdFVzZXIuYXZhdGFyKTtcclxuICAgICAgICBsb2cuaW5mbyhgVXBkYXRlZCBhdmF0YXIgZm9yICR7Ym90VXNlci51c2VySWR9IHRvICR7Ym90VXNlci5hdmF0YXJ9YCk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBsb2cuZXJyb3IoYEZhaWxlZCB0byBzZXQgYXZhdGFyIGZvciAke2JvdFVzZXIudXNlcklkfTpgLCBlKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE90aGVyd2lzZSBhc3N1bWUgY29uZmlndXJlZCBhdmF0YXIgaXMgYSBmaWxlIHBhdGhcclxuICAgIGxldCBhdmF0YXJJbWFnZToge1xyXG4gICAgICBpbWFnZTogQnVmZmVyO1xyXG4gICAgICBjb250ZW50VHlwZTogc3RyaW5nO1xyXG4gICAgfTtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gKGF3YWl0IG1pbWUpLmRlZmF1bHQuZ2V0VHlwZShib3RVc2VyLmF2YXRhcik7XHJcbiAgICAgIGlmICghY29udGVudFR5cGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZGV0ZXJtaW5lIGNvbnRlbnQgdHlwZVwiKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBGaWxlIHBhdGhcclxuICAgICAgYXZhdGFySW1hZ2UgPSB7XHJcbiAgICAgICAgaW1hZ2U6IGF3YWl0IGZzLnJlYWRGaWxlKGJvdFVzZXIuYXZhdGFyKSxcclxuICAgICAgICBjb250ZW50VHlwZSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nLmVycm9yKGBGYWlsZWQgdG8gbG9hZCBhdmF0YXIgYXQgJHtib3RVc2VyLmF2YXRhcn06YCwgZSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZXRlcm1pbmUgaWYgYW4gYXZhdGFyIHVwZGF0ZSBpcyBuZWVkZWRcclxuICAgIGlmIChwcm9maWxlLmF2YXRhcl91cmwpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBib3RVc2VyLmludGVudC51bmRlcmx5aW5nQ2xpZW50LmRvd25sb2FkQ29udGVudChcclxuICAgICAgICAgIHByb2ZpbGUuYXZhdGFyX3VybCxcclxuICAgICAgICApO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRBdmF0YXJJbWFnZSA9IHtcclxuICAgICAgICAgIGltYWdlOiByZXMuZGF0YSxcclxuICAgICAgICAgIGNvbnRlbnRUeXBlOiByZXMuY29udGVudFR5cGUsXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICBjdXJyZW50QXZhdGFySW1hZ2UuaW1hZ2UuZXF1YWxzKGF2YXRhckltYWdlLmltYWdlKSAmJlxyXG4gICAgICAgICAgY3VycmVudEF2YXRhckltYWdlLmNvbnRlbnRUeXBlID09PSBhdmF0YXJJbWFnZS5jb250ZW50VHlwZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgLy8gQXZhdGFyIGlzIGN1cnJlbnQsIG5vIG5lZWQgdG8gdXBkYXRlXHJcbiAgICAgICAgICBsb2cuZGVidWcoYEF2YXRhciBmb3IgJHtib3RVc2VyLnVzZXJJZH0gaXMgYWxyZWFkeSB1cGRhdGVkYCk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgbG9nLmVycm9yKFxyXG4gICAgICAgICAgYEZhaWxlZCB0byBnZXQgY3VycmVudCBhdmF0YXIgaW1hZ2UgZm9yICR7Ym90VXNlci51c2VySWR9OmAsXHJcbiAgICAgICAgICBlLFxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBVcGRhdGUgdGhlIGF2YXRhclxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXBsb2FkZWRBdmF0YXJNeGNVcmwgPVxyXG4gICAgICAgIGF3YWl0IGJvdFVzZXIuaW50ZW50LnVuZGVybHlpbmdDbGllbnQudXBsb2FkQ29udGVudChcclxuICAgICAgICAgIGF2YXRhckltYWdlLmltYWdlLFxyXG4gICAgICAgICAgYXZhdGFySW1hZ2UuY29udGVudFR5cGUsXHJcbiAgICAgICAgKTtcclxuICAgICAgYXdhaXQgYm90VXNlci5pbnRlbnQudW5kZXJseWluZ0NsaWVudC5zZXRBdmF0YXJVcmwodXBsb2FkZWRBdmF0YXJNeGNVcmwpO1xyXG4gICAgICBsb2cuaW5mbyhcclxuICAgICAgICBgVXBkYXRlZCBhdmF0YXIgZm9yICR7Ym90VXNlci51c2VySWR9IHRvICR7dXBsb2FkZWRBdmF0YXJNeGNVcmx9YCxcclxuICAgICAgKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nLmVycm9yKGBGYWlsZWQgdG8gc2V0IGF2YXRhciBmb3IgJHtib3RVc2VyLnVzZXJJZH06YCwgZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGdldEpvaW5lZFJvb21zKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgbG9nLmluZm8oXCJHZXR0aW5nIGpvaW5lZCByb29tcy4uLlwiKTtcclxuICAgIGZvciAoY29uc3QgYm90VXNlciBvZiB0aGlzLmJvdFVzZXJzKSB7XHJcbiAgICAgIGNvbnN0IGpvaW5lZFJvb21zID1cclxuICAgICAgICBhd2FpdCBib3RVc2VyLmludGVudC51bmRlcmx5aW5nQ2xpZW50LmdldEpvaW5lZFJvb21zKCk7XHJcbiAgICAgIGZvciAoY29uc3Qgcm9vbUlkIG9mIGpvaW5lZFJvb21zKSB7XHJcbiAgICAgICAgdGhpcy5vblJvb21Kb2luKGJvdFVzZXIsIHJvb21JZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZHMgYSBib3QgdXNlciBoYXZpbmcgam9pbmVkIGEgcm9vbS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBib3RVc2VyXHJcbiAgICogQHBhcmFtIHJvb21JZFxyXG4gICAqL1xyXG4gIG9uUm9vbUpvaW4oYm90VXNlcjogQm90VXNlciwgcm9vbUlkOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGxvZy5kZWJ1ZyhgQm90IHVzZXIgJHtib3RVc2VyLnVzZXJJZH0gam9pbmVkIHJvb20gJHtyb29tSWR9YCk7XHJcbiAgICBjb25zdCBib3RVc2VycyA9IHRoaXMuX2JvdHNJblJvb21zLmdldChyb29tSWQpID8/IG5ldyBTZXQ8Qm90VXNlcj4oKTtcclxuICAgIGJvdFVzZXJzLmFkZChib3RVc2VyKTtcclxuICAgIHRoaXMuX2JvdHNJblJvb21zLnNldChyb29tSWQsIGJvdFVzZXJzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZHMgYSBib3QgdXNlciBoYXZpbmcgbGVmdCBhIHJvb20uXHJcbiAgICpcclxuICAgKiBAcGFyYW0gYm90VXNlclxyXG4gICAqIEBwYXJhbSByb29tSWRcclxuICAgKi9cclxuICBvblJvb21MZWF2ZShib3RVc2VyOiBCb3RVc2VyLCByb29tSWQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgbG9nLmluZm8oYEJvdCB1c2VyICR7Ym90VXNlci51c2VySWR9IGxlZnQgcm9vbSAke3Jvb21JZH1gKTtcclxuICAgIGNvbnN0IGJvdFVzZXJzID0gdGhpcy5fYm90c0luUm9vbXMuZ2V0KHJvb21JZCkgPz8gbmV3IFNldDxCb3RVc2VyPigpO1xyXG4gICAgYm90VXNlcnMuZGVsZXRlKGJvdFVzZXIpO1xyXG4gICAgaWYgKGJvdFVzZXJzLnNpemUgPiAwKSB7XHJcbiAgICAgIHRoaXMuX2JvdHNJblJvb21zLnNldChyb29tSWQsIGJvdFVzZXJzKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX2JvdHNJblJvb21zLmRlbGV0ZShyb29tSWQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgbGlzdCBvZiByb29tIElEcyB3aGVyZSBhdCBsZWFzdCBvbmUgYm90IGlzIGEgbWVtYmVyLlxyXG4gICAqXHJcbiAgICogQHJldHVybnMgTGlzdCBvZiByb29tIElEcy5cclxuICAgKi9cclxuICBnZXQgam9pbmVkUm9vbXMoKTogc3RyaW5nW10ge1xyXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5fYm90c0luUm9vbXMua2V5cygpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIGNvbmZpZ3VyZWQgYm90IHVzZXJzLCBvcmRlcmVkIGJ5IHByaW9yaXR5LlxyXG4gICAqXHJcbiAgICogQHJldHVybnMgTGlzdCBvZiBib3QgdXNlcnMuXHJcbiAgICovXHJcbiAgZ2V0IGJvdFVzZXJzKCk6IEJvdFVzZXJbXSB7XHJcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLl9ib3RVc2Vycy52YWx1ZXMoKSkuc29ydChoaWdoZXJQcmlvcml0eSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXRzIGEgY29uZmlndXJlZCBib3QgdXNlciBieSB1c2VyIElELlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHVzZXJJZCBVc2VyIElEIHRvIGdldC5cclxuICAgKi9cclxuICBnZXRCb3RVc2VyKHVzZXJJZDogc3RyaW5nKTogQm90VXNlciB8IHVuZGVmaW5lZCB7XHJcbiAgICByZXR1cm4gdGhpcy5fYm90VXNlcnMuZ2V0KHVzZXJJZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVja3MgaWYgdGhlIGdpdmVuIHVzZXIgSUQgYmVsb25ncyB0byBhIGNvbmZpZ3VyZWQgYm90IHVzZXIuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gdXNlcklkIFVzZXIgSUQgdG8gY2hlY2suXHJcbiAgICogQHJldHVybnMgYHRydWVgIGlmIHRoZSB1c2VyIElEIGJlbG9uZ3MgdG8gYSBib3QgdXNlciwgb3RoZXJ3aXNlIGBmYWxzZWAuXHJcbiAgICovXHJcbiAgaXNCb3RVc2VyKHVzZXJJZDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5fYm90VXNlcnMuaGFzKHVzZXJJZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXRzIGFsbCB0aGUgYm90IHVzZXJzIGluIGEgcm9vbSwgb3JkZXJlZCBieSBwcmlvcml0eS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSByb29tSWQgUm9vbSBJRCB0byBnZXQgYm90cyBmb3IuXHJcbiAgICovXHJcbiAgZ2V0Qm90VXNlcnNJblJvb20ocm9vbUlkOiBzdHJpbmcpOiBCb3RVc2VyW10ge1xyXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5fYm90c0luUm9vbXMuZ2V0KHJvb21JZCkgfHwgbmV3IFNldDxCb3RVc2VyPigpKS5zb3J0KFxyXG4gICAgICBoaWdoZXJQcmlvcml0eSxcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXRzIGEgYm90IHVzZXIgaW4gYSByb29tLCBvcHRpb25hbGx5IGZvciBhIHBhcnRpY3VsYXIgc2VydmljZS5cclxuICAgKiBXaGVuIGEgc2VydmljZSBpcyBzcGVjaWZpZWQsIHRoZSBib3QgdXNlciB3aXRoIHRoZSBoaWdoZXN0IHByaW9yaXR5IHdoaWNoIGhhbmRsZXMgdGhhdCBzZXJ2aWNlIGlzIHJldHVybmVkLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHJvb21JZCBSb29tIElEIHRvIGdldCBhIGJvdCB1c2VyIGZvci5cclxuICAgKiBAcGFyYW0gc2VydmljZVR5cGUgT3B0aW9uYWwgc2VydmljZSB0eXBlIGZvciB0aGUgYm90LlxyXG4gICAqL1xyXG4gIGdldEJvdFVzZXJJblJvb20ocm9vbUlkOiBzdHJpbmcsIHNlcnZpY2VUeXBlPzogc3RyaW5nKTogQm90VXNlciB8IHVuZGVmaW5lZCB7XHJcbiAgICBjb25zdCBib3RVc2Vyc0luUm9vbSA9IHRoaXMuZ2V0Qm90VXNlcnNJblJvb20ocm9vbUlkKTtcclxuICAgIGlmIChzZXJ2aWNlVHlwZSkge1xyXG4gICAgICByZXR1cm4gYm90VXNlcnNJblJvb20uZmluZCgoYikgPT4gYi5zZXJ2aWNlcy5pbmNsdWRlcyhzZXJ2aWNlVHlwZSkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGJvdFVzZXJzSW5Sb29tWzBdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgYm90IHVzZXIgd2l0aCB0aGUgaGlnaGVzdCBwcmlvcml0eSBmb3IgYSBwYXJ0aWN1bGFyIHNlcnZpY2UuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gc2VydmljZVR5cGUgU2VydmljZSB0eXBlIGZvciB0aGUgYm90LlxyXG4gICAqL1xyXG4gIGdldEJvdFVzZXJGb3JTZXJ2aWNlKHNlcnZpY2VUeXBlOiBzdHJpbmcpOiBCb3RVc2VyIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiB0aGlzLmJvdFVzZXJzLmZpbmQoKGIpID0+IGIuc2VydmljZXMuaW5jbHVkZXMoc2VydmljZVR5cGUpKTtcclxuICB9XHJcbn1cclxuIl19