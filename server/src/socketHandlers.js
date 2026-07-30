import {
  addPlayer,
  createRoom,
  deleteRoom,
  findPlayer,
  getRoom,
  removePlayer,
  toPublicRoom,
} from "./rooms.js";
import {
  appendAnswerAttempt,
  appendChatMessage,
  appendHint,
  appendQuestion,
  dequeueSubmission,
  endRoundWithoutWinner,
  enqueueSubmission,
  finishGame,
  getMyPendingByType,
  hasPendingSubmission,
  removeHint,
  resetRoomForNewRound,
} from "./gameLogic.js";

const LEAVE_GRACE_MS = 20000;
const disconnectTimers = new Map(); // `${roomId}:${clientId}` -> Timeout

function timerKey(roomId, clientId) {
  return `${roomId}:${clientId}`;
}

function clearDisconnectTimer(roomId, clientId) {
  const key = timerKey(roomId, clientId);
  const existing = disconnectTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    disconnectTimers.delete(key);
  }
}

// The host gets a separate emit that includes the ending (so they can
// preview it mid-game); everyone else gets it only once the game has ended.
function broadcastRoomState(io, room) {
  io.to(room.id).except(`client:${room.hostClientId}`).emit("room:state", toPublicRoom(room));
  io.to(`client:${room.hostClientId}`).emit(
    "room:state",
    toPublicRoom(room, room.hostClientId)
  );
}

function sendPendingQueue(io, room) {
  io.to(`client:${room.hostClientId}`).emit("host:pendingUpdate", room.pendingQueue);
}

function isHost(room, clientId) {
  return room.hostClientId === clientId;
}

// Shared by both the explicit "leave" action and the disconnect grace-timeout.
function performLeave(io, room, clientId) {
  if (isHost(room, clientId)) {
    io.to(room.id).emit("room:closed", { reason: "사회자가 방을 나가서 방이 종료되었습니다." });
    deleteRoom(room.id);
  } else {
    removePlayer(room, clientId);
    sendPendingQueue(io, room);
    broadcastRoomState(io, room);
  }
}

export function registerSocketHandlers(io, socket) {
  function authenticate(roomId, clientId) {
    socket.data.clientId = clientId;
    socket.data.roomId = roomId;
    socket.join(roomId);
    socket.join(`client:${clientId}`);
    clearDisconnectTimer(roomId, clientId);
  }

  socket.on("room:create", ({ nickname, clientId }, callback) => {
    if (!clientId) {
      callback?.({ ok: false, error: "잘못된 요청입니다." });
      return;
    }
    const room = createRoom(clientId, socket.id, nickname?.trim() || "사회자");
    authenticate(room.id, clientId);
    callback?.({ ok: true, roomId: room.id, role: "host", room: toPublicRoom(room, clientId) });
  });

  socket.on("room:join", ({ roomId, nickname, clientId }, callback) => {
    if (!clientId) {
      callback?.({ ok: false, error: "잘못된 요청입니다." });
      return;
    }
    const room = getRoom(roomId?.toUpperCase());
    if (!room) {
      callback?.({ ok: false, error: "존재하지 않는 방입니다." });
      return;
    }
    if (findPlayer(room, clientId)) {
      callback?.({ ok: false, error: "이미 참여 중인 방입니다." });
      return;
    }
    addPlayer(room, clientId, socket.id, nickname?.trim() || "참여자");
    authenticate(room.id, clientId);
    callback?.({
      ok: true,
      roomId: room.id,
      role: "participant",
      room: toPublicRoom(room, clientId),
    });
    broadcastRoomState(io, room);
  });

  // Restores a session after a page refresh/reconnect, keyed by the
  // persistent clientId stored in the browser (not the socket.id, which
  // changes on every reconnect).
  socket.on("room:rejoin", ({ roomId, clientId }, callback) => {
    const room = getRoom(roomId?.toUpperCase());
    if (!room) {
      callback?.({ ok: false, error: "방을 찾을 수 없습니다." });
      return;
    }
    const player = findPlayer(room, clientId);
    if (!player) {
      callback?.({ ok: false, error: "참여 정보를 찾을 수 없습니다." });
      return;
    }
    player.socketId = socket.id;
    authenticate(room.id, clientId);
    callback?.({
      ok: true,
      roomId: room.id,
      role: player.role,
      nickname: player.nickname,
      room: toPublicRoom(room, clientId),
      myPending: getMyPendingByType(room, clientId),
    });
    if (isHost(room, clientId)) {
      sendPendingQueue(io, room);
    }
  });

  socket.on("room:leave", (_payload, callback) => {
    const { roomId, clientId } = socket.data;
    const room = roomId && getRoom(roomId);
    if (!room || !clientId) {
      callback?.({ ok: true });
      return;
    }
    clearDisconnectTimer(roomId, clientId);
    performLeave(io, room, clientId);
    socket.data.clientId = null;
    socket.data.roomId = null;
    callback?.({ ok: true });
  });

  socket.on("host:setProblem", ({ content, ending }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    room.problem.content = content?.trim() || "";
    room.problem.ending = ending?.trim() || "";
    callback?.({ ok: true });
    broadcastRoomState(io, room);
  });

  socket.on("game:start", (_payload, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    if (!room.problem.content || !room.problem.ending) {
      callback?.({ ok: false, error: "문제와 결말을 먼저 작성해주세요." });
      return;
    }
    room.status = "playing";
    callback?.({ ok: true });
    broadcastRoomState(io, room);
  });

  socket.on("host:revealAnswer", (_payload, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    if (room.status !== "playing") {
      callback?.({ ok: false, error: "게임이 진행 중일 때만 정답을 공개할 수 있습니다." });
      return;
    }
    endRoundWithoutWinner(room);
    io.to(room.id).emit("game:end", room.result);
    broadcastRoomState(io, room);
    callback?.({ ok: true });
  });

  socket.on("submission:send", ({ type, content }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room) {
      callback?.({ ok: false, error: "존재하지 않는 방입니다." });
      return;
    }
    const player = findPlayer(room, clientId);
    if (!player) {
      callback?.({ ok: false, error: "방에 참여하지 않은 사용자입니다." });
      return;
    }
    const trimmed = content?.trim();
    if (!trimmed) {
      callback?.({ ok: false, error: "내용을 입력해주세요." });
      return;
    }

    if (type === "chat") {
      if (room.status !== "playing" && room.status !== "ended") {
        callback?.({ ok: false, error: "지금은 채팅을 보낼 수 없습니다." });
        return;
      }
      const message = appendChatMessage(room, {
        playerId: clientId,
        nickname: player.nickname,
        content: trimmed,
      });
      io.to(room.id).emit("chat:message", message);
      callback?.({ ok: true });
      return;
    }

    if (type === "question" || type === "answer") {
      if (room.status !== "playing") {
        callback?.({ ok: false, error: "게임이 진행 중이 아닙니다." });
        return;
      }
      if (hasPendingSubmission(room, clientId, type)) {
        callback?.({
          ok: false,
          error:
            type === "question"
              ? "이전에 보낸 질문에 대한 답변을 기다리는 중입니다."
              : "이전에 보낸 정답에 대한 판정을 기다리는 중입니다.",
        });
        return;
      }
      const entry = enqueueSubmission(room, {
        type,
        playerId: clientId,
        nickname: player.nickname,
        content: trimmed,
      });
      sendPendingQueue(io, room);
      callback?.({ ok: true, pendingId: entry.id, type });
      return;
    }

    callback?.({ ok: false, error: "알 수 없는 전송 타입입니다." });
  });

  socket.on("host:resolveQuestion", ({ pendingId, result }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    const entry = dequeueSubmission(room, pendingId);
    if (!entry || entry.type !== "question") {
      callback?.({ ok: false, error: "해당 항목을 찾을 수 없습니다." });
      return;
    }

    sendPendingQueue(io, room);
    io.to(`client:${entry.playerId}`).emit("submission:resolved", {
      pendingId: entry.id,
      type: entry.type,
    });
    io.to(`client:${entry.playerId}`).emit("question:resolved", {
      content: entry.content,
      result,
    });

    if (result === "pass") {
      callback?.({ ok: true });
      return;
    }

    appendQuestion(room, entry, result);
    io.to(room.id).emit("question:listUpdate", room.questions);
    callback?.({ ok: true });
  });

  socket.on("host:resolveAnswer", ({ pendingId, correct }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    const entry = dequeueSubmission(room, pendingId);
    if (!entry || entry.type !== "answer") {
      callback?.({ ok: false, error: "해당 항목을 찾을 수 없습니다." });
      return;
    }

    sendPendingQueue(io, room);
    io.to(`client:${entry.playerId}`).emit("submission:resolved", {
      pendingId: entry.id,
      type: entry.type,
    });

    appendAnswerAttempt(room, {
      playerId: entry.playerId,
      nickname: entry.nickname,
      correct,
    });

    if (!correct) {
      io.to(`client:${entry.playerId}`).emit("answer:incorrect", { content: entry.content });
      broadcastRoomState(io, room);
      callback?.({ ok: true });
      return;
    }

    finishGame(room, {
      winnerId: entry.playerId,
      winnerNickname: entry.nickname,
      answerContent: entry.content,
    });
    io.to(room.id).emit("game:end", room.result);
    broadcastRoomState(io, room);
    callback?.({ ok: true });
  });

  socket.on("host:addHint", ({ content }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    const trimmed = content?.trim();
    if (!trimmed) {
      callback?.({ ok: false, error: "힌트 내용을 입력해주세요." });
      return;
    }
    const hint = appendHint(room, trimmed);
    io.to(room.id).emit("hint:listUpdate", room.hints);
    callback?.({ ok: true, hint });
  });

  socket.on("host:deleteHint", ({ hintId }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    const removed = removeHint(room, hintId);
    if (!removed) {
      callback?.({ ok: false, error: "해당 힌트를 찾을 수 없습니다." });
      return;
    }
    io.to(room.id).emit("hint:listUpdate", room.hints);
    callback?.({ ok: true });
  });

  socket.on("host:playAgain", (_payload, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    if (room.status !== "ended") {
      callback?.({ ok: false, error: "게임이 종료된 후에만 다시 시작할 수 있습니다." });
      return;
    }
    resetRoomForNewRound(room);
    sendPendingQueue(io, room);
    broadcastRoomState(io, room);
    callback?.({ ok: true });
  });

  socket.on("host:kickPlayer", ({ targetId }, callback) => {
    const { roomId, clientId } = socket.data;
    const room = getRoom(roomId);
    if (!room || !isHost(room, clientId)) {
      callback?.({ ok: false, error: "권한이 없습니다." });
      return;
    }
    if (targetId === room.hostClientId) {
      callback?.({ ok: false, error: "사회자는 강퇴할 수 없습니다." });
      return;
    }
    const target = findPlayer(room, targetId);
    if (!target) {
      callback?.({ ok: false, error: "해당 참여자를 찾을 수 없습니다." });
      return;
    }

    clearDisconnectTimer(room.id, targetId);
    removePlayer(room, targetId);
    sendPendingQueue(io, room);

    io.to(`client:${targetId}`).emit("player:kicked", { reason: "사회자에 의해 강퇴되었습니다." });
    io.in(`client:${targetId}`).socketsLeave(room.id);

    broadcastRoomState(io, room);
    callback?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const { roomId, clientId } = socket.data || {};
    if (!roomId || !clientId) return;

    const key = timerKey(roomId, clientId);
    const timer = setTimeout(() => {
      disconnectTimers.delete(key);
      const room = getRoom(roomId);
      if (!room) return;
      const player = findPlayer(room, clientId);
      if (!player || player.socketId !== socket.id) return; // already reconnected elsewhere
      performLeave(io, room, clientId);
    }, LEAVE_GRACE_MS);
    disconnectTimers.set(key, timer);
  });
}
