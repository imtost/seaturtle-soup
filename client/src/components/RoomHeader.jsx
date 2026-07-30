import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "../RoomContext.jsx";

export default function RoomHeader() {
  const navigate = useNavigate();
  const { roomId, role, leaveRoom } = useRoom();
  const [copied, setCopied] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleCopyLink() {
    const url = `${window.location.origin}/join/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("아래 링크를 복사하세요", url);
    }
  }

  function handleLeaveClick() {
    if (role === "host") {
      setConfirmingLeave(true);
      return;
    }
    doLeave();
  }

  async function doLeave() {
    setLeaving(true);
    await leaveRoom();
    navigate("/");
  }

  return (
    <>
      <div className="room-header">
        <span className="room-code">
          방 코드: <strong>{roomId}</strong>
        </span>
        <div className="room-header-actions">
          {role === "host" && (
            <button type="button" className="ghost-btn small" onClick={handleCopyLink}>
              {copied ? "복사됨!" : "초대 링크 복사"}
            </button>
          )}
          <button type="button" className="ghost-btn small" onClick={handleLeaveClick}>
            방 나가기
          </button>
        </div>
      </div>

      {confirmingLeave && (
        <div className="modal-overlay">
          <div className="modal-card narrow">
            <h3>방을 나가시겠습니까?</h3>
            <p>사회자가 나가면 모든 참여자가 함께 퇴장되고 방이 종료됩니다.</p>
            <div className="btn-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirmingLeave(false)}
                disabled={leaving}
              >
                취소
              </button>
              <button type="button" className="danger-btn" onClick={doLeave} disabled={leaving}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
