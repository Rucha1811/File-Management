export function SessionTimeoutDialog({ countdown, onExtend }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 28, maxWidth: 400, width: "90%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)", textAlign: "center"
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⏰</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0b3d91", marginBottom: 8 }}>
          Session Expiring
        </div>
        <div style={{ fontSize: 14, color: "#666", lineHeight: 1.5, marginBottom: 12 }}>
          You've been inactive for a while. For security, you'll be logged out in:
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#c62828", marginBottom: 16 }}>
          {countdown}s
        </div>
        <button
          onClick={onExtend}
          style={{
            padding: "10px 28px", border: "none", borderRadius: 6,
            background: "#0b3d91", color: "#fff", fontSize: 15,
            fontWeight: 600, cursor: "pointer"
          }}
        >
          Stay Logged In
        </button>
      </div>
    </div>
  );
}
