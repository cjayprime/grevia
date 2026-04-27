import type { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Message({ messages, loading }: Props) {
  return (
    <div className="chat" id="chat">
      {messages.map((msg) => (
        <div key={msg.id} className={`msg ${msg.role === "user" ? "user" : ""}`}>
          <div className={`msg-avatar ${msg.role === "user" ? "user" : "ai"}`}>
            {msg.role === "user" ? "LR" : "G"}
          </div>
          <div className="msg-body">
            <div className="msg-name">
              {msg.role === "user" ? "You" : "Grevia Assistant"}{" "}
              <span className="time">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="msg-text">{msg.content}</div>
          </div>
        </div>
      ))}

      {loading && (
        <div className="msg">
          <div className="msg-avatar ai">G</div>
          <div className="msg-body">
            <div className="msg-name">Grevia Assistant</div>
            <div className="msg-text msg-typing">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
