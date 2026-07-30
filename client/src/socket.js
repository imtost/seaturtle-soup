import { io } from "socket.io-client";

// When VITE_SERVER_URL isn't set, connect to the page's own origin — the
// Vite dev server proxies /socket.io to the backend (see vite.config.js),
// so a single tunnel/URL to the client is enough for remote players.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || undefined;

export const socket = io(SERVER_URL, {
  autoConnect: true,
});
