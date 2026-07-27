import { io } from "socket.io-client";

const SOCKET_URL = "https://triageflow.systems";
const roomId = "e19f5e57-b8f2-4673-9344-889c21f4c14b";
const staffId = "c9b92811-5090-4580-bdb7-07c3db0dfa20";

console.log("Connecting to", SOCKET_URL);
const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
});

socket.on("connect", () => {
    console.log("Connected:", socket.id);
    console.log("Joining room:", roomId, staffId);
    socket.emit("joinRoomDisplay", { roomId, staffId });
});

socket.on("onQueueUpdate", (data) => {
    console.log("onQueueUpdate received:", JSON.stringify(data, null, 2));
    process.exit(0);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
});

setTimeout(() => {
    console.log("Timeout waiting for event");
    process.exit(1);
}, 10000);
