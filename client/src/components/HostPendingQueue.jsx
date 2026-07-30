import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";
import { formatTime } from "../formatTime.js";

const TYPE_LABEL = { question: "질문", answer: "정답 시도" };

export default function HostPendingQueue() {
  const { pendingQueue, resolveQuestion, resolveAnswer } = useRoom();
  const [open, setOpen] = useState(true);

  return (
    <section className="panel">
      <div className="panel-header collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>
          대기 중인 질문/정답 ({pendingQueue.length})
          <span className="chevron">{open ? "▾" : "▸"}</span>
        </h3>
      </div>
      {open &&
        (pendingQueue.length === 0 ? (
          <p className="empty-text">대기 중인 항목이 없습니다.</p>
        ) : (
          <ul className="pending-list">
            {pendingQueue.map((entry) => (
              <li key={entry.id} className="pending-item">
                <div className="pending-meta">
                  <span className="pending-type">{TYPE_LABEL[entry.type]}</span>
                  <span className="pending-nickname">{entry.nickname}</span>
                  <span className="item-time">{formatTime(entry.timestamp)}</span>
                </div>
                <p className="pending-content">{entry.content}</p>
                {entry.type === "question" ? (
                  <div className="btn-row wrap">
                    <button onClick={() => resolveQuestion(entry.id, "yes")}>예</button>
                    <button onClick={() => resolveQuestion(entry.id, "no")}>아니오</button>
                    <button onClick={() => resolveQuestion(entry.id, "irrelevant")}>중요X</button>
                    <button className="ghost-btn" onClick={() => resolveQuestion(entry.id, "pass")}>
                      패스
                    </button>
                  </div>
                ) : (
                  <div className="btn-row wrap">
                    <button className="success-btn" onClick={() => resolveAnswer(entry.id, true)}>
                      정답
                    </button>
                    <button className="danger-btn" onClick={() => resolveAnswer(entry.id, false)}>
                      오답
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
