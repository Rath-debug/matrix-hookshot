"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubWatcher = void 0;
const events_1 = require("events");
const GithubInstance_1 = require("../github/GithubInstance");
const matrix_appservice_bridge_1 = require("matrix-appservice-bridge");
const Metrics_1 = __importDefault(require("../Metrics"));
const log = new matrix_appservice_bridge_1.Logger("GitHubWatcher");
const GH_API_THRESHOLD = 50;
const GH_API_RETRY_IN = 1000 * 60;
class GitHubWatcher extends events_1.EventEmitter {
    userId;
    roomId;
    lastReadTs;
    participating;
    static apiFailureCount = 0;
    static globalRetryIn = 0;
    static checkGitHubStatus() {
        this.apiFailureCount = Math.min(this.apiFailureCount + 1, GH_API_THRESHOLD);
        if (this.apiFailureCount < GH_API_THRESHOLD) {
            log.warn(`API Failure count at ${this.apiFailureCount}`);
            return;
        }
        // The API is actively failing.
        if (this.globalRetryIn > 0) {
            this.globalRetryIn = Date.now() + GH_API_RETRY_IN;
        }
        log.warn(`API Failure limit reached, holding off new requests for ${GH_API_RETRY_IN / 1000}s`);
        Metrics_1.default.notificationsServiceUp.set({ service: "github" }, 0);
    }
    octoKit;
    failureCount = 0;
    interval;
    type = "github";
    instanceUrl = undefined;
    constructor(token, baseUrl, userId, roomId, lastReadTs, participating = false) {
        super();
        this.userId = userId;
        this.roomId = roomId;
        this.lastReadTs = lastReadTs;
        this.participating = participating;
        this.octoKit = GithubInstance_1.GithubInstance.createUserOctokit(token, baseUrl);
    }
    get since() {
        return this.lastReadTs;
    }
    start(intervalMs) {
        log.info(`Starting for ${this.userId}`);
        this.interval = setInterval(() => {
            this.getNotifications();
        }, intervalMs);
        this.getNotifications();
    }
    stop() {
        if (this.interval) {
            log.info(`Stopping for ${this.userId}`);
            clearInterval(this.interval);
        }
    }
    handleGitHubFailure(ex) {
        log.error("An error occurred getting notifications:", ex);
        if (ex.status === 401 || ex.status === 404) {
            log.warn(`Got status ${ex.status} when handing user stream: ${ex.message}`);
            this.failureCount++;
        }
        else if (ex.status >= 500) {
            setImmediate(() => GitHubWatcher.checkGitHubStatus());
        }
        this.emit("fetch_failure", this);
    }
    async getNotifications() {
        if (GitHubWatcher.globalRetryIn !== 0 &&
            GitHubWatcher.globalRetryIn > Date.now()) {
            log.info(`Not getting notifications for ${this.userId}, API is still down.`);
            return;
        }
        log.debug(`Getting notifications for ${this.userId} ${this.lastReadTs}`);
        const since = this.lastReadTs !== 0
            ? `&since=${new Date(this.lastReadTs).toISOString()}`
            : "";
        let response;
        try {
            response =
                await this.octoKit.activity.listNotificationsForAuthenticatedUser({
                    since,
                    participating: this.participating,
                });
            Metrics_1.default.notificationsServiceUp.set({ service: "github" }, 1);
            // We were succesful, clear any timeouts.
            GitHubWatcher.globalRetryIn = 0;
            // To avoid a bouncing issue, gradually reduce the failure count.
            GitHubWatcher.apiFailureCount = Math.max(0, GitHubWatcher.apiFailureCount - 2);
        }
        catch (ex) {
            await this.handleGitHubFailure(ex);
            return;
        }
        this.lastReadTs = Date.now();
        if (response.data.length) {
            log.info(`Got ${response.data.length} notifications for ${this.userId}`);
        }
        for (const rawEvent of response.data) {
            const ev = rawEvent;
            try {
                if (rawEvent.subject.url) {
                    const res = await this.octoKit.request(rawEvent.subject.url);
                    ev.subject.url_data = res.data;
                }
                if (rawEvent.subject.latest_comment_url) {
                    const res = await this.octoKit.request(rawEvent.subject.latest_comment_url);
                    ev.subject.latest_comment_url_data = res.data;
                }
                if (rawEvent.reason === "review_requested") {
                    if (!ev.subject.url_data?.number) {
                        log.warn("review_requested was missing subject.url_data.number");
                        continue;
                    }
                    if (!rawEvent.repository.owner) {
                        log.warn("review_requested was missing repository.owner");
                        continue;
                    }
                    ev.subject.requested_reviewers = (await this.octoKit.pulls.listRequestedReviewers({
                        pull_number: ev.subject.url_data.number,
                        owner: rawEvent.repository.owner.login,
                        repo: rawEvent.repository.name,
                    })).data;
                    ev.subject.reviews = (await this.octoKit.pulls.listReviews({
                        pull_number: ev.subject.url_data.number,
                        owner: rawEvent.repository.owner.login,
                        repo: rawEvent.repository.name,
                    })).data;
                }
            }
            catch (ex) {
                log.warn(`Failed to pre-process ${rawEvent.id}: ${ex}`);
                // We still push
            }
            log.debug(`Pushing ${ev.id}`);
            Metrics_1.default.notificationsPush.inc({ service: "github" });
            this.emit("new_events", {
                eventName: "notifications.user.events",
                data: {
                    roomId: this.roomId,
                    events: [ev],
                    lastReadTs: this.lastReadTs,
                },
                sender: "GithubWebhooks",
            });
        }
    }
}
exports.GitHubWatcher = GitHubWatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2l0SHViV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub3RpZmljYXRpb25zL0dpdEh1YldhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsbUNBQXNDO0FBQ3RDLDZEQUEwRDtBQUUxRCx1RUFBa0Q7QUFHbEQseURBQWlDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksaUNBQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUV4QyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztBQUM1QixNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBS2xDLE1BQWEsYUFDWCxTQUFRLHFCQUFZO0lBK0JYO0lBQ0E7SUFDQztJQUNBO0lBL0JGLE1BQU0sQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLE1BQU0sQ0FBQyxpQkFBaUI7UUFDN0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDNUUsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLGdCQUFnQixFQUFFLENBQUM7WUFDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7WUFDekQsT0FBTztRQUNULENBQUM7UUFDRCwrQkFBK0I7UUFDL0IsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLGVBQWUsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FDTiwyREFBMkQsZUFBZSxHQUFHLElBQUksR0FBRyxDQUNyRixDQUFDO1FBQ0YsaUJBQU8sQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVPLE9BQU8sQ0FBVTtJQUNsQixZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLFFBQVEsQ0FBa0I7SUFDbEIsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUNoQixXQUFXLEdBQUcsU0FBUyxDQUFDO0lBRXhDLFlBQ0UsS0FBYSxFQUNiLE9BQVksRUFDTCxNQUFjLEVBQ2QsTUFBYyxFQUNiLFVBQWtCLEVBQ2xCLGdCQUFnQixLQUFLO1FBRTdCLEtBQUssRUFBRSxDQUFDO1FBTEQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDYixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBRzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsK0JBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELElBQVcsS0FBSztRQUNkLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBRU0sS0FBSyxDQUFDLFVBQWtCO1FBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUMvQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUMxQixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU0sSUFBSTtRQUNULElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3hDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNILENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxFQUFnQjtRQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFELElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUMzQyxHQUFHLENBQUMsSUFBSSxDQUNOLGNBQWMsRUFBRSxDQUFDLE1BQU0sOEJBQThCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FDbEUsQ0FBQztZQUNGLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QixDQUFDO2FBQU0sSUFBSSxFQUFFLENBQUMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQzVCLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQjtRQUM1QixJQUNFLGFBQWEsQ0FBQyxhQUFhLEtBQUssQ0FBQztZQUNqQyxhQUFhLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFDeEMsQ0FBQztZQUNELEdBQUcsQ0FBQyxJQUFJLENBQ04saUNBQWlDLElBQUksQ0FBQyxNQUFNLHNCQUFzQixDQUNuRSxDQUFDO1lBQ0YsT0FBTztRQUNULENBQUM7UUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sS0FBSyxHQUNULElBQUksQ0FBQyxVQUFVLEtBQUssQ0FBQztZQUNuQixDQUFDLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDckQsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNULElBQUksUUFBZ0MsQ0FBQztRQUNyQyxJQUFJLENBQUM7WUFDSCxRQUFRO2dCQUNOLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMscUNBQXFDLENBQUM7b0JBQ2hFLEtBQUs7b0JBQ0wsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO2lCQUNsQyxDQUFDLENBQUM7WUFDTCxpQkFBTyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3RCx5Q0FBeUM7WUFDekMsYUFBYSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7WUFDaEMsaUVBQWlFO1lBQ2pFLGFBQWEsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDdEMsQ0FBQyxFQUNELGFBQWEsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUNsQyxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFrQixDQUFDLENBQUM7WUFDbkQsT0FBTztRQUNULENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekIsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxzQkFBc0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUNELEtBQUssTUFBTSxRQUFRLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JDLE1BQU0sRUFBRSxHQUFHLFFBQStDLENBQUM7WUFDM0QsSUFBSSxDQUFDO2dCQUNILElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDekIsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM3RCxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxDQUFDO2dCQUNELElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUN4QyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUNwQyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUNwQyxDQUFDO29CQUNGLEVBQUUsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDaEQsQ0FBQztnQkFDRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztvQkFDM0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDO3dCQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNEQUFzRCxDQUFDLENBQUM7d0JBQ2pFLFNBQVM7b0JBQ1gsQ0FBQztvQkFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDL0IsR0FBRyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO3dCQUMxRCxTQUFTO29CQUNYLENBQUM7b0JBQ0QsRUFBRSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsR0FBRyxDQUMvQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDO3dCQUM5QyxXQUFXLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTTt3QkFDdkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUs7d0JBQ3RDLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUk7cUJBQy9CLENBQUMsQ0FDSCxDQUFDLElBQVcsQ0FBQztvQkFDZCxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUNuQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU07d0JBQ3ZDLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLO3dCQUN0QyxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJO3FCQUMvQixDQUFDLENBQ0gsQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDeEQsZ0JBQWdCO1lBQ2xCLENBQUM7WUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUIsaUJBQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtnQkFDdEIsU0FBUyxFQUFFLDJCQUEyQjtnQkFDdEMsSUFBSSxFQUFFO29CQUNKLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUNaLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtpQkFDNUI7Z0JBQ0QsTUFBTSxFQUFFLGdCQUFnQjthQUN6QixDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQzs7QUFyS0gsc0NBc0tDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgT2N0b2tpdCwgUmVzdEVuZHBvaW50TWV0aG9kVHlwZXMgfSBmcm9tIFwiQG9jdG9raXQvcmVzdFwiO1xyXG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tIFwiZXZlbnRzXCI7XHJcbmltcG9ydCB7IEdpdGh1Ykluc3RhbmNlIH0gZnJvbSBcIi4uL2dpdGh1Yi9HaXRodWJJbnN0YW5jZVwiO1xyXG5pbXBvcnQgeyBHaXRIdWJVc2VyTm90aWZpY2F0aW9uIGFzIEhTR2l0SHViVXNlck5vdGlmaWNhdGlvbiB9IGZyb20gXCIuLi9naXRodWIvVHlwZXNcIjtcclxuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcIm1hdHJpeC1hcHBzZXJ2aWNlLWJyaWRnZVwiO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25XYXRjaGVyVGFzayB9IGZyb20gXCIuL05vdGlmaWNhdGlvbldhdGNoZXJUYXNrXCI7XHJcbmltcG9ydCB7IFJlcXVlc3RFcnJvciB9IGZyb20gXCJAb2N0b2tpdC9yZXF1ZXN0LWVycm9yXCI7XHJcbmltcG9ydCBNZXRyaWNzIGZyb20gXCIuLi9NZXRyaWNzXCI7XHJcbmNvbnN0IGxvZyA9IG5ldyBMb2dnZXIoXCJHaXRIdWJXYXRjaGVyXCIpO1xyXG5cclxuY29uc3QgR0hfQVBJX1RIUkVTSE9MRCA9IDUwO1xyXG5jb25zdCBHSF9BUElfUkVUUllfSU4gPSAxMDAwICogNjA7XHJcblxyXG50eXBlIEdpdEh1YlVzZXJOb3RpZmljYXRpb24gPVxyXG4gIFJlc3RFbmRwb2ludE1ldGhvZFR5cGVzW1wiYWN0aXZpdHlcIl1bXCJsaXN0Tm90aWZpY2F0aW9uc0ZvckF1dGhlbnRpY2F0ZWRVc2VyXCJdW1wicmVzcG9uc2VcIl07XHJcblxyXG5leHBvcnQgY2xhc3MgR2l0SHViV2F0Y2hlclxyXG4gIGV4dGVuZHMgRXZlbnRFbWl0dGVyXHJcbiAgaW1wbGVtZW50cyBOb3RpZmljYXRpb25XYXRjaGVyVGFza1xyXG57XHJcbiAgcHJpdmF0ZSBzdGF0aWMgYXBpRmFpbHVyZUNvdW50ID0gMDtcclxuICBwcml2YXRlIHN0YXRpYyBnbG9iYWxSZXRyeUluID0gMDtcclxuXHJcbiAgcHVibGljIHN0YXRpYyBjaGVja0dpdEh1YlN0YXR1cygpIHtcclxuICAgIHRoaXMuYXBpRmFpbHVyZUNvdW50ID0gTWF0aC5taW4odGhpcy5hcGlGYWlsdXJlQ291bnQgKyAxLCBHSF9BUElfVEhSRVNIT0xEKTtcclxuICAgIGlmICh0aGlzLmFwaUZhaWx1cmVDb3VudCA8IEdIX0FQSV9USFJFU0hPTEQpIHtcclxuICAgICAgbG9nLndhcm4oYEFQSSBGYWlsdXJlIGNvdW50IGF0ICR7dGhpcy5hcGlGYWlsdXJlQ291bnR9YCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vIFRoZSBBUEkgaXMgYWN0aXZlbHkgZmFpbGluZy5cclxuICAgIGlmICh0aGlzLmdsb2JhbFJldHJ5SW4gPiAwKSB7XHJcbiAgICAgIHRoaXMuZ2xvYmFsUmV0cnlJbiA9IERhdGUubm93KCkgKyBHSF9BUElfUkVUUllfSU47XHJcbiAgICB9XHJcbiAgICBsb2cud2FybihcclxuICAgICAgYEFQSSBGYWlsdXJlIGxpbWl0IHJlYWNoZWQsIGhvbGRpbmcgb2ZmIG5ldyByZXF1ZXN0cyBmb3IgJHtHSF9BUElfUkVUUllfSU4gLyAxMDAwfXNgLFxyXG4gICAgKTtcclxuICAgIE1ldHJpY3Mubm90aWZpY2F0aW9uc1NlcnZpY2VVcC5zZXQoeyBzZXJ2aWNlOiBcImdpdGh1YlwiIH0sIDApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBvY3RvS2l0OiBPY3Rva2l0O1xyXG4gIHB1YmxpYyBmYWlsdXJlQ291bnQgPSAwO1xyXG4gIHByaXZhdGUgaW50ZXJ2YWw/OiBOb2RlSlMuVGltZW91dDtcclxuICBwdWJsaWMgcmVhZG9ubHkgdHlwZSA9IFwiZ2l0aHViXCI7XHJcbiAgcHVibGljIHJlYWRvbmx5IGluc3RhbmNlVXJsID0gdW5kZWZpbmVkO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHRva2VuOiBzdHJpbmcsXHJcbiAgICBiYXNlVXJsOiBVUkwsXHJcbiAgICBwdWJsaWMgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBwdWJsaWMgcm9vbUlkOiBzdHJpbmcsXHJcbiAgICBwcml2YXRlIGxhc3RSZWFkVHM6IG51bWJlcixcclxuICAgIHByaXZhdGUgcGFydGljaXBhdGluZyA9IGZhbHNlLFxyXG4gICkge1xyXG4gICAgc3VwZXIoKTtcclxuICAgIHRoaXMub2N0b0tpdCA9IEdpdGh1Ykluc3RhbmNlLmNyZWF0ZVVzZXJPY3Rva2l0KHRva2VuLCBiYXNlVXJsKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXQgc2luY2UoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5sYXN0UmVhZFRzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHN0YXJ0KGludGVydmFsTXM6IG51bWJlcikge1xyXG4gICAgbG9nLmluZm8oYFN0YXJ0aW5nIGZvciAke3RoaXMudXNlcklkfWApO1xyXG4gICAgdGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgdGhpcy5nZXROb3RpZmljYXRpb25zKCk7XHJcbiAgICB9LCBpbnRlcnZhbE1zKTtcclxuICAgIHRoaXMuZ2V0Tm90aWZpY2F0aW9ucygpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHN0b3AoKSB7XHJcbiAgICBpZiAodGhpcy5pbnRlcnZhbCkge1xyXG4gICAgICBsb2cuaW5mbyhgU3RvcHBpbmcgZm9yICR7dGhpcy51c2VySWR9YCk7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGhhbmRsZUdpdEh1YkZhaWx1cmUoZXg6IFJlcXVlc3RFcnJvcikge1xyXG4gICAgbG9nLmVycm9yKFwiQW4gZXJyb3Igb2NjdXJyZWQgZ2V0dGluZyBub3RpZmljYXRpb25zOlwiLCBleCk7XHJcbiAgICBpZiAoZXguc3RhdHVzID09PSA0MDEgfHwgZXguc3RhdHVzID09PSA0MDQpIHtcclxuICAgICAgbG9nLndhcm4oXHJcbiAgICAgICAgYEdvdCBzdGF0dXMgJHtleC5zdGF0dXN9IHdoZW4gaGFuZGluZyB1c2VyIHN0cmVhbTogJHtleC5tZXNzYWdlfWAsXHJcbiAgICAgICk7XHJcbiAgICAgIHRoaXMuZmFpbHVyZUNvdW50Kys7XHJcbiAgICB9IGVsc2UgaWYgKGV4LnN0YXR1cyA+PSA1MDApIHtcclxuICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IEdpdEh1YldhdGNoZXIuY2hlY2tHaXRIdWJTdGF0dXMoKSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmVtaXQoXCJmZXRjaF9mYWlsdXJlXCIsIHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXROb3RpZmljYXRpb25zKCkge1xyXG4gICAgaWYgKFxyXG4gICAgICBHaXRIdWJXYXRjaGVyLmdsb2JhbFJldHJ5SW4gIT09IDAgJiZcclxuICAgICAgR2l0SHViV2F0Y2hlci5nbG9iYWxSZXRyeUluID4gRGF0ZS5ub3coKVxyXG4gICAgKSB7XHJcbiAgICAgIGxvZy5pbmZvKFxyXG4gICAgICAgIGBOb3QgZ2V0dGluZyBub3RpZmljYXRpb25zIGZvciAke3RoaXMudXNlcklkfSwgQVBJIGlzIHN0aWxsIGRvd24uYCxcclxuICAgICAgKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgbG9nLmRlYnVnKGBHZXR0aW5nIG5vdGlmaWNhdGlvbnMgZm9yICR7dGhpcy51c2VySWR9ICR7dGhpcy5sYXN0UmVhZFRzfWApO1xyXG4gICAgY29uc3Qgc2luY2UgPVxyXG4gICAgICB0aGlzLmxhc3RSZWFkVHMgIT09IDBcclxuICAgICAgICA/IGAmc2luY2U9JHtuZXcgRGF0ZSh0aGlzLmxhc3RSZWFkVHMpLnRvSVNPU3RyaW5nKCl9YFxyXG4gICAgICAgIDogXCJcIjtcclxuICAgIGxldCByZXNwb25zZTogR2l0SHViVXNlck5vdGlmaWNhdGlvbjtcclxuICAgIHRyeSB7XHJcbiAgICAgIHJlc3BvbnNlID1cclxuICAgICAgICBhd2FpdCB0aGlzLm9jdG9LaXQuYWN0aXZpdHkubGlzdE5vdGlmaWNhdGlvbnNGb3JBdXRoZW50aWNhdGVkVXNlcih7XHJcbiAgICAgICAgICBzaW5jZSxcclxuICAgICAgICAgIHBhcnRpY2lwYXRpbmc6IHRoaXMucGFydGljaXBhdGluZyxcclxuICAgICAgICB9KTtcclxuICAgICAgTWV0cmljcy5ub3RpZmljYXRpb25zU2VydmljZVVwLnNldCh7IHNlcnZpY2U6IFwiZ2l0aHViXCIgfSwgMSk7XHJcbiAgICAgIC8vIFdlIHdlcmUgc3VjY2VzZnVsLCBjbGVhciBhbnkgdGltZW91dHMuXHJcbiAgICAgIEdpdEh1YldhdGNoZXIuZ2xvYmFsUmV0cnlJbiA9IDA7XHJcbiAgICAgIC8vIFRvIGF2b2lkIGEgYm91bmNpbmcgaXNzdWUsIGdyYWR1YWxseSByZWR1Y2UgdGhlIGZhaWx1cmUgY291bnQuXHJcbiAgICAgIEdpdEh1YldhdGNoZXIuYXBpRmFpbHVyZUNvdW50ID0gTWF0aC5tYXgoXHJcbiAgICAgICAgMCxcclxuICAgICAgICBHaXRIdWJXYXRjaGVyLmFwaUZhaWx1cmVDb3VudCAtIDIsXHJcbiAgICAgICk7XHJcbiAgICB9IGNhdGNoIChleCkge1xyXG4gICAgICBhd2FpdCB0aGlzLmhhbmRsZUdpdEh1YkZhaWx1cmUoZXggYXMgUmVxdWVzdEVycm9yKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5sYXN0UmVhZFRzID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICBpZiAocmVzcG9uc2UuZGF0YS5sZW5ndGgpIHtcclxuICAgICAgbG9nLmluZm8oYEdvdCAke3Jlc3BvbnNlLmRhdGEubGVuZ3RofSBub3RpZmljYXRpb25zIGZvciAke3RoaXMudXNlcklkfWApO1xyXG4gICAgfVxyXG4gICAgZm9yIChjb25zdCByYXdFdmVudCBvZiByZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgIGNvbnN0IGV2ID0gcmF3RXZlbnQgYXMgdW5rbm93biBhcyBIU0dpdEh1YlVzZXJOb3RpZmljYXRpb247XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKHJhd0V2ZW50LnN1YmplY3QudXJsKSB7XHJcbiAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLm9jdG9LaXQucmVxdWVzdChyYXdFdmVudC5zdWJqZWN0LnVybCk7XHJcbiAgICAgICAgICBldi5zdWJqZWN0LnVybF9kYXRhID0gcmVzLmRhdGE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyYXdFdmVudC5zdWJqZWN0LmxhdGVzdF9jb21tZW50X3VybCkge1xyXG4gICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5vY3RvS2l0LnJlcXVlc3QoXHJcbiAgICAgICAgICAgIHJhd0V2ZW50LnN1YmplY3QubGF0ZXN0X2NvbW1lbnRfdXJsLFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIGV2LnN1YmplY3QubGF0ZXN0X2NvbW1lbnRfdXJsX2RhdGEgPSByZXMuZGF0YTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJhd0V2ZW50LnJlYXNvbiA9PT0gXCJyZXZpZXdfcmVxdWVzdGVkXCIpIHtcclxuICAgICAgICAgIGlmICghZXYuc3ViamVjdC51cmxfZGF0YT8ubnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKFwicmV2aWV3X3JlcXVlc3RlZCB3YXMgbWlzc2luZyBzdWJqZWN0LnVybF9kYXRhLm51bWJlclwiKTtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoIXJhd0V2ZW50LnJlcG9zaXRvcnkub3duZXIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oXCJyZXZpZXdfcmVxdWVzdGVkIHdhcyBtaXNzaW5nIHJlcG9zaXRvcnkub3duZXJcIik7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZXYuc3ViamVjdC5yZXF1ZXN0ZWRfcmV2aWV3ZXJzID0gKFxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLm9jdG9LaXQucHVsbHMubGlzdFJlcXVlc3RlZFJldmlld2Vycyh7XHJcbiAgICAgICAgICAgICAgcHVsbF9udW1iZXI6IGV2LnN1YmplY3QudXJsX2RhdGEubnVtYmVyLFxyXG4gICAgICAgICAgICAgIG93bmVyOiByYXdFdmVudC5yZXBvc2l0b3J5Lm93bmVyLmxvZ2luLFxyXG4gICAgICAgICAgICAgIHJlcG86IHJhd0V2ZW50LnJlcG9zaXRvcnkubmFtZSxcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICkuZGF0YSBhcyBhbnk7XHJcbiAgICAgICAgICBldi5zdWJqZWN0LnJldmlld3MgPSAoXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub2N0b0tpdC5wdWxscy5saXN0UmV2aWV3cyh7XHJcbiAgICAgICAgICAgICAgcHVsbF9udW1iZXI6IGV2LnN1YmplY3QudXJsX2RhdGEubnVtYmVyLFxyXG4gICAgICAgICAgICAgIG93bmVyOiByYXdFdmVudC5yZXBvc2l0b3J5Lm93bmVyLmxvZ2luLFxyXG4gICAgICAgICAgICAgIHJlcG86IHJhd0V2ZW50LnJlcG9zaXRvcnkubmFtZSxcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICkuZGF0YTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBwcmUtcHJvY2VzcyAke3Jhd0V2ZW50LmlkfTogJHtleH1gKTtcclxuICAgICAgICAvLyBXZSBzdGlsbCBwdXNoXHJcbiAgICAgIH1cclxuICAgICAgbG9nLmRlYnVnKGBQdXNoaW5nICR7ZXYuaWR9YCk7XHJcbiAgICAgIE1ldHJpY3Mubm90aWZpY2F0aW9uc1B1c2guaW5jKHsgc2VydmljZTogXCJnaXRodWJcIiB9KTtcclxuICAgICAgdGhpcy5lbWl0KFwibmV3X2V2ZW50c1wiLCB7XHJcbiAgICAgICAgZXZlbnROYW1lOiBcIm5vdGlmaWNhdGlvbnMudXNlci5ldmVudHNcIixcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICByb29tSWQ6IHRoaXMucm9vbUlkLFxyXG4gICAgICAgICAgZXZlbnRzOiBbZXZdLFxyXG4gICAgICAgICAgbGFzdFJlYWRUczogdGhpcy5sYXN0UmVhZFRzLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2VuZGVyOiBcIkdpdGh1YldlYmhvb2tzXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXX0=