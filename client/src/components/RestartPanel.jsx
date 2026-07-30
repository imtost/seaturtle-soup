import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";

export default function RestartPanel() {
  const { setProblem, startGame, playAgain, lastError, clearError } = useRoom();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [ending, setEnding] = useState("");
  const [starting, setStarting] = useState(false);

  async function handleStart(e) {
    e.preventDefault();
    if (!content.trim() || !ending.trim()) return;
    setStarting(true);
    clearError();

    const resetRes = await playAgain();
    if (resetRes.ok) {
      const saveRes = await setProblem(content, ending);
      if (saveRes.ok) {
        const startRes = await startGame();
        if (startRes.ok) {
          setOpen(false);
          setContent("");
          setEnding("");
        }
      }
    }
    setStarting(false);
  }

  if (!open) {
    return (
      <section className="panel">
        <button type="button" className="primary-btn" onClick={() => setOpen(true)}>
          다시 시작
        </button>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>새 문제 작성</h3>
        <button type="button" className="ghost-btn small" onClick={() => setOpen(false)}>
          닫기
        </button>
      </div>
      <form onSubmit={handleStart} className="form">
        <label>
          문제 내용 (참여자에게 공개)
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="새 문제를 입력하세요"
            required
          />
        </label>
        <label>
          정답 (맞히면 공개)
          <textarea
            value={ending}
            onChange={(e) => setEnding(e.target.value)}
            rows={3}
            placeholder="새 정답을 입력하세요"
            required
          />
        </label>
        {lastError && <p className="error-text">{lastError}</p>}
        <button
          type="submit"
          className="primary-btn"
          disabled={starting || !content.trim() || !ending.trim()}
        >
          게임 시작
        </button>
      </form>
    </section>
  );
}
