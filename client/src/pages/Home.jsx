import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../RoomContext.jsx";

export default function Home() {
  const navigate = useNavigate();
  const { roomCode: quickJoinCode } = useParams();
  const { createRoom, joinRoom, lastError, clearError, isRejoining } = useRoom();
  const [mode, setMode] = useState(quickJoinCode ? "join" : "create");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(quickJoinCode ? quickJoinCode.toUpperCase() : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSubmitting(true);
    clearError();

    const res =
      mode === "create"
        ? await createRoom(nickname.trim())
        : await joinRoom(roomCode.trim(), nickname.trim());

    setSubmitting(false);
    if (res.ok) navigate(`/room/${res.roomId}`);
  }

  if (isRejoining) {
    return (
      <div className="page centered">
        <p>이전 세션을 확인하는 중...</p>
      </div>
    );
  }

  return (
    <div className="page centered">
      <div className="card">
        <h1>🐢 바다거북스프</h1>
        <div className="tabs">
          <button
            className={mode === "create" ? "tab active" : "tab"}
            onClick={() => setMode("create")}
            type="button"
          >
            방 만들기
          </button>
          <button
            className={mode === "join" ? "tab active" : "tab"}
            onClick={() => setMode("join")}
            type="button"
          >
            방 참여하기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            닉네임
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={16}
              required
              autoFocus
            />
          </label>

          {mode === "join" && (
            <label>
              방 코드
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="예: AB12C"
                maxLength={5}
                required
                readOnly={!!quickJoinCode}
              />
              {quickJoinCode && (
                <span className="hint-text">초대 링크로 방 코드가 자동 입력되었습니다.</span>
              )}
            </label>
          )}

          {lastError && <p className="error-text">{lastError}</p>}

          <button type="submit" disabled={submitting} className="primary-btn">
            {mode === "create" ? "사회자로 방 만들기" : "참여자로 입장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
