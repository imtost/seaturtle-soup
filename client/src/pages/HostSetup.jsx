import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";
import ParticipantList from "../components/ParticipantList.jsx";
import RoomHeader from "../components/RoomHeader.jsx";

export default function HostSetup() {
  const { room, setProblem, startGame, lastError, clearError } = useRoom();
  const [content, setContent] = useState(room?.problem?.content || "");
  const [ending, setEnding] = useState("");
  const [saved, setSaved] = useState(false);
  const [starting, setStarting] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    clearError();
    const res = await setProblem(content, ending);
    if (res.ok) setSaved(true);
  }

  async function handleStart() {
    setStarting(true);
    clearError();
    const saveRes = await setProblem(content, ending);
    if (saveRes.ok) {
      await startGame();
    }
    setStarting(false);
  }

  return (
    <div className="page centered">
      <div className="card wide">
        <RoomHeader />
        <h2>문제 작성</h2>

        <ParticipantList />

        <form onSubmit={handleSave} className="form">
          <label>
            문제 내용 (참여자에게 공개)
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="예: 한 남자가 레스토랑에서 바다거북스프를 주문하고 한 입 먹더니 자살했다. 왜일까?"
              required
            />
          </label>
          <label>
            정답 (맞히면 공개)
            <textarea
              value={ending}
              onChange={(e) => setEnding(e.target.value)}
              rows={4}
              placeholder="참여자가 정답을 맞혔을 때 공개할 내용을 작성하세요"
              required
            />
          </label>

          {lastError && <p className="error-text">{lastError}</p>}
          {saved && <p className="success-text">저장되었습니다.</p>}

          <div className="btn-row">
            <button type="submit" className="secondary-btn">
              저장
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleStart}
              disabled={starting || !content.trim() || !ending.trim()}
            >
              게임 시작
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
