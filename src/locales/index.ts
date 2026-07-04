import { en } from "./en";
import { fa } from "./fa";
import { hi } from "./hi";
import { es } from "./es";
import { ar } from "./ar";
import { uz } from "./uz";
import { my } from "./my";
import { ne } from "./ne";
import { mg } from "./mg";
import { ka } from "./ka";
import { zh } from "./zh";
import { LocaleCode, LocaleDictionary } from "./types";

export const locales: Record<LocaleCode, LocaleDictionary> = { en, fa, zh, hi, es, ar, uz, my, ne, mg, ka };

export const localeList: Array<{ code: LocaleCode; label: string }> = [
  { code: "en", label: en.languageLabel },
  { code: "fa", label: fa.languageLabel },
  { code: "zh", label: zh.languageLabel },
  { code: "hi", label: hi.languageLabel },
  { code: "es", label: es.languageLabel },
  { code: "ar", label: ar.languageLabel },
  { code: "uz", label: uz.languageLabel },
  { code: "my", label: my.languageLabel },
  { code: "ne", label: ne.languageLabel },
  { code: "mg", label: mg.languageLabel },
  { code: "ka", label: ka.languageLabel },
];

export type { LocaleCode, LocaleDictionary };