import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";
import { formatTime } from "../formatTime.js";
import { useNow } from "../useNow.js";

const NEW_BADGE_MS = 10000;

export default function HintList({ hints }) {
  const { role, deleteHint } = useRoom();
  const [open, setOpen] = useState(true);
  const now = useNow();
  if (hints.length === 0) return null;

  const isHost = role === "host";
  const ordered = [...hints].reverse();

  return (
    <section className="panel">
      <div className="panel-header collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>
          힌트 ({hints.length})<span className="chevron">{open ? "▾" : "▸"}</span>
        </h3>
      </div>
      {open && (
        <ol className="hint-list">
          {ordered.map((h) => (
            <li key={h.id}>
              {now - h.timestamp < NEW_BADGE_MS && <span className="new-badge">NEW</span>}
              <span className="hint-content">{h.content}</span>
              <span className="item-time">{formatTime(h.timestamp)}</span>
              {isHost && (
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHint(h.id);
                  }}
                >
                  삭제
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
