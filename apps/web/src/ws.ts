export interface WireEvent {
  type: string;
  session_id?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

type Handler = (event: WireEvent) => void;
type StatusHandler = (status: 'connecting' | 'open' | 'closed') => void;

export class Socket {
  private ws: WebSocket | undefined;
  private sessionId: string | undefined;
  private retryTimer: number | undefined;
  private disposed = false;

  constructor(
    private readonly token: string,
    private readonly onEvent: Handler,
    private readonly onStatus: StatusHandler,
  ) {}

  connect(): void {
    if (this.disposed) return;
    this.onStatus('connecting');
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${scheme}://${location.host}/api/v1/ws`, [
      `nighthawk.bearer.${this.token}`,
    ]);
    this.ws = ws;

    ws.onopen = () => {
      this.onStatus('open');
      if (this.sessionId !== undefined) this.sendSubscribe(this.sessionId);
    };
    ws.onmessage = (message) => {
      let event: WireEvent;
      try {
        event = JSON.parse(String(message.data)) as WireEvent;
      } catch {
        return;
      }
      if (event.type === 'ping') {
        const nonce = event.payload?.['nonce'];
        ws.send(JSON.stringify({ type: 'pong', payload: { nonce } }));
        return;
      }
      this.onEvent(event);
    };
    ws.onclose = () => {
      this.onStatus('closed');
      this.ws = undefined;
      if (!this.disposed) {
        this.retryTimer = window.setTimeout(() => this.connect(), 1500);
      }
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  subscribe(sessionId: string): void {
    this.sessionId = sessionId;
    if (this.ws?.readyState === WebSocket.OPEN) this.sendSubscribe(sessionId);
  }

  private sendSubscribe(sessionId: string): void {
    this.ws?.send(
      JSON.stringify({
        type: 'subscribe_v2',
        id: `sub_${sessionId}`,
        payload: { session_id: sessionId, transcript: { '*': 'delta' } },
      }),
    );
  }

  dispose(): void {
    this.disposed = true;
    if (this.retryTimer !== undefined) window.clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = undefined;
  }
}
