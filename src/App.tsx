import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { localeList, locales, LocaleCode } from "./locales";
import { Field } from "./locales/types";
import { siteProfile } from "./data/siteProfile";

type Theme = "light" | "dark";
type Sender = "user" | "bot";

type ChatMessage = {
  id: number;
  sender: Sender;
  text: string;
  createdAt: number;
  action?: "project" | "contact" | "resume";
};

const PROFILE = siteProfile;

const SKILLS = [
  { name: "JavaScript", value: 92 },
  { name: "TypeScript", value: 89 },
  { name: "React", value: 95 },
  { name: "Next.js", value: 87 },
  { name: "Node.js", value: 78 },
  { name: "Tailwind CSS", value: 93 },
];

const TOOL_BADGES = [
  "Frontend: React",
  "Frontend: Next.js",
  "Frontend: Tailwind",
  "Backend: Node.js",
  "Backend: Express",
  "Tools: Git",
  "Tools: Docker",
  "Tools: Figma",
];

const initialForm = { name: "", email: "", subject: "", message: "" };
const CHAT_HISTORY_KEY_PREFIX = "chat-history";

const format = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));

function getGreeting(dictionary: (typeof locales)[LocaleCode]) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return dictionary.greetings.morning;
  if (hour >= 12 && hour <= 17) return dictionary.greetings.afternoon;
  if (hour >= 18 && hour <= 21) return dictionary.greetings.evening;
  return dictionary.greetings.night;
}

function validateField(field: Field, value: string, dictionary: (typeof locales)[LocaleCode]) {
  if (!value.trim()) return dictionary.form.errors[field];
  if (field === "name") return value.trim().length >= 2 ? "" : dictionary.form.errors.name;
  if (field === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : dictionary.form.errors.email;
  if (field === "subject") return value.trim().length >= 5 ? "" : dictionary.form.errors.subject;
  return value.trim().length >= 20 ? "" : dictionary.form.errors.message;
}

function createInitialMessage(dictionary: (typeof locales)[LocaleCode]): ChatMessage {
  return {
    id: Date.now(),
    sender: "bot",
    text: format(dictionary.chat.initialMessage, { name: PROFILE.name }),
    createdAt: Date.now(),
  };
}

function formatChatTime(timestamp: number, locale: LocaleCode) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<LocaleCode>("en");
  const dictionary = locales[lang];
  const isRtl = dictionary.dir === "rtl";

  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  const [typedText, setTypedText] = useState(dictionary.roles[0]);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingChar, setTypingChar] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const [statsStarted, setStatsStarted] = useState(false);
  const [skillStarted, setSkillStarted] = useState(false);
  const [statsValues, setStatsValues] = useState([0, 0, 0, 0]);
  const [skillValues, setSkillValues] = useState<number[]>(SKILLS.map(() => 0));

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState<Record<Field, string>>({ name: "", email: "", subject: "", message: "" });
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false, subject: false, message: false });
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [quickVisible, setQuickVisible] = useState(true);
  const [notifyDot, setNotifyDot] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const chatId = useRef(1);
  const chatOpenRef = useRef(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved === "dark" || (!saved && systemDark) ? "dark" : "light";
    setTheme(next);

    const savedLang = localStorage.getItem("lang") as LocaleCode | null;
    setLang(savedLang && locales[savedLang] ? savedLang : "en");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dictionary.dir;
    localStorage.setItem("lang", lang);
    setTypedText("");
    setTypingChar(0);
    setTypingIndex(0);
    setDeleting(false);
    const storageKey = `${CHAT_HISTORY_KEY_PREFIX}-${lang}`;
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Array<Partial<ChatMessage>>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized: ChatMessage[] = parsed.map((item, index) => ({
            id: typeof item.id === "number" ? item.id : Date.now() + index,
            sender: item.sender === "user" ? "user" : "bot",
            text: typeof item.text === "string" ? item.text : "",
            action: item.action,
            createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
          }));
          setChatMessages(normalized);
          chatId.current = Math.max(...normalized.map((item) => item.id), 0) + 1;
        } else {
          const initial = createInitialMessage(dictionary);
          setChatMessages([initial]);
          chatId.current = initial.id + 1;
        }
      } catch {
        const initial = createInitialMessage(dictionary);
        setChatMessages([initial]);
        chatId.current = initial.id + 1;
      }
    } else {
      const initial = createInitialMessage(dictionary);
      setChatMessages([initial]);
      chatId.current = initial.id + 1;
    }
    setQuickVisible(true);
    setUnreadCount(0);
  }, [lang, dictionary]);

  useEffect(() => {
    const storageKey = `${CHAT_HISTORY_KEY_PREFIX}-${lang}`;
    if (chatMessages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(chatMessages));
    }
  }, [chatMessages, lang]);

  useEffect(() => {
    const onScroll = () => {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 50);
        setShowTop(y > 400);
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(scrollable > 0 ? (y / scrollable) * 100 : 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("active")),
      { threshold: 0.15 },
    );
    nodes.forEach((node, index) => {
      (node as HTMLElement).style.transitionDelay = `${index * 0.08}s`;
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [lang]);

  useEffect(() => {
    const section = document.getElementById("about");
    if (!section) return;
    const targets = [PROFILE.years, PROFILE.projects, PROFILE.technologies, PROFILE.commits];
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsStarted) {
          setStatsStarted(true);
          const start = performance.now();
          const duration = 2000;
          const tick = (time: number) => {
            const ratio = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - ratio, 3);
            setStatsValues(targets.map((target) => Math.round(target * eased)));
            if (ratio < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [statsStarted]);

  useEffect(() => {
    const section = document.getElementById("skills");
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !skillStarted) {
          setSkillStarted(true);
          const start = performance.now();
          const duration = 1800;
          const tick = (time: number) => {
            const ratio = Math.min((time - start) / duration, 1);
            setSkillValues(SKILLS.map((item) => Math.round(item.value * ratio)));
            if (ratio < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [skillStarted]);

  useEffect(() => {
    const role = dictionary.roles[typingIndex % dictionary.roles.length];
    const timer = setTimeout(
      () => {
        if (!deleting && typingChar < role.length) {
          const nextChar = typingChar + 1;
          setTypingChar(nextChar);
          setTypedText(role.slice(0, nextChar));
          return;
        }
        if (!deleting && typingChar === role.length) {
          setDeleting(true);
          return;
        }
        if (deleting && typingChar > 0) {
          const nextChar = typingChar - 1;
          setTypingChar(nextChar);
          setTypedText(role.slice(0, nextChar));
          return;
        }
        setDeleting(false);
        setTypingIndex((prev) => (prev + 1) % dictionary.roles.length);
      },
      deleting ? 50 : typingChar === role.length ? 1800 : 80,
    );
    return () => clearTimeout(timer);
  }, [typingChar, typingIndex, deleting, dictionary.roles]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChatOpen(false);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (!chatBodyRef.current) return;
    chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatTyping]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) {
      setUnreadCount(0);
      setNotifyDot(false);
    }
  }, [chatOpen]);

  useEffect(() => {
    const storedOpen = sessionStorage.getItem("chat-open");
    if (storedOpen === "true") {
      setChatOpen(true);
      setNotifyDot(false);
    }
    const manual = sessionStorage.getItem("chat-manual");
    const triggered = sessionStorage.getItem("chat-auto-triggered");
    if (manual || triggered) return;
    const timer = setTimeout(() => {
      setChatOpen(true);
      setNotifyDot(false);
      addBotMessage(format(dictionary.chat.autoMessage, { name: PROFILE.name }), 200);
      sessionStorage.setItem("chat-auto-triggered", "true");
    }, 20000);
    return () => clearTimeout(timer);
  }, [dictionary.chat.autoMessage]);

  const chatResponse = useMemo(
    () => ({
      about: format(dictionary.chat.responses.about, { name: PROFILE.name, jobTitle: PROFILE.jobTitle, years: PROFILE.years }),
      skills: dictionary.chat.responses.skills,
      project: format(dictionary.chat.responses.project, { projectName: PROFILE.projectName }),
      contact: format(dictionary.chat.responses.contact, { name: PROFILE.name, email: `@${PROFILE.telegramId}` }),
      resume: dictionary.chat.responses.resume,
      experience: format(dictionary.chat.responses.experience, { name: PROFILE.name, years: PROFILE.years }),
      available: format(dictionary.chat.responses.available, { name: PROFILE.name }),
    }),
    [dictionary],
  );

  function addUserMessage(text: string) {
    setChatMessages((prev) => [...prev, { id: chatId.current++, sender: "user", text, createdAt: Date.now() }]);
  }

  function addBotMessage(text: string, delay = 500, action?: ChatMessage["action"]) {
    setChatTyping(true);
    setTimeout(() => {
      setChatTyping(false);
      setChatMessages((prev) => [...prev, { id: chatId.current++, sender: "bot", text, action, createdAt: Date.now() }]);
      if (!chatOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
        setNotifyDot(true);
      }
      chatInputRef.current?.focus();
    }, delay);
  }

  function resetChatConversation() {
    const initial = createInitialMessage(dictionary);
    setChatMessages([initial]);
    chatId.current = initial.id + 1;
    setQuickVisible(true);
    setChatInput("");
    setUnreadCount(0);
    sessionStorage.removeItem(`${CHAT_HISTORY_KEY_PREFIX}-${lang}`);
  }

  function resolveBotReply(text: string) {
    const input = text.toLowerCase();
    if (/(hi|hello|hey|سلام|你好|hola|नमस्ते|مرحبا|salom|မင်္ဂလာပါ)/i.test(input)) {
      return { text: format(dictionary.chat.responses.greeting, { name: PROFILE.name }) };
    }
    if (/(who|about|yourself|درباره|关于|sobre|acerca|कौन|تعريف|momba|შესახებ)/i.test(input)) return { text: chatResponse.about };
    if (/(skills|tech|stack|مهارت|技能|habilidades|कौशल|مهارات|ko'nikma|सीप|უნარები)/i.test(input)) return { text: chatResponse.skills };
    if (/(project|github|پروژه|项目|proyecto|प्रोजेक्ट|مشروع|loyiha|ပရောဂျက်|प्रोजेक्ट|პროექტი)/i.test(input)) {
      return { text: chatResponse.project, action: "project" as const };
    }
    if (/(contact|hire|email|تماس|联系|contacto|संपर्क|تواصل|aloqa|ဆက်သွယ်|सम्पर्क|კონტაქტი)/i.test(input)) {
      return { text: chatResponse.contact, action: "contact" as const };
    }
    if (/(resume|cv|download|رزومه|简历|下载|curriculum|डाउनलोड|سيرة|yuklab|ဒေါင်း|डाउनलोड|ჩამოტვირთვა)/i.test(input)) {
      return { text: chatResponse.resume, action: "resume" as const };
    }
    if (/(experience|work|تجربه|经验|experiencia|अनुभव|خبرة|tajriba|အတွေ့အကြုံ|გამოცდილება)/i.test(input)) return { text: chatResponse.experience };
    if (/(available|remote|دسترس|机会|disponible|उपलब्ध|متاح|mavjud|လက်ခံ|ხელმისაწვდომი)/i.test(input)) return { text: chatResponse.available };
    setQuickVisible(true);
    return { text: dictionary.chat.responses.fallback };
  }

  function handleSendChat(message?: string) {
    const text = (message ?? chatInput).trim();
    if (!text || chatTyping) return;
    addUserMessage(text);
    setChatInput("");
    setQuickVisible(false);
    const reply = resolveBotReply(text);
    addBotMessage(reply.text, 450, reply.action);
  }

  function toggleChat() {
    const next = !chatOpen;
    setChatOpen(next);
    setNotifyDot(false);
    sessionStorage.setItem("chat-open", String(next));
    sessionStorage.setItem("chat-manual", "true");
  }

  function onNavClick(id: string) {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setField(field: Field, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value, dictionary) }));
    }
  }

  function blurField(field: Field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, formData[field], dictionary) }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<Field, string> = {
      name: validateField("name", formData.name, dictionary),
      email: validateField("email", formData.email, dictionary),
      subject: validateField("subject", formData.subject, dictionary),
      message: validateField("message", formData.message, dictionary),
    };
    setTouched({ name: true, email: true, subject: true, message: true });
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitState("loading");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      setSubmitState("success");
      setTimeout(() => {
        setFormData(initialForm);
        setTouched({ name: false, email: false, subject: false, message: false });
        setErrors({ name: "", email: "", subject: "", message: "" });
        setSubmitState("idle");
      }, 3000);
    } catch {
      setSubmitState("error");
    }
  }

  async function copyTelegramId() {
    try {
      await navigator.clipboard.writeText(`@${PROFILE.telegramId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        {dictionary.common.skipToMain}
      </a>
      <div className="scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />

      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-row">
          <button className="logo" onClick={() => onNavClick("hero")}>
            {PROFILE.initials}
          </button>
          <div className="nav-actions">
            <select className="lang-switcher" value={lang} onChange={(event) => setLang(event.target.value as LocaleCode)} aria-label="Language switcher">
              {localeList.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <button className="theme-toggle" id="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? dictionary.common.themeLight : dictionary.common.themeDark}
            </button>
            <a className="btn btn-secondary" href="/assets/resume.pdf" download>
              {dictionary.common.downloadCV}
            </a>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section id="hero" className="hero section">
          <div className="container hero-grid">
            <div className="hero-content reveal">
              <p id="greeting" className="hero-greeting">
                {getGreeting(dictionary)}
              </p>
              <h1>
                {dictionary.hero.intro} {PROFILE.name}
              </h1>
              <p className="hero-role">
                <span id="typed-text">{typedText}</span>
                <span className="cursor" aria-hidden="true">
                  |
                </span>
              </p>
              <p className="hero-copy">{PROFILE.tagline}</p>
              <div className="hero-cta">
                <button className="btn btn-primary" onClick={() => onNavClick("project")}>
                  {dictionary.hero.ctaWork}
                </button>
                <button className="btn btn-secondary" onClick={() => onNavClick("contact")}>
                  {dictionary.hero.ctaContact}
                </button>
              </div>
              <div className="social-row">
                <a href={PROFILE.telegramUrl} target="_blank" rel="noopener noreferrer">
                  Telegram
                </a>
              </div>
            </div>
            <div className="hero-visual reveal-scale" aria-hidden="true">
              <div className="initials-badge">{PROFILE.initials}</div>
            </div>
          </div>
          <button className="scroll-indicator" onClick={() => onNavClick("about")} aria-label={dictionary.hero.scrollDown}>
            v
          </button>
        </section>

        <section id="about" className="section about">
          <div className="container">
            <div className="section-heading reveal">
              <h2>{dictionary.about.title}</h2>
              <p>{dictionary.about.subtitle}</p>
            </div>
            <div className="about-grid">
              <article className="about-copy reveal-left">
                {dictionary.about.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
              <div className="stats-grid reveal-right">
                {dictionary.about.statsLabels.map((label, idx) => (
                  <div key={label} className="stat-box hover-lift">
                    <strong>{statsValues[idx]}+</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="skills" className="section skills">
          <div className="container">
            <div className="section-heading reveal">
              <h2>{dictionary.skills.title}</h2>
              <p>{dictionary.skills.subtitle}</p>
            </div>
            <div className="skills-grid">
              <div className="reveal-left">
                {SKILLS.map((skill, index) => (
                  <div key={skill.name} className="skill-row">
                    <div className="skill-top">
                      <span>{skill.name}</span>
                      <span>{skillValues[index]}%</span>
                    </div>
                    <div className="skill-track">
                      <div className={`skill-fill ${skillStarted ? "animate" : ""}`} style={{ width: `${skillStarted ? skill.value : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="badge-grid reveal-right">
                {TOOL_BADGES.map((badge) => (
                  <span key={badge} className="badge hover-glow">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <p className="bridge">{dictionary.skills.bridge}</p>
          </div>
        </section>

        <section id="experience" className="section experience">
          <div className="container">
            <div className="section-heading reveal">
              <h2>{dictionary.experience.title}</h2>
              <p>{dictionary.experience.subtitle}</p>
            </div>
            <div className="timeline">
              {dictionary.experience.items.map((item) => (
                <article key={item.company + item.period} className="timeline-item reveal-left">
                  <span className="timeline-dot" />
                  <div className="timeline-card hover-lift">
                    <p className="period">{item.period}</p>
                    <h3>{item.role}</h3>
                    <p className="company">{item.company}</p>
                    <p className="type">{item.type}</p>
                    <ul>
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <div className="stack-row">
                      {item.stack.map((tech) => (
                        <span key={tech}>{tech}</span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="bridge">{dictionary.experience.bridge}</p>
          </div>
        </section>

        <section id="project" className="section project">
          <div className="container">
            <div className="section-heading reveal">
              <h2>{dictionary.project.title}</h2>
              <p>{dictionary.project.subtitle}</p>
            </div>
            <article className="project-card reveal-scale hover-lift">
              <div>
                <h3>{PROFILE.projectName}</h3>
                <p className="live-badge">{dictionary.project.liveOnGithub}</p>
                <p>{PROFILE.projectDescription}</p>
                <ul className="feature-list">
                  {dictionary.project.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="stack-row">
                  <span>React</span>
                  <span>Node.js</span>
                  <span>PostgreSQL</span>
                </div>
              </div>
              <div className="device-mockup" aria-hidden="true">
                <div className="code-line long" />
                <div className="code-line" />
                <div className="code-line long" />
                <div className="code-line" />
              </div>
              <div className="project-footer">
                <a className="btn btn-primary" href={PROFILE.projectRepo} title={dictionary.project.githubTitle} target="_blank" rel="noopener noreferrer">
                  {dictionary.project.viewGithub}
                </a>
                <a className="btn btn-secondary" href={PROFILE.projectRepo} target="_blank" rel="noopener noreferrer">
                  {dictionary.project.liveDemo}
                </a>
                <div className="github-stats">
                  <span>
                    {dictionary.project.stars}: 124
                  </span>
                  <span>
                    {dictionary.project.forks}: 32
                  </span>
                  <span>
                    {dictionary.project.language}: TypeScript
                  </span>
                </div>
              </div>
            </article>
            <p className="bridge">{dictionary.project.bridge}</p>
          </div>
        </section>

        <section id="contact" className="section contact">
          <div className="container">
            <div className="section-heading reveal">
              <h2>{dictionary.contact.title}</h2>
              <p>{dictionary.contact.subtitle}</p>
            </div>
            <div className="contact-grid">
              <article className="reveal-left contact-info">
                <p>
                  <strong>Telegram:</strong> <span className="ltr-content">@{PROFILE.telegramId}</span>
                  <button className="copy-btn" onClick={copyTelegramId}>
                    {copied ? dictionary.contact.copied : dictionary.contact.copy}
                  </button>
                </p>
                <p>
                  <strong>{dictionary.contact.location}:</strong> {PROFILE.location}
                </p>
                <p className="availability">{dictionary.contact.availability}</p>
                <small>{dictionary.contact.responseTime}</small>
              </article>

              <form className="reveal-right contact-form" onSubmit={submitForm}>
                {/* action="https://formspree.io/f/YOUR_ID" */}
                {([
                  ["name", dictionary.form.name],
                  ["email", dictionary.form.email],
                  ["subject", dictionary.form.subject],
                  ["message", dictionary.form.message],
                ] as Array<[Field, string]>).map(([field, label]) => (
                  <label key={field} className={`field ${errors[field] ? "error" : ""} ${touched[field] && !errors[field] ? "success" : ""}`}>
                    <span>{label}</span>
                    {field === "message" ? (
                      <textarea value={formData[field]} onChange={(event) => setField(field, event.target.value)} onBlur={() => blurField(field)} rows={5} required />
                    ) : (
                      <input
                        type={field === "email" ? "email" : "text"}
                        value={formData[field]}
                        onChange={(event) => setField(field, event.target.value)}
                        onBlur={() => blurField(field)}
                        dir={field === "email" ? "ltr" : isRtl ? "rtl" : "ltr"}
                        required
                      />
                    )}
                    {errors[field] ? <small>{errors[field]}</small> : null}
                  </label>
                ))}
                <button className="btn btn-primary submit-btn" type="submit" disabled={submitState === "loading"}>
                  {submitState === "loading"
                    ? dictionary.form.submitLoading
                    : submitState === "success"
                      ? dictionary.form.submitSuccess
                      : submitState === "error"
                        ? dictionary.form.submitError
                        : dictionary.form.submitIdle}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <p>{PROFILE.initials}</p>
          <p>
            © 2024 {PROFILE.name}. {dictionary.footer.rights}
          </p>
          <div className="social-row">
            <a href={PROFILE.telegramUrl} target="_blank" rel="noopener noreferrer">
              Telegram
            </a>
          </div>
        </div>
        <p className="built-note">{dictionary.footer.builtWith}</p>
      </footer>

      <button className={`back-top ${showTop ? "show" : ""}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        {dictionary.common.top}
      </button>

      <div className="chatbot">
        <button className="chat-toggle" onClick={toggleChat} aria-label={dictionary.chat.toggle}>
          {dictionary.chat.toggle}
          {unreadCount > 0 ? <span className="chat-unread">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          {notifyDot ? <span className="notify-dot" /> : null}
        </button>
        <aside className={`chat-window ${chatOpen ? "open" : ""}`}>
          <header>
            <div>
              <strong>{PROFILE.name}</strong>
              <p>{dictionary.chat.headerStatus}</p>
            </div>
            <div className="chat-header-actions">
              <button onClick={resetChatConversation} aria-label="Reset chat" title="Reset chat">
                ↺
              </button>
              <button onClick={() => setChatOpen(false)} aria-label={dictionary.chat.close}>
                x
              </button>
            </div>
          </header>
          <div className="chat-messages" ref={chatBodyRef}>
            {chatMessages.map((message) => (
              <div key={message.id} className={`bubble ${message.sender}`} dir="auto">
                <p dir="auto">{message.text}</p>
                {message.action === "project" ? (
                  <button className="bubble-action" onClick={() => onNavClick("project")}>
                    {dictionary.chat.actions.project}
                  </button>
                ) : null}
                {message.action === "contact" ? (
                  <button className="bubble-action" onClick={() => onNavClick("contact")}>
                    {dictionary.chat.actions.contact}
                  </button>
                ) : null}
                {message.action === "resume" ? (
                  <a className="bubble-action" href="/assets/resume.pdf" download>
                    {dictionary.chat.actions.resume}
                  </a>
                ) : null}
                <small className="chat-time">{formatChatTime(message.createdAt, lang)}</small>
              </div>
            ))}
            {chatTyping ? (
              <div className="bubble bot typing-indicator" aria-label={dictionary.common.typing}>
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>
          {quickVisible ? (
            <div className="quick-replies">
              {dictionary.chat.quickReplies.map((reply) => (
                <button key={reply} onClick={() => handleSendChat(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          ) : null}
          <div className="chat-input-row">
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSendChat()}
              placeholder={dictionary.chat.placeholder}
              dir="auto"
              disabled={chatTyping}
            />
            <button onClick={() => handleSendChat()} disabled={chatTyping}>
              {dictionary.common.send}
            </button>
            {!quickVisible ? (
              <button type="button" className="chat-quick-toggle" onClick={() => setQuickVisible(true)}>
                ?
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}