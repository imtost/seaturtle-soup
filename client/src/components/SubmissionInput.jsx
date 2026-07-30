import { useEffect, useState } from "react";
import { useRoom } from "../RoomContext.jsx";

const BASE_TYPE_LABEL = { chat: "채팅", question: "질문", answer: "정답" };
const HOST_TYPE_LABEL = { ...BASE_TYPE_LABEL, hint: "힌트" };

export default function SubmissionInput() {
  const { room, role, sendSubmission, addHint, myPendingByType, lastError, clearError } =
    useRoom();
  const chatOnly = room?.status === "ended";
  const isHost = role === "host";
  const typeLabel = isHost ? HOST_TYPE_LABEL : BASE_TYPE_LABEL;
  const [type, setType] = useState("chat");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (chatOnly) setType("chat");
  }, [chatOnly]);

  const isBlocked =
    (type === "question" || type === "answer") && !!myPendingByType[type];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || isBlocked) return;
    setSending(true);
    clearError();
    const res =
      type === "hint" ? await addHint(content.trim()) : await sendSubmission(type, content.trim());
    setSending(false);
    if (res.ok) setContent("");
  }

  return (
    <div className="submission-input">
      {!chatOnly && (
        <div className="type-tabs">
          {Object.entries(typeLabel).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={type === value ? "type-tab active" : "type-tab"}
              onClick={() => setType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {chatOnly && (
        <p className="hint-text">게임이 종료되었습니다. 다음 라운드가 시작될 때까지 채팅으로 대화할 수 있어요.</p>
      )}

      {isBlocked && (
        <p className="hint-text">
          이전에 보낸 {typeLabel[type]}에 대한 사회자의 답변을 기다리는 중입니다.
        </p>
      )}
      {lastError && <p className="error-text">{lastError}</p>}

      <form onSubmit={handleSubmit} className="submission-form">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "chat"
              ? "채팅 메시지를 입력하세요"
              : type === "question"
              ? "예/아니오로 답할 수 있는 질문을 입력하세요"
              : type === "answer"
              ? "정답을 입력하세요"
              : "힌트를 입력하세요"
          }
          maxLength={300}
        />
        <button type="submit" disabled={sending || !content.trim() || isBlocked}>
          {type === "hint" ? "힌트 추가" : `${typeLabel[type]} 보내기`}
        </button>
      </form>
    </div>
  );
}
