import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "./socket.js";
import { getClientId } from "./clientId.js";

const RoomContext = createContext(null);
const SESSION_KEY = "bsq_session_room";

export function RoomProvider({ children }) {
  const navigate = useNavigate();
  const clientIdRef = useRef(getClientId());
  const [roomId, setRoomId] = useState(null);
  const [role, setRole] = useState(null); // 'host' | 'participant'
  const [nickname, setNickname] = useState("");
  const [room, setRoom] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [incorrectNotice, setIncorrectNotice] = useState(null);
  const [questionResolvedNotice, setQuestionResolvedNotice] = useState(null);
  const [closedNotice, setClosedNotice] = useState(null);
  const [kickedNotice, setKickedNotice] = useState(null);
  const [myPendingByType, setMyPendingByType] = useState({ question: null, answer: null });
  const [isRejoining, setIsRejoining] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const pendingIdsRef = useRef(new Set());

  // Lets the host notice a new question/answer arrive even while looking
  // elsewhere on the screen, without needing to watch the pending list.
  const pushToast = useCallback((message) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applySession = useCallback((res, roleOverride) => {
    setRoomId(res.roomId);
    setRole(roleOverride ?? res.role);
    if (res.nickname) setNickname(res.nickname);
    setRoom(res.room);
    setClosedNotice(null);
    setKickedNotice(null);
    setMyPendingByType(res.myPending ?? { question: null, answer: null });
    localStorage.setItem(SESSION_KEY, res.roomId);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    function onRoomState(publicRoom) {
      setRoom(publicRoom);
      if (publicRoom.status === "waiting") {
        setMyPendingByType({ question: null, answer: null });
      }
    }
    function onPendingUpdate(queue) {
      const prevIds = pendingIdsRef.current;
      const newEntries = queue.filter((entry) => !prevIds.has(entry.id));
      newEntries.forEach((entry) => {
        pushToast(
          `${entry.nickname}님이 ${entry.type === "question" ? "질문" : "정답"}을 보냈습니다`
        );
      });
      pendingIdsRef.current = new Set(queue.map((entry) => entry.id));
      setPendingQueue(queue);
    }
    function onChatMessage(message) {
      setRoom((prev) =>
        prev ? { ...prev, chatMessages: [...prev.chatMessages, message] } : prev
      );
    }
    function onQuestionListUpdate(questions) {
      setRoom((prev) => (prev ? { ...prev, questions } : prev));
    }
    function onHintListUpdate(hints) {
      setRoom((prev) => (prev ? { ...prev, hints } : prev));
    }
    function onGameEnd(result) {
      setRoom((prev) => (prev ? { ...prev, status: "ended", result } : prev));
    }
    function onAnswerIncorrect(payload) {
      setIncorrectNotice(payload);
    }
    function onQuestionResolved(payload) {
      setQuestionResolvedNotice(payload);
    }
    function onRoomClosed(payload) {
      setClosedNotice(payload);
      clearSession();
    }
    function onSubmissionResolved(payload) {
      setMyPendingByType((prev) => ({ ...prev, [payload.type]: null }));
    }
    function onPlayerKicked(payload) {
      setKickedNotice(payload);
      clearSession();
    }

    socket.on("room:state", onRoomState);
    socket.on("host:pendingUpdate", onPendingUpdate);
    socket.on("chat:message", onChatMessage);
    socket.on("question:listUpdate", onQuestionListUpdate);
    socket.on("hint:listUpdate", onHintListUpdate);
    socket.on("game:end", onGameEnd);
    socket.on("answer:incorrect", onAnswerIncorrect);
    socket.on("question:resolved", onQuestionResolved);
    socket.on("room:closed", onRoomClosed);
    socket.on("submission:resolved", onSubmissionResolved);
    socket.on("player:kicked", onPlayerKicked);

    return () => {
      socket.off("room:state", onRoomState);
      socket.off("host:pendingUpdate", onPendingUpdate);
      socket.off("chat:message", onChatMessage);
      socket.off("question:listUpdate", onQuestionListUpdate);
      socket.off("hint:listUpdate", onHintListUpdate);
      socket.off("game:end", onGameEnd);
      socket.off("answer:incorrect", onAnswerIncorrect);
      socket.off("question:resolved", onQuestionResolved);
      socket.off("room:closed", onRoomClosed);
      socket.off("submission:resolved", onSubmissionResolved);
      socket.off("player:kicked", onPlayerKicked);
    };
  }, [clearSession, pushToast]);

  // Re-authenticates with the server using the saved room id whenever the
  // socket (re)connects — covers both a page refresh (fresh mount) and a
  // transient drop + auto-reconnect while the tab stays open (the server
  // only recognizes a connection after it re-sends its clientId).
  const roomRef = useRef(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    function tryRejoin() {
      const savedRoomId = localStorage.getItem(SESSION_KEY);
      if (!savedRoomId) return;

      const showLoading = !roomRef.current;
      if (showLoading) setIsRejoining(true);
      socket.emit(
        "room:rejoin",
        { roomId: savedRoomId, clientId: clientIdRef.current },
        (res) => {
          if (res.ok) {
            applySession(res);
            if (showLoading) navigate(`/room/${res.roomId}`, { replace: true });
          } else {
            clearSession();
          }
          if (showLoading) setIsRejoining(false);
        }
      );
    }

    if (socket.connected) tryRejoin();
    socket.on("connect", tryRejoin);
    return () => socket.off("connect", tryRejoin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(
    (nick) =>
      new Promise((resolve) => {
        socket.emit("room:create", { nickname: nick, clientId: clientIdRef.current }, (res) => {
          if (res.ok) {
            applySession(res, "host");
          } else {
            setLastError(res.error);
          }
          resolve(res);
        });
      }),
    [applySession]
  );

  const joinRoom = useCallback(
    (id, nick) =>
      new Promise((resolve) => {
        socket.emit(
          "room:join",
          { roomId: id, nickname: nick, clientId: clientIdRef.current },
          (res) => {
            if (res.ok) {
              applySession(res, "participant");
            } else {
              setLastError(res.error);
            }
            resolve(res);
          }
        );
      }),
    [applySession]
  );

  const leaveRoom = useCallback(
    () =>
      new Promise((resolve) => {
        socket.emit("room:leave", {}, (res) => {
          clearSession();
          setRoomId(null);
          setRole(null);
          setRoom(null);
          setPendingQueue([]);
          setMyPendingByType({ question: null, answer: null });
          resolve(res);
        });
      }),
    [clearSession]
  );

  const setProblem = useCallback(
    (content, ending) =>
      new Promise((resolve) => {
        socket.emit("host:setProblem", { content, ending }, resolve);
      }),
    []
  );

  const startGame = useCallback(
    () =>
      new Promise((resolve) => {
        socket.emit("game:start", {}, (res) => {
          if (!res.ok) setLastError(res.error);
          resolve(res);
        });
      }),
    []
  );

  const revealAnswer = useCallback(
    () =>
      new Promise((resolve) => {
        socket.emit("host:revealAnswer", {}, (res) => {
          if (!res.ok) setLastError(res.error);
          resolve(res);
        });
      }),
    []
  );

  const sendSubmission = useCallback((type, content) => {
    return new Promise((resolve) => {
      socket.emit("submission:send", { type, content }, (res) => {
        if (!res.ok) {
          setLastError(res.error);
        } else if (res.pendingId) {
          setMyPendingByType((prev) => ({ ...prev, [res.type]: res.pendingId }));
        }
        resolve(res);
      });
    });
  }, []);

  const resolveQuestion = useCallback(
    (pendingId, result) =>
      new Promise((resolve) => {
        socket.emit("host:resolveQuestion", { pendingId, result }, resolve);
      }),
    []
  );

  const resolveAnswer = useCallback(
    (pendingId, correct) =>
      new Promise((resolve) => {
        socket.emit("host:resolveAnswer", { pendingId, correct }, resolve);
      }),
    []
  );

  const addHint = useCallback(
    (content) =>
      new Promise((resolve) => {
        socket.emit("host:addHint", { content }, resolve);
      }),
    []
  );

  const deleteHint = useCallback(
    (hintId) =>
      new Promise((resolve) => {
        socket.emit("host:deleteHint", { hintId }, (res) => {
          if (!res.ok) setLastError(res.error);
          resolve(res);
        });
      }),
    []
  );

  const playAgain = useCallback(
    () =>
      new Promise((resolve) => {
        socket.emit("host:playAgain", {}, (res) => {
          if (!res.ok) setLastError(res.error);
          resolve(res);
        });
      }),
    []
  );

  const kickPlayer = useCallback(
    (targetId) =>
      new Promise((resolve) => {
        socket.emit("host:kickPlayer", { targetId }, (res) => {
          if (!res.ok) setLastError(res.error);
          resolve(res);
        });
      }),
    []
  );

  const value = {
    clientId: clientIdRef.current,
    roomId,
    role,
    nickname,
    room,
    pendingQueue,
    lastError,
    incorrectNotice,
    questionResolvedNotice,
    closedNotice,
    kickedNotice,
    myPendingByType,
    isRejoining,
    toasts,
    dismissToast,
    clearError: () => setLastError(null),
    clearIncorrectNotice: () => setIncorrectNotice(null),
    clearQuestionResolvedNotice: () => setQuestionResolvedNotice(null),
    createRoom,
    joinRoom,
    leaveRoom,
    setProblem,
    startGame,
    revealAnswer,
    sendSubmission,
    resolveQuestion,
    resolveAnswer,
    addHint,
    deleteHint,
    kickPlayer,
    playAgain,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}
