import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { submitLead } from "../lib/leads";

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  isError?: boolean;
}

interface ApiResponse {
  basari?: boolean;
  cevap?: string;
  hata?: string;
}

type LeadStatus = "idle" | "submitting" | "success" | "error";

interface LeadFormData {
  name: string;
  phone: string;
  brief: string;
}

interface AsgardianChatProps {
  locale?: "en" | "tr";
  emblemUrl?: string;
}

const MAX_MESSAGE_LENGTH = 2000;
const WELCOME_MESSAGE_ID = "asgardian-welcome";
const COPY = {
  en: {
    welcome: "I’m ASGARDIAN, AESIR AXIOM’s engineering intelligence assistant. What system, technology, or engineering challenge can I help you explore?",
    suggestions: ["Explore our capabilities", "Discuss an engineering challenge", "Start an AI systems project"],
    unreachable: "ASGARDIAN could not reach the intelligence service.",
    unavailable: "ASGARDIAN is temporarily unavailable.",
    required: "Name and phone number are required.",
    consentRequired: "Please confirm that AESIR AXIOM may use these details for follow-up.",
    followUpError: "Your follow-up request could not be sent.",
    visitor: "VISITOR",
    projectBriefMeta: "Project brief",
    conversationMeta: "Conversation context",
    followUpMeta: "ASGARDIAN ENGINEERING FOLLOW-UP",
    dialogLabel: "ASGARDIAN AI assistant",
    online: "Engineering intelligence online",
    close: "Close ASGARDIAN",
    you: "YOU",
    suggestionsLabel: "Suggested questions",
    thinking: "ASGARDIAN is processing",
    requestFollowUp: "Request engineering follow-up",
    received: "REQUEST / RECEIVED",
    receivedDescription: "Your details are now available to the AESIR AXIOM engineering team.",
    leadIntro: "Leave a direct channel for an engineering follow-up.",
    name: "Name",
    phone: "Phone",
    projectBrief: "Project brief",
    optional: "optional",
    consent: "I agree that my contact details and this conversation context may be used for AESIR AXIOM follow-up.",
    routing: "Routing request…",
    route: "Route to engineering",
    messageLabel: "Message ASGARDIAN",
    placeholder: "Describe your objective or technical challenge…",
    sendLabel: "Send message",
    send: "Send",
    note: "AI-generated guidance. Validate safety-critical engineering decisions.",
    open: "Open ASGARDIAN AI assistant",
  },
  tr: {
    welcome: "Ben ASGARDIAN, AESIR AXIOM’un mühendislik zekâsı asistanıyım. Hangi sistemi, teknolojiyi veya mühendislik problemini birlikte değerlendirebiliriz?",
    suggestions: ["Yetkinliklerimizi keşfet", "Bir mühendislik problemini görüş", "Yapay zekâ sistemi projesi başlat"],
    unreachable: "ASGARDIAN mühendislik zekâsı hizmetine ulaşamadı.",
    unavailable: "ASGARDIAN geçici olarak kullanılamıyor.",
    required: "Ad ve telefon numarası zorunludur.",
    consentRequired: "AESIR AXIOM’un takip amacıyla bu bilgileri kullanmasına izin verdiğinizi onaylayın.",
    followUpError: "Takip talebiniz gönderilemedi.",
    visitor: "ZİYARETÇİ",
    projectBriefMeta: "Proje özeti",
    conversationMeta: "Görüşme bağlamı",
    followUpMeta: "ASGARDIAN MÜHENDİSLİK TAKİP TALEBİ",
    dialogLabel: "ASGARDIAN yapay zekâ asistanı",
    online: "Mühendislik zekâsı çevrimiçi",
    close: "ASGARDIAN’ı kapat",
    you: "SİZ",
    suggestionsLabel: "Önerilen sorular",
    thinking: "ASGARDIAN değerlendiriyor",
    requestFollowUp: "Mühendislik ekibinden dönüş isteyin",
    received: "TALEP / ALINDI",
    receivedDescription: "Bilgileriniz AESIR AXIOM mühendislik ekibine ulaştırıldı.",
    leadIntro: "Mühendislik ekibimizin size ulaşabilmesi için doğrudan bir iletişim kanalı bırakın.",
    name: "Ad Soyad",
    phone: "Telefon",
    projectBrief: "Proje özeti",
    optional: "isteğe bağlı",
    consent: "İletişim bilgilerimin ve bu görüşmenin bağlamının AESIR AXIOM’un takip sürecinde kullanılmasını kabul ediyorum.",
    routing: "Talep yönlendiriliyor…",
    route: "Mühendislik ekibine ilet",
    messageLabel: "ASGARDIAN’a mesaj",
    placeholder: "Hedefinizi veya teknik probleminizi açıklayın…",
    sendLabel: "Mesaj gönder",
    send: "Gönder",
    note: "Yapay zekâ destekli yönlendirme. Güvenlik açısından kritik mühendislik kararlarını ayrıca doğrulayın.",
    open: "ASGARDIAN yapay zekâ asistanını aç",
  },
} as const;

function createId(role: MessageRole) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AsgardianChat({ locale = "en", emblemUrl = "/assets/aesir-axiom-emblem.png" }: AsgardianChatProps) {
  const copy = COPY[locale];
  const welcomeMessage: ChatMessage = {
    id: WELCOME_MESSAGE_ID,
    role: "assistant",
    content: copy.welcome,
  };
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadFormData>({
    name: "",
    phone: "",
    brief: "",
  });
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("idle");
  const [leadError, setLeadError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const leadNameRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeLocaleRef = useRef(locale);

  useEffect(() => {
    if (activeLocaleRef.current === locale) return;
    activeLocaleRef.current = locale;
    setMessages([{ id: WELCOME_MESSAGE_ID, role: "assistant", content: copy.welcome }]);
    setInput("");
    setIsLeadFormOpen(false);
    setLeadStatus("idle");
    setLeadError("");
  }, [copy.welcome, locale]);

  useEffect(() => {
    if (!isOpen || isLeadFormOpen) return;
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [isLeadFormOpen, isOpen]);

  useEffect(() => {
    if (!isOpen || !isLeadFormOpen || leadStatus === "success") return;
    window.setTimeout(() => leadNameRef.current?.focus(), 120);
  }, [isLeadFormOpen, isOpen, leadStatus]);

  useEffect(() => {
    if (!isOpen) return;
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isLeadFormOpen, isOpen, isSending, leadStatus, messages]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    const history = messages
      .filter((item) => item.id !== WELCOME_MESSAGE_ID && !item.isError)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/asgardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaj: message, gecmis: history, dil: locale }),
      });
      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !data.basari || !data.cevap) {
        throw new Error(
          data.hata || copy.unreachable,
        );
      }

      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          content: data.cevap as string,
        },
      ]);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : copy.unavailable;
      setMessages((current) => [
        ...current,
        {
          id: createId("assistant"),
          role: "assistant",
          content: detail,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const updateLeadField = (field: keyof LeadFormData, value: string) => {
    setLeadForm((current) => ({ ...current, [field]: value }));
    if (leadStatus === "error") setLeadStatus("idle");
    setLeadError("");
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = leadForm.name.trim();
    const phone = leadForm.phone.trim();

    if (!name || !phone) {
      setLeadError(copy.required);
      setLeadStatus("error");
      return;
    }
    if (!leadConsent) {
      setLeadError(copy.consentRequired);
      setLeadStatus("error");
      return;
    }

    const context = messages
      .filter((message) => message.id !== WELCOME_MESSAGE_ID && !message.isError)
      .slice(-8)
      .map((message) =>
        `${message.role === "user" ? copy.visitor : "ASGARDIAN"}: ${message.content}`,
      )
      .join("\n");
    const brief = leadForm.brief.trim();

    setLeadStatus("submitting");
    setLeadError("");
    try {
      await submitLead({
        isim: name,
        telefon: phone,
        kaynak: "asgardian",
        mesaj: [
          copy.followUpMeta,
          brief ? `${copy.projectBriefMeta}: ${brief}` : "",
          context ? `${copy.conversationMeta}:\n${context}` : "",
        ].filter(Boolean).join("\n\n"),
        dil: locale,
      });
      setLeadStatus("success");
      setLeadForm({ name: "", phone: "", brief: "" });
      setLeadConsent(false);
    } catch (error) {
      setLeadError(
        error instanceof Error
          ? error.message
          : copy.followUpError,
      );
      setLeadStatus("error");
    }
  };

  return (
    <div className={`asgardian${isOpen ? " is-open" : ""}`}>
      <section
        id="asgardian-panel"
        className="asgardian-panel"
        role="dialog"
        aria-label={copy.dialogLabel}
        aria-hidden={!isOpen}
      >
        <header className="asgardian-header">
          <div className="asgardian-identity">
            <img
              src={emblemUrl}
              alt=""
              width="42"
              height="42"
            />
            <div>
              <p>ASGARDIAN</p>
              <span><i aria-hidden="true"></i> {copy.online}</span>
            </div>
          </div>
          <button
            className="asgardian-close"
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={copy.close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="asgardian-axis" aria-hidden="true">
          <span>AX / INTELLIGENCE CHANNEL</span>
          <span>SYS–01</span>
        </div>

        <div
          className="asgardian-transcript"
          ref={transcriptRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message) => (
            <article
              key={message.id}
              className={`asgardian-message is-${message.role}${
                message.isError ? " is-error" : ""
              }`}
            >
              <span>{message.role === "assistant" ? "ASGARDIAN" : copy.you}</span>
              <p>{message.content}</p>
            </article>
          ))}

          {messages.length === 1 && (
            <div className="asgardian-suggestions" aria-label={copy.suggestionsLabel}>
              {copy.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}<span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}

          {isSending && (
            <div className="asgardian-thinking" role="status">
              <span></span><span></span><span></span>
              <b>{copy.thinking}</b>
            </div>
          )}

          <div className={`asgardian-handoff${isLeadFormOpen ? " is-open" : ""}`}>
            <button
              className="asgardian-handoff-toggle"
              type="button"
              aria-expanded={isLeadFormOpen}
              aria-controls="asgardian-lead-form"
              onClick={() => {
                setIsLeadFormOpen((current) => !current);
                setLeadError("");
                if (leadStatus === "success") setLeadStatus("idle");
              }}
            >
              <span>{copy.requestFollowUp}</span>
              <i aria-hidden="true">{isLeadFormOpen ? "−" : "+"}</i>
            </button>

            {isLeadFormOpen && (
              leadStatus === "success" ? (
                <div className="asgardian-lead-success" role="status" aria-live="polite">
                  <span>{copy.received}</span>
                  <p>{copy.receivedDescription}</p>
                </div>
              ) : (
                <form
                  id="asgardian-lead-form"
                  className="asgardian-lead-form"
                  onSubmit={handleLeadSubmit}
                  aria-busy={leadStatus === "submitting"}
                  noValidate
                >
                  <p>{copy.leadIntro}</p>
                  {leadError && <p className="asgardian-lead-error" role="alert">{leadError}</p>}
                  <label htmlFor="asgardian-lead-name">{copy.name}</label>
                  <input
                    ref={leadNameRef}
                    id="asgardian-lead-name"
                    type="text"
                    autoComplete="name"
                    value={leadForm.name}
                    onChange={(event) => updateLeadField("name", event.target.value)}
                    disabled={leadStatus === "submitting"}
                    maxLength={120}
                    required
                  />
                  <label htmlFor="asgardian-lead-phone">{copy.phone}</label>
                  <input
                    id="asgardian-lead-phone"
                    type="tel"
                    autoComplete="tel"
                    value={leadForm.phone}
                    onChange={(event) => updateLeadField("phone", event.target.value)}
                    disabled={leadStatus === "submitting"}
                    maxLength={40}
                    required
                  />
                  <label htmlFor="asgardian-lead-brief">{copy.projectBrief} <span>({copy.optional})</span></label>
                  <textarea
                    id="asgardian-lead-brief"
                    value={leadForm.brief}
                    onChange={(event) => updateLeadField("brief", event.target.value)}
                    disabled={leadStatus === "submitting"}
                    maxLength={1200}
                    rows={3}
                  />
                  <label className="asgardian-consent">
                    <input
                      type="checkbox"
                      checked={leadConsent}
                      onChange={(event) => {
                        setLeadConsent(event.target.checked);
                        setLeadError("");
                        if (leadStatus === "error") setLeadStatus("idle");
                      }}
                      disabled={leadStatus === "submitting"}
                    />
                    <span>{copy.consent}</span>
                  </label>
                  <button type="submit" disabled={leadStatus === "submitting"}>
                    {leadStatus === "submitting" ? copy.routing : copy.route}
                  </button>
                </form>
              )
            )}
          </div>
        </div>

        <form className="asgardian-compose" onSubmit={handleSubmit}>
          <label htmlFor="asgardian-message" className="sr-only">
            {copy.messageLabel}
          </label>
          <textarea
            id="asgardian-message"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={copy.placeholder}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            aria-label={copy.sendLabel}
          >
            <span>{copy.send}</span><i aria-hidden="true">↗</i>
          </button>
        </form>
        <p className="asgardian-note">
          {copy.note}
        </p>
      </section>

      <button
        className="asgardian-launcher"
        type="button"
        aria-expanded={isOpen}
        aria-controls="asgardian-panel"
        aria-label={isOpen ? copy.close : copy.open}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="asgardian-launcher-ring" aria-hidden="true"></span>
        <img
          src={emblemUrl}
          alt=""
          width="52"
          height="52"
        />
        <span className="asgardian-launcher-status" aria-hidden="true"></span>
        <span className="asgardian-launcher-label">ASGARDIAN</span>
      </button>
    </div>
  );
}
