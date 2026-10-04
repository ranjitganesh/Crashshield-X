import { SystemMetrics, ProcessSummaryItem, TemporalResourceGraph, PathAnalysisResult, AdaptiveMonitoringStatus, ResourceSnapshot } from "../types";

export type WebSocketMessageHandler = (data: {
  type: string;
  timestamp: number;
  system_metrics: SystemMetrics;
  processes: ProcessSummaryItem[];
  selected_process?: {
    pid: number;
    graph: TemporalResourceGraph;
    analysis: PathAnalysisResult;
    adaptive: AdaptiveMonitoringStatus;
    history: ResourceSnapshot[];
  };
}) => void;

class RealtimeSocketManager {
  private socket: WebSocket | null = null;
  private handlers: Set<WebSocketMessageHandler> = new Set();
  private reconnectTimer: any = null;
  private currentFocusedPid: number | null = null;

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const host = typeof window !== "undefined" && window.location && window.location.hostname ? window.location.hostname : "127.0.0.1";
      const wsUrl = `ws://${host}:8000/ws`;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`[CrashShield WS] Connected to live telemetry stream at ${wsUrl}`);
        if (this.currentFocusedPid !== null) {
          this.setFocusedPid(this.currentFocusedPid);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlers.forEach((h) => h(data));
        } catch (e) {
          console.error("[CrashShield WS] Parse error:", e);
        }
      };

      this.socket.onclose = () => {
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.scheduleReconnect();
      };
    } catch (e) {
      console.warn("[CrashShield WS] Connection attempt deferred:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  subscribe(handler: WebSocketMessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  setFocusedPid(pid: number) {
    this.currentFocusedPid = pid;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ action: "SELECT_PID", pid }));
      } catch (e) {
        console.warn(e);
      }
    }
  }
}

export const socketManager = new RealtimeSocketManager();
