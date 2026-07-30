import { customAlphabet } from "nanoid";

const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateRoomCode = customAlphabet(roomCodeAlphabet, 5);

const rooms = new Map();

export function createRoom(hostClientId, hostSocketId, hostNickname) {
  let id;
  do {
    id = generateRoomCode();
  } while (rooms.has(id));

  const room = {
    id,
    hostClientId,
    status: "waiting",
    problem: { content: "", ending: "" },
    players: [
      { clientId: hostClientId, socketId: hostSocketId, nickname: hostNickname, role: "host" },
    ],
    questions: [],
    hints: [],
    chatMessages: [],
    pendingQueue: [],
    answerAttempts: [],
    result: null,
    nextOrder: 1,
  };

  rooms.set(id, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function deleteRoom(roomId) {
  rooms.delete(roomId);
}

export function addPlayer(room, clientId, socketId, nickname) {
  const player = { clientId, socketId, nickname, role: "participant" };
  room.players.push(player);
  return player;
}

export function removePlayer(room, clientId) {
  room.players = room.players.filter((p) => p.clientId !== clientId);
  room.pendingQueue = room.pendingQueue.filter((p) => p.playerId !== clientId);
}

// Looks up a player by their persistent clientId (stable across reconnects),
// not the ephemeral per-connection socket.id.
export function findPlayer(room, clientId) {
  return room.players.find((p) => p.clientId === clientId);
}

// Client-safe view of a room. Hides the ending unless the game has ended,
// except from the host (identified by viewerClientId), who wrote it and may
// preview it at any time.
export function toPublicRoom(room, viewerClientId) {
  const revealEnding = room.status === "ended" || viewerClientId === room.hostClientId;
  return {
    id: room.id,
    hostClientId: room.hostClientId,
    status: room.status,
    problem: {
      content: room.problem.content,
      ending: revealEnding ? room.problem.ending : undefined,
    },
    players: room.players.map((p) => ({
      id: p.clientId,
      nickname: p.nickname,
      role: p.role,
    })),
    questions: room.questions,
    hints: room.hints,
    chatMessages: room.chatMessages,
    answerAttempts: room.answerAttempts,
    result: room.result,
  };
}
