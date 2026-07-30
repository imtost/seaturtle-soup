import { useState } from "react";
import { formatTime } from "../formatTime.js";
import { useNow } from "../useNow.js";

const RESULT_LABEL = {
  yes: "예",
  no: "아니오",
  irrelevant: "중요X",
};

const NEW_BADGE_MS = 10000;

export default function QuestionList({ questions }) {
  const [open, setOpen] = useState(true);
  const now = useNow();
  const ordered = [...questions].reverse();

  return (
    <section className="panel">
      <div className="panel-header collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>
          질문 목록 ({questions.length})<span className="chevron">{open ? "▾" : "▸"}</span>
        </h3>
      </div>
      {open &&
        (questions.length === 0 ? (
          <p className="empty-text">아직 등록된 질문이 없습니다.</p>
        ) : (
          <ol className="question-list">
            {ordered.map((q) => (
              <li key={q.id} className={`question-item result-${q.result}`}>
                {now - q.timestamp < NEW_BADGE_MS && <span className="new-badge">NEW</span>}
                <span className="question-nickname">{q.nickname}</span>
                <span className="question-content">{q.content}</span>
                <span className="question-result">{RESULT_LABEL[q.result] ?? q.result}</span>
                <span className="item-time">{formatTime(q.timestamp)}</span>
              </li>
            ))}
          </ol>
        ))}
    </section>
  );
}
