import { useEffect, useRef, useState } from "react";
import { useRoom } from "../RoomContext.jsx";
import { formatTime } from "../formatTime.js";
import SubmissionInput from "./SubmissionInput.jsx";

const RESULT_LABEL = { yes: "예", no: "아니오", irrelevant: "중요X" };

export default function ChatBox({ messages }) {
  const {
    room,
    incorrectNotice,
    clearIncorrectNotice,
    questionResolvedNotice,
    clearQuestionResolvedNotice,
  } = useRoom();
  const [systemNotices, setSystemNotices] = useState([]);
  const listRef = useRef(null);
  const noticeIdRef = useRef(0);

  // Wrong-answer / question-resolved notices are only ever sent to the
  // submitter's own socket, so folding them into local-only chat entries
  // keeps them private to them.
  useEffect(() => {
    if (!incorrectNotice) return;
    noticeIdRef.current += 1;
    setSystemNotices((prev) => [
      ...prev,
      {
        id: `sys-${noticeIdRef.current}`,
        text: `❌ 오답입니다: ${incorrectNotice.content}`,
        timestamp: Date.now(),
        system: true,
      },
    ]);
    clearIncorrectNotice();
  }, [incorrectNotice, clearIncorrectNotice]);

  useEffect(() => {
    if (!questionResolvedNotice) return;
    noticeIdRef.current += 1;
    const { content, result } = questionResolvedNotice;
    const text =
      result === "pass"
        ? `❔ 질문: ${content} → 사회자가 패스했습니다`
        : `❔ 질문: ${content} → 답변: ${RESULT_LABEL[result] ?? result}`;
    setSystemNotices((prev) => [
      ...prev,
      {
        id: `sys-${noticeIdRef.current}`,
        text,
        timestamp: Date.now(),
        system: true,
      },
    ]);
    clearQuestionResolvedNotice();
  }, [questionResolvedNotice, clearQuestionResolvedNotice]);

  const combined = [...messages, ...systemNotices].sort((a, b) => a.timestamp - b.timestamp);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [combined.length]);

  return (
    <section className="panel chat-panel">
      <h3>채팅</h3>
      <div className="chat-messages" ref={listRef}>
        {combined.length === 0 ? (
          <p className="empty-text">아직 채팅이 없습니다.</p>
        ) : (
          combined.map((m) =>
            m.system ? (
              <div key={m.id} className="chat-message system">
                <span className="chat-content">{m.text}</span>
                <span className="item-time">{formatTime(m.timestamp)}</span>
              </div>
            ) : (
              <div key={m.id} className="chat-message">
                <span className="chat-nickname">{m.nickname}</span>
                <span className="chat-content">{m.content}</span>
                <span className="item-time">{formatTime(m.timestamp)}</span>
              </div>
            )
          )
        )}
      </div>
      {(room?.status === "playing" || room?.status === "ended") && <SubmissionInput />}
    </section>
  );
}
