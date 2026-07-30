import { useRoom } from "../RoomContext.jsx";

export default function GameEndModal({ result, onClose }) {
  const { role, room } = useRoom();
  const questions = room?.questions ?? [];
  const attempts = room?.answerAttempts ?? [];
  const noWinner = result.noWinner || !result.winnerId;

  const winnerQuestions = questions.filter((q) => q.playerId === result.winnerId).length;
  const winnerAttempts = attempts.filter((a) => a.playerId === result.winnerId).length;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="panel-header">
          <h2>{noWinner ? "🏳️ 라운드 종료" : "🎉 게임 종료"}</h2>
          <button type="button" className="ghost-btn small" onClick={onClose}>
            닫기
          </button>
        </div>

        {noWinner ? (
          <p className="winner-text">아무도 정답을 맞히지 못했습니다.</p>
        ) : (
          <p className="winner-text">
            <strong>{result.winnerNickname}</strong>님이 정답을 맞췄습니다!
          </p>
        )}

        {!noWinner && (
          <div className="modal-section">
            <h4>제출한 정답</h4>
            <p>{result.answerContent}</p>
          </div>
        )}

        <div className="modal-section">
          <h4>정답</h4>
          <p>{result.ending}</p>
        </div>

        <div className="modal-section">
          <h4>기록</h4>
          <div className="stats-row">
            {!noWinner && (
              <>
                <span className="stats-item">
                  {result.winnerNickname}의 질문 <strong>{winnerQuestions}</strong>
                </span>
                <span className="stats-item">
                  {result.winnerNickname}의 정답 시도 <strong>{winnerAttempts}</strong>
                </span>
              </>
            )}
            <span className="stats-item">
              전체 질문 <strong>{questions.length}</strong>
            </span>
            <span className="stats-item">
              전체 정답 시도 <strong>{attempts.length}</strong>
            </span>
          </div>
        </div>

        {role !== "host" && (
          <div className="modal-section">
            <p className="hint-text">
              사회자가 새 문제를 준비하면 자동으로 다음 라운드가 시작됩니다. 그동안 채팅으로 자유롭게 대화할 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
