import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../RoomContext.jsx";
import HostSetup from "./HostSetup.jsx";
import ProblemPanel from "../components/ProblemPanel.jsx";
import QuestionList from "../components/QuestionList.jsx";
import HintList from "../components/HintList.jsx";
import ChatBox from "../components/ChatBox.jsx";
import HostPendingQueue from "../components/HostPendingQueue.jsx";
import GameEndModal from "../components/GameEndModal.jsx";
import ParticipantList from "../components/ParticipantList.jsx";
import RoomHeader from "../components/RoomHeader.jsx";
import RestartPanel from "../components/RestartPanel.jsx";
import StatsPanel from "../components/StatsPanel.jsx";

export default function GameRoom() {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const { roomId, role, room, closedNotice, kickedNotice, isRejoining } = useRoom();
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    if (isRejoining || kickedNotice) return;
    if (!roomId || roomId !== urlRoomId) {
      navigate("/", { replace: true });
    }
  }, [roomId, urlRoomId, navigate, kickedNotice, isRejoining]);

  useEffect(() => {
    if (room?.status === "ended") setModalDismissed(false);
  }, [room?.status, room?.result?.winnerId]);

  if (isRejoining) {
    return (
      <div className="page centered">
        <p>이전 세션을 확인하는 중...</p>
      </div>
    );
  }

  if (kickedNotice) {
    return (
      <div className="page centered">
        <div className="card">
          <h2>강퇴되었습니다</h2>
          <p>{kickedNotice.reason}</p>
          <button className="primary-btn" onClick={() => navigate("/")}>
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (closedNotice) {
    return (
      <div className="page centered">
        <div className="card">
          <h2>방이 종료되었습니다</h2>
          <p>{closedNotice.reason}</p>
          <button className="primary-btn" onClick={() => navigate("/")}>
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page centered">
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (room.status === "waiting") {
    if (role === "host") return <HostSetup />;
    return (
      <div className="page centered">
        <div className="card">
          <RoomHeader />
          <h2>대기 중</h2>
          <p>사회자가 문제를 작성하고 있습니다. 잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  const isHost = role === "host";

  return (
    <div className="page game-layout-wrap">
      <RoomHeader />
      <div className="game-layout">
        <div className="game-main">
          <ProblemPanel problem={room.problem} status={room.status} />
          {isHost && room.status === "ended" && <RestartPanel />}
          <QuestionList questions={room.questions} />
          <HintList hints={room.hints} />
        </div>
        <div className="game-side">
          <StatsPanel />
          <ParticipantList />
          {isHost && <HostPendingQueue />}
          <ChatBox messages={room.chatMessages} />
        </div>
      </div>
      {room.status === "ended" && room.result && !modalDismissed && (
        <GameEndModal result={room.result} onClose={() => setModalDismissed(true)} />
      )}
    </div>
  );
}
