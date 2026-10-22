/* ── API layer ───────────────────────────────────────────── */

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface SendMessageResponse {
  reply: string;
  humanHandoff: boolean;
  latencyMs: number;
}

export async function sendMessage(
  conversationId: string,
  message: string,
): Promise<SendMessageResponse> {
  const res = await fetch(`${API_BASE}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, message }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<SendMessageResponse>;
}

/* ── Types ───────────────────────────────────────────────── */

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  time: Date;
}

/* ── URL params ──────────────────────────────────────────── */

function getParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

/* ── SVG icons ───────────────────────────────────────────── */

const BOT_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2M7.5 14a1.5 1.5 0 0 0-1.5 1.5A1.5 1.5 0 0 0 7.5 17 1.5 1.5 0 0 0 9 15.5 1.5 1.5 0 0 0 7.5 14m9 0a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5A1.5 1.5 0 0 0 16.5 14M3 20a1 1 0 0 0-1 1v1h20v-1a1 1 0 0 0-1-1z"/>
</svg>`;

const SEND_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
</svg>`;

const WARN_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#fca5a5" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2 1 21h22L12 2zm0 3.5 8.5 15.5H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
</svg>`;

/* ── Helpers ─────────────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ── Chat UI ─────────────────────────────────────────────── */

class ChatWidget {
  private conversationId: string;
  private messages: Message[] = [];
  private isTyping = false;
  private isHandedOff = false;

  // DOM refs
  private root: HTMLElement;
  private messagesEl: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private errorBanner: HTMLElement;
  private handoffNotice: HTMLElement;
  private loadingOverlay: HTMLElement;
  private emptyState: HTMLElement | null = null;

  constructor(root: HTMLElement, conversationId: string, contractorName: string) {
    this.root = root;
    this.conversationId = conversationId;
    this.render(contractorName);

    this.messagesEl   = this.root.querySelector("#chat-messages")!;
    this.inputEl      = this.root.querySelector("#chat-input")!;
    this.sendBtn      = this.root.querySelector("#send-btn")!;
    this.errorBanner  = this.root.querySelector("#error-banner")!;
    this.handoffNotice = this.root.querySelector("#handoff-notice")!;
    this.loadingOverlay = this.root.querySelector("#loading-overlay")!;
    this.emptyState   = this.root.querySelector("#empty-state");

    this.bindEvents();
    this.hideLoading();
  }

  /* ── Render skeleton ── */
  private render(contractorName: string): void {
    this.root.innerHTML = `
      <!-- Loading overlay -->
      <div id="loading-overlay">
        <div class="spinner"></div>
        <span class="loading-text">Connecting…</span>
      </div>

      <!-- Header -->
      <header id="chat-header">
        <div class="header-avatar">${BOT_SVG}</div>
        <div class="header-info">
          <div class="header-name" id="contractor-name">${escapeHtml(contractorName || "Booking Assistant")}</div>
          <div class="header-status">
            <span class="status-dot"></span>
            <span>Online — AI Agent</span>
          </div>
        </div>
      </header>

      <!-- Messages -->
      <div id="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        <div id="empty-state">
          <div class="empty-icon">${BOT_SVG}</div>
          <h2>Hi there! 👋</h2>
          <p>I can help you view services, check availability, and manage bookings.</p>
          <div class="suggestions">
            <button class="suggestion-btn" data-msg="What services do you offer?">📋 What services do you offer?</button>
            <button class="suggestion-btn" data-msg="I'd like to make a booking">📅 I'd like to make a booking</button>
            <button class="suggestion-btn" data-msg="I need to cancel my booking">❌ I need to cancel my booking</button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div id="error-banner" role="alert">
        ${WARN_SVG}
        <span id="error-text">Something went wrong. Please try again.</span>
      </div>

      <!-- Handoff -->
      <div id="handoff-notice" role="status">
        🧑‍💼 A human agent will be with you shortly.
      </div>

      <!-- Input -->
      <form id="chat-form" autocomplete="off" novalidate>
        <textarea
          id="chat-input"
          placeholder="Type a message…"
          rows="1"
          maxlength="2000"
          aria-label="Message input"
          autocomplete="off"
        ></textarea>
        <button id="send-btn" type="submit" aria-label="Send message" disabled>
          ${SEND_SVG}
        </button>
      </form>
    `;
  }

  /* ── Events ── */
  private bindEvents(): void {
    const form = this.root.querySelector("#chat-form")!;
    form.addEventListener("submit", (e) => { e.preventDefault(); void this.handleSend(); });

    this.inputEl.addEventListener("input", () => {
      this.autoResize();
      this.sendBtn.disabled = !this.inputEl.value.trim() || this.isTyping || this.isHandedOff;
    });

    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!this.sendBtn.disabled) void this.handleSend();
      }
    });

    // Suggestion buttons (event delegation)
    this.messagesEl.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".suggestion-btn");
      if (btn?.dataset["msg"]) {
        this.inputEl.value = btn.dataset["msg"];
        this.sendBtn.disabled = false;
        void this.handleSend();
      }
    });
  }

  private autoResize(): void {
    this.inputEl.style.height = "auto";
    this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 120)}px`;
  }

  /* ── Send flow ── */
  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.isTyping || this.isHandedOff) return;

    this.hideError();
    this.removeEmptyState();
    this.appendMessage({ id: uid(), role: "user", content: text, time: new Date() });

    this.inputEl.value = "";
    this.inputEl.style.height = "auto";
    this.sendBtn.disabled = true;
    this.setTyping(true);

    try {
      const res = await sendMessage(this.conversationId, text);
      this.setTyping(false);
      this.appendMessage({ id: uid(), role: "assistant", content: res.reply, time: new Date() });

      if (res.humanHandoff) {
        this.triggerHandoff();
      }
    } catch (err) {
      this.setTyping(false);
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      this.showError(msg);
    }
  }

  /* ── DOM mutations ── */
  private appendMessage(msg: Message): void {
    this.messages.push(msg);

    const row = document.createElement("div");
    row.className = `msg-row ${msg.role}`;
    row.dataset["id"] = msg.id;

    row.innerHTML = `
      <div class="bubble">${escapeHtml(msg.content).replace(/\n/g, "<br>")}</div>
      <time class="msg-time" datetime="${msg.time.toISOString()}">${formatTime(msg.time)}</time>
    `;

    this.messagesEl.appendChild(row);
    this.scrollToBottom();
  }

  private setTyping(active: boolean): void {
    this.isTyping = active;
    const existing = this.messagesEl.querySelector("#typing-indicator");

    if (active && !existing) {
      const row = document.createElement("div");
      row.id = "typing-indicator";
      row.className = "msg-row assistant";
      row.innerHTML = `
        <div class="bubble typing-bubble">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      `;
      this.messagesEl.appendChild(row);
      this.scrollToBottom();
    } else if (!active && existing) {
      existing.remove();
    }
  }

  private removeEmptyState(): void {
    if (this.emptyState) {
      this.emptyState.remove();
      this.emptyState = null;
    }
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private showError(msg: string): void {
    const textEl = this.root.querySelector("#error-text");
    if (textEl) textEl.textContent = msg;
    this.errorBanner.classList.add("visible");
  }

  private hideError(): void {
    this.errorBanner.classList.remove("visible");
  }

  private triggerHandoff(): void {
    this.isHandedOff = true;
    this.handoffNotice.classList.add("visible");
    this.inputEl.disabled = true;
    this.inputEl.placeholder = "Waiting for a human agent…";
    this.sendBtn.disabled = true;
  }

  private hideLoading(): void {
    // Small delay so the overlay feels intentional
    setTimeout(() => {
      this.loadingOverlay.classList.add("hidden");
    }, 400);
  }
}

/* ── Bootstrap ───────────────────────────────────────────── */

function bootstrap(): void {
  const root = document.getElementById("chat-root");
  if (!root) return;

  const conversationId  = getParam("conversationId") ?? "";
  const contractorName  = getParam("contractorName") ?? "Booking Assistant";

  if (!conversationId) {
    root.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100%;gap:12px;font-family:Inter,system-ui,sans-serif;color:#94a3b8;
        background:#0b0d14;font-size:13px;text-align:center;padding:24px;
      ">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#6366f1"><path d="M12 2 1 21h22L12 2zm0 3.5 8.5 15.5H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
        <strong style="color:#f1f5f9">Missing <code>conversationId</code></strong>
        <p>Embed this widget with:<br><code>?conversationId=&lt;uuid&gt;&amp;contractorName=Acme</code></p>
      </div>`;
    return;
  }

  new ChatWidget(root, conversationId, contractorName);
}

bootstrap();
