import { Routes, Route } from "react-router-dom";
import { RoomProvider } from "./RoomContext.jsx";
import Home from "./pages/Home.jsx";
import GameRoom from "./pages/GameRoom.jsx";
import ToastContainer from "./components/ToastContainer.jsx";

export default function App() {
  return (
    <RoomProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:roomCode" element={<Home />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
      </Routes>
      <ToastContainer />
    </RoomProvider>
  );
}
