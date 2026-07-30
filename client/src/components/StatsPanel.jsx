import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";

export default function StatsPanel() {
  const { room, clientId } = useRoom();
  const [open, setOpen] = useState(true);
  const questions = room?.questions ?? [];
  const attempts = room?.answerAttempts ?? [];

  const myQuestions = questions.filter((q) => q.playerId === clientId).length;
  const myAttempts = attempts.filter((a) => a.playerId === clientId).length;

  return (
    <section className="panel stats-panel">
      <div className="panel-header collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>
          통계<span className="chevron">{open ? "▾" : "▸"}</span>
        </h3>
      </div>
      {open && (
        <div className="stats-row">
          <span className="stats-item">
            내 질문 <strong>{myQuestions}</strong>
          </span>
          <span className="stats-item">
            내 정답 시도 <strong>{myAttempts}</strong>
          </span>
          <span className="stats-item">
            전체 질문 <strong>{questions.length}</strong>
          </span>
          <span className="stats-item">
            전체 정답 시도 <strong>{attempts.length}</strong>
          </span>
        </div>
      )}
    </section>
  );
}
