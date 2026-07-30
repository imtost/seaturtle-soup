import { useState } from "react";
import { useRoom } from "../RoomContext.jsx";

export default function ParticipantList() {
  const { room, role, kickPlayer } = useRoom();
  const [open, setOpen] = useState(true);
  const isHost = role === "host";
  const players = room?.players ?? [];

  return (
    <section className="panel">
      <div className="panel-header collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>
          참여자 ({players.length})<span className="chevron">{open ? "▾" : "▸"}</span>
        </h3>
      </div>
      {open && (
        <ul className="participant-list">
          {players.map((p) => (
            <li key={p.id} className="participant-item">
              <span className="participant-nickname">
                {p.role === "host" && "👑 "}
                {p.nickname}
              </span>
              {isHost && p.role !== "host" && (
                <button className="ghost-btn small" onClick={() => kickPlayer(p.id)}>
                  강퇴
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
