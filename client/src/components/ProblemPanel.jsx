import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";

export default function ProblemPanel({ problem, status }) {
  const { role, revealAnswer } = useRoom();
  const [previewingAnswer, setPreviewingAnswer] = useState(false);
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const isHost = role === "host";

  const showEnding = status === "ended" || previewingAnswer;

  async function handleConfirmReveal() {
    setRevealing(true);
    await revealAnswer();
    setRevealing(false);
    setConfirmingReveal(false);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>문제</h3>
        {isHost && status !== "ended" && problem.ending && (
          <div className="btn-row">
            <button
              type="button"
              className="ghost-btn small"
              onClick={() => setPreviewingAnswer((v) => !v)}
            >
              {previewingAnswer ? "정답 숨기기" : "정답보기"}
            </button>
            {status === "playing" && (
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setConfirmingReveal(true)}
              >
                정답 공개
              </button>
            )}
          </div>
        )}
      </div>
      <p className="problem-content">{problem.content}</p>
      {showEnding && problem.ending && (
        <div className="ending-reveal">
          <h4>정답{previewingAnswer && status !== "ended" ? " (미리보기)" : ""}</h4>
          <p>{problem.ending}</p>
        </div>
      )}

      {confirmingReveal && (
        <div className="modal-overlay">
          <div className="modal-card narrow">
            <h3>정답을 공개하시겠습니까?</h3>
            <p>
              아직 아무도 정답을 맞히지 못했습니다. 정답을 공개하면 이번 라운드가 즉시
              종료되고 참여자 전원에게 정답이 공개됩니다.
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirmingReveal(false)}
                disabled={revealing}
              >
                취소
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleConfirmReveal}
                disabled={revealing}
              >
                정답 공개
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
