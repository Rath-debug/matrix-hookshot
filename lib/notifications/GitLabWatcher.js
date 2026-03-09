"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitLabWatcher = void 0;
const events_1 = require("events");
const Client_1 = require("../gitlab/Client");
const matrix_appservice_bridge_1 = require("matrix-appservice-bridge");
const log = new matrix_appservice_bridge_1.Logger("GitLabWatcher");
class GitLabWatcher extends events_1.EventEmitter {
    userId;
    roomId;
    since;
    client;
    interval;
    type = "gitlab";
    failureCount = 0;
    constructor(token, url, userId, roomId, since) {
        super();
        this.userId = userId;
        this.roomId = roomId;
        this.since = since;
        this.client = new Client_1.GitLabClient(url, token);
    }
    start(intervalMs) {
        this.interval = setInterval(() => {
            this.getNotifications();
        }, intervalMs);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
    async getNotifications() {
        log.info(`Fetching events from GitLab for ${this.userId}`);
    }
}
exports.GitLabWatcher = GitLabWatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2l0TGFiV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub3RpZmljYXRpb25zL0dpdExhYldhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXNDO0FBQ3RDLDZDQUFnRDtBQUNoRCx1RUFBa0Q7QUFHbEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxpQ0FBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRXhDLE1BQWEsYUFDWCxTQUFRLHFCQUFZO0lBVVg7SUFDQTtJQUNBO0lBVEQsTUFBTSxDQUFlO0lBQ3JCLFFBQVEsQ0FBa0I7SUFDbEIsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUN6QixZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLFlBQ0UsS0FBYSxFQUNiLEdBQVcsRUFDSixNQUFjLEVBQ2QsTUFBYyxFQUNkLEtBQWE7UUFFcEIsS0FBSyxFQUFFLENBQUM7UUFKRCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFVBQUssR0FBTCxLQUFLLENBQVE7UUFHcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLHFCQUFZLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBa0I7UUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQy9CLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzFCLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRU0sSUFBSTtRQUNULElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCO1FBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRjtBQWxDRCxzQ0FrQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tIFwiZXZlbnRzXCI7XHJcbmltcG9ydCB7IEdpdExhYkNsaWVudCB9IGZyb20gXCIuLi9naXRsYWIvQ2xpZW50XCI7XHJcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJtYXRyaXgtYXBwc2VydmljZS1icmlkZ2VcIjtcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uV2F0Y2hlclRhc2sgfSBmcm9tIFwiLi9Ob3RpZmljYXRpb25XYXRjaGVyVGFza1wiO1xyXG5cclxuY29uc3QgbG9nID0gbmV3IExvZ2dlcihcIkdpdExhYldhdGNoZXJcIik7XHJcblxyXG5leHBvcnQgY2xhc3MgR2l0TGFiV2F0Y2hlclxyXG4gIGV4dGVuZHMgRXZlbnRFbWl0dGVyXHJcbiAgaW1wbGVtZW50cyBOb3RpZmljYXRpb25XYXRjaGVyVGFza1xyXG57XHJcbiAgcHJpdmF0ZSBjbGllbnQ6IEdpdExhYkNsaWVudDtcclxuICBwcml2YXRlIGludGVydmFsPzogTm9kZUpTLlRpbWVvdXQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IHR5cGUgPSBcImdpdGxhYlwiO1xyXG4gIHB1YmxpYyBmYWlsdXJlQ291bnQgPSAwO1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgdG9rZW46IHN0cmluZyxcclxuICAgIHVybDogc3RyaW5nLFxyXG4gICAgcHVibGljIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgcHVibGljIHJvb21JZDogc3RyaW5nLFxyXG4gICAgcHVibGljIHNpbmNlOiBudW1iZXIsXHJcbiAgKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5jbGllbnQgPSBuZXcgR2l0TGFiQ2xpZW50KHVybCwgdG9rZW4pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHN0YXJ0KGludGVydmFsTXM6IG51bWJlcikge1xyXG4gICAgdGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgdGhpcy5nZXROb3RpZmljYXRpb25zKCk7XHJcbiAgICB9LCBpbnRlcnZhbE1zKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBzdG9wKCkge1xyXG4gICAgaWYgKHRoaXMuaW50ZXJ2YWwpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZ2V0Tm90aWZpY2F0aW9ucygpIHtcclxuICAgIGxvZy5pbmZvKGBGZXRjaGluZyBldmVudHMgZnJvbSBHaXRMYWIgZm9yICR7dGhpcy51c2VySWR9YCk7XHJcbiAgfVxyXG59XHJcbiJdfQ==