export type LocaleCode = "en" | "fa" | "zh" | "hi" | "es" | "ar" | "uz" | "my" | "ne" | "mg" | "ka";

export type Field = "name" | "email" | "subject" | "message";

export type LocaleDictionary = {
  code: LocaleCode;
  dir: "ltr" | "rtl";
  languageLabel: string;
  roles: string[];
  nav: { about: string; skills: string; experience: string; project: string; contact: string };
  common: {
    skipToMain: string;
    downloadCV: string;
    themeDark: string;
    themeLight: string;
    top: string;
    typing: string;
    send: string;
  };
  greetings: { morning: string; afternoon: string; evening: string; night: string };
  hero: {
    intro: string;
    ctaWork: string;
    ctaContact: string;
    scrollDown: string;
  };
  about: {
    title: string;
    subtitle: string;
    paragraphs: string[];
    statsLabels: string[];
    bridge: string;
  };
  skills: {
    title: string;
    subtitle: string;
    bridge: string;
  };
  experience: {
    title: string;
    subtitle: string;
    bridge: string;
    items: Array<{
      period: string;
      company: string;
      role: string;
      type: string;
      points: string[];
      stack: string[];
    }>;
  };
  project: {
    title: string;
    subtitle: string;
    liveOnGithub: string;
    features: string[];
    viewGithub: string;
    liveDemo: string;
    stars: string;
    forks: string;
    language: string;
    bridge: string;
    githubTitle: string;
  };
  contact: {
    title: string;
    subtitle: string;
    email: string;
    phone: string;
    location: string;
    availability: string;
    responseTime: string;
    copy: string;
    copied: string;
  };
  form: {
    name: string;
    email: string;
    subject: string;
    message: string;
    submitIdle: string;
    submitLoading: string;
    submitSuccess: string;
    submitError: string;
    errors: Record<Field, string>;
  };
  footer: {
    rights: string;
    builtWith: string;
  };
  chat: {
    toggle: string;
    close: string;
    headerStatus: string;
    placeholder: string;
    initialMessage: string;
    autoMessage: string;
    quickReplies: string[];
    actions: { project: string; contact: string; resume: string };
    responses: {
      greeting: string;
      about: string;
      skills: string;
      project: string;
      contact: string;
      resume: string;
      experience: string;
      available: string;
      fallback: string;
    };
  };
};