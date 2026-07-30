import { useRoom } from "../RoomContext.jsx";

export default function ToastContainer() {
  const { toasts, dismissToast } = useRoom();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast" onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
