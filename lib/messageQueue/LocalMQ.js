"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalMQ = void 0;
const events_1 = require("events");
const Types_1 = require("./Types");
const micromatch_1 = __importDefault(require("micromatch"));
const node_crypto_1 = require("node:crypto");
const Metrics_1 = __importDefault(require("../Metrics"));
class LocalMQ extends events_1.EventEmitter {
    subs;
    constructor() {
        super();
        this.subs = new Set();
    }
    subscribe(eventGlob) {
        this.subs.add(eventGlob);
    }
    unsubscribe(eventGlob) {
        this.subs.delete(eventGlob);
    }
    async push(message) {
        Metrics_1.default.messageQueuePushes.inc({ event: message.eventName });
        if (!micromatch_1.default.match([...this.subs], message.eventName)) {
            return;
        }
        if (!message.messageId) {
            message.messageId = (0, node_crypto_1.randomUUID)();
        }
        this.emit(message.eventName, message);
    }
    async pushWait(message, timeout = Types_1.DEFAULT_RES_TIMEOUT) {
        let resolve;
        let timer;
        const p = new Promise((res, rej) => {
            resolve = res;
            timer = setTimeout(() => {
                rej(new Error(`Timeout waiting for message queue response for ${message.eventName} / ${message.messageId}`));
            }, timeout);
        });
        const awaitResponse = (response) => {
            if (response.messageId === message.messageId) {
                clearTimeout(timer);
                this.removeListener(`response.${message.eventName}`, awaitResponse);
                resolve(response.data);
            }
        };
        this.addListener(`response.${message.eventName}`, awaitResponse);
        this.push(message);
        return p;
    }
}
exports.LocalMQ = LocalMQ;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9jYWxNUS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tZXNzYWdlUXVldWUvTG9jYWxNUS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxtQ0FBc0M7QUFDdEMsbUNBSWlCO0FBQ2pCLDREQUFvQztBQUNwQyw2Q0FBeUM7QUFDekMseURBQWlDO0FBRWpDLE1BQWEsT0FBUSxTQUFRLHFCQUFZO0lBQy9CLElBQUksQ0FBYztJQUMxQjtRQUNFLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxTQUFTLENBQUMsU0FBaUI7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVNLFdBQVcsQ0FBQyxTQUFpQjtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU0sS0FBSyxDQUFDLElBQUksQ0FBSSxPQUErQjtRQUNsRCxpQkFBTyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsb0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN6RCxPQUFPO1FBQ1QsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdkIsT0FBTyxDQUFDLFNBQVMsR0FBRyxJQUFBLHdCQUFVLEdBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFTSxLQUFLLENBQUMsUUFBUSxDQUNuQixPQUErQixFQUMvQixVQUFrQiwyQkFBbUI7UUFFckMsSUFBSSxPQUEyQixDQUFDO1FBQ2hDLElBQUksS0FBcUIsQ0FBQztRQUUxQixNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNwQyxPQUFPLEdBQUcsR0FBRyxDQUFDO1lBQ2QsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3RCLEdBQUcsQ0FDRCxJQUFJLEtBQUssQ0FDUCxrREFBa0QsT0FBTyxDQUFDLFNBQVMsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQzdGLENBQ0YsQ0FBQztZQUNKLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsQ0FBQyxRQUFnQyxFQUFFLEVBQUU7WUFDekQsSUFBSSxRQUFRLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDN0MsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNwQixJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNwRSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUF4REQsMEJBd0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSBcImV2ZW50c1wiO1xyXG5pbXBvcnQge1xyXG4gIE1lc3NhZ2VRdWV1ZSxcclxuICBNZXNzYWdlUXVldWVNZXNzYWdlLFxyXG4gIERFRkFVTFRfUkVTX1RJTUVPVVQsXHJcbn0gZnJvbSBcIi4vVHlwZXNcIjtcclxuaW1wb3J0IG1pY3JvbWF0Y2ggZnJvbSBcIm1pY3JvbWF0Y2hcIjtcclxuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xyXG5pbXBvcnQgTWV0cmljcyBmcm9tIFwiLi4vTWV0cmljc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIExvY2FsTVEgZXh0ZW5kcyBFdmVudEVtaXR0ZXIgaW1wbGVtZW50cyBNZXNzYWdlUXVldWUge1xyXG4gIHByaXZhdGUgc3ViczogU2V0PHN0cmluZz47XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgdGhpcy5zdWJzID0gbmV3IFNldCgpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHN1YnNjcmliZShldmVudEdsb2I6IHN0cmluZykge1xyXG4gICAgdGhpcy5zdWJzLmFkZChldmVudEdsb2IpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHVuc3Vic2NyaWJlKGV2ZW50R2xvYjogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnN1YnMuZGVsZXRlKGV2ZW50R2xvYik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgcHVzaDxUPihtZXNzYWdlOiBNZXNzYWdlUXVldWVNZXNzYWdlPFQ+KSB7XHJcbiAgICBNZXRyaWNzLm1lc3NhZ2VRdWV1ZVB1c2hlcy5pbmMoeyBldmVudDogbWVzc2FnZS5ldmVudE5hbWUgfSk7XHJcbiAgICBpZiAoIW1pY3JvbWF0Y2gubWF0Y2goWy4uLnRoaXMuc3Vic10sIG1lc3NhZ2UuZXZlbnROYW1lKSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoIW1lc3NhZ2UubWVzc2FnZUlkKSB7XHJcbiAgICAgIG1lc3NhZ2UubWVzc2FnZUlkID0gcmFuZG9tVVVJRCgpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5lbWl0KG1lc3NhZ2UuZXZlbnROYW1lLCBtZXNzYWdlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBwdXNoV2FpdDxULCBYPihcclxuICAgIG1lc3NhZ2U6IE1lc3NhZ2VRdWV1ZU1lc3NhZ2U8VD4sXHJcbiAgICB0aW1lb3V0OiBudW1iZXIgPSBERUZBVUxUX1JFU19USU1FT1VULFxyXG4gICk6IFByb21pc2U8WD4ge1xyXG4gICAgbGV0IHJlc29sdmU6ICh2YWx1ZTogWCkgPT4gdm9pZDtcclxuICAgIGxldCB0aW1lcjogTm9kZUpTLlRpbWVvdXQ7XHJcblxyXG4gICAgY29uc3QgcCA9IG5ldyBQcm9taXNlPFg+KChyZXMsIHJlaikgPT4ge1xyXG4gICAgICByZXNvbHZlID0gcmVzO1xyXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIHJlaihcclxuICAgICAgICAgIG5ldyBFcnJvcihcclxuICAgICAgICAgICAgYFRpbWVvdXQgd2FpdGluZyBmb3IgbWVzc2FnZSBxdWV1ZSByZXNwb25zZSBmb3IgJHttZXNzYWdlLmV2ZW50TmFtZX0gLyAke21lc3NhZ2UubWVzc2FnZUlkfWAsXHJcbiAgICAgICAgICApLFxyXG4gICAgICAgICk7XHJcbiAgICAgIH0sIHRpbWVvdXQpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYXdhaXRSZXNwb25zZSA9IChyZXNwb25zZTogTWVzc2FnZVF1ZXVlTWVzc2FnZTxYPikgPT4ge1xyXG4gICAgICBpZiAocmVzcG9uc2UubWVzc2FnZUlkID09PSBtZXNzYWdlLm1lc3NhZ2VJZCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihgcmVzcG9uc2UuJHttZXNzYWdlLmV2ZW50TmFtZX1gLCBhd2FpdFJlc3BvbnNlKTtcclxuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYWRkTGlzdGVuZXIoYHJlc3BvbnNlLiR7bWVzc2FnZS5ldmVudE5hbWV9YCwgYXdhaXRSZXNwb25zZSk7XHJcbiAgICB0aGlzLnB1c2gobWVzc2FnZSk7XHJcbiAgICByZXR1cm4gcDtcclxuICB9XHJcbn1cclxuIl19