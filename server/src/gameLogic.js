import { nanoid } from "nanoid";

export function hasPendingSubmission(room, playerId, type) {
  return room.pendingQueue.some((p) => p.playerId === playerId && p.type === type);
}

// A reconnecting client has no other way to learn whether it still has an
// unanswered question/answer waiting, since the pending queue is otherwise
// only ever pushed to the host.
export function getMyPendingByType(room, playerId) {
  const result = { question: null, answer: null };
  for (const entry of room.pendingQueue) {
    if (entry.playerId === playerId) result[entry.type] = entry.id;
  }
  return result;
}

export function enqueueSubmission(room, { type, playerId, nickname, content }) {
  const entry = {
    id: nanoid(8),
    type,
    playerId,
    nickname,
    content,
    timestamp: Date.now(),
  };
  room.pendingQueue.push(entry);
  return entry;
}

export function dequeueSubmission(room, pendingId) {
  const index = room.pendingQueue.findIndex((p) => p.id === pendingId);
  if (index === -1) return undefined;
  const [entry] = room.pendingQueue.splice(index, 1);
  return entry;
}

export function appendQuestion(room, pendingEntry, result) {
  const question = {
    id: pendingEntry.id,
    playerId: pendingEntry.playerId,
    nickname: pendingEntry.nickname,
    content: pendingEntry.content,
    result,
    order: room.nextOrder++,
    timestamp: Date.now(),
  };
  room.questions.push(question);
  return question;
}

export function appendHint(room, content) {
  const hint = {
    id: nanoid(8),
    content,
    order: room.hints.length + 1,
    timestamp: Date.now(),
  };
  room.hints.push(hint);
  return hint;
}

export function removeHint(room, hintId) {
  const index = room.hints.findIndex((h) => h.id === hintId);
  if (index === -1) return false;
  room.hints.splice(index, 1);
  return true;
}

export function appendChatMessage(room, { playerId, nickname, content }) {
  const message = {
    id: nanoid(8),
    playerId,
    nickname,
    content,
    timestamp: Date.now(),
  };
  room.chatMessages.push(message);
  return message;
}

// Records every resolved answer attempt (correct or not) so per-player and
// room-wide attempt counts can be shown; the guessed content itself is
// intentionally omitted so other players can't see each other's guesses.
export function appendAnswerAttempt(room, { playerId, nickname, correct }) {
  const attempt = {
    id: nanoid(8),
    playerId,
    nickname,
    correct,
    timestamp: Date.now(),
  };
  room.answerAttempts.push(attempt);
  return attempt;
}

export function finishGame(room, { winnerId, winnerNickname, answerContent }) {
  room.status = "ended";
  room.result = {
    winnerId,
    winnerNickname,
    answerContent,
    ending: room.problem.ending,
    noWinner: false,
  };
}

// Host chose to reveal the ending without anyone guessing it correctly.
export function endRoundWithoutWinner(room) {
  room.status = "ended";
  room.result = {
    winnerId: null,
    winnerNickname: null,
    answerContent: null,
    ending: room.problem.ending,
    noWinner: true,
  };
}

// Resets a room back to 'waiting' for a new round. Players and chat history
// are intentionally preserved; everything round-specific is cleared.
export function resetRoomForNewRound(room) {
  room.status = "waiting";
  room.problem = { content: "", ending: "" };
  room.questions = [];
  room.hints = [];
  room.pendingQueue = [];
  room.answerAttempts = [];
  room.result = null;
  room.nextOrder = 1;
}
