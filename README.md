# Alfa-agent-darmowy- 🔥

**Kozacki, darmowy AI agent do Facebook Pages + Groups z żelaznymi, deterministycznymi guardrailsami ALFA (Filtry Tonoyana).**

Zero halucynacji na publikacjach i odpowiedziach do klientów. ALFA ma zęby i odmawia wrzucania bullshitów.

## Dlaczego to jest kozackie

- **ALFA Guardrails** (rdzeń) — 8 deterministycznych filtrów (F1 Kontrargument / Popper, F2 Weryfikacja źródeł, F3 Kontekst, F4 Anti-magic, F5 Dwuperspektywa / Kahneman, F6 Backtrack, F7 Atrybucja, **F8 Hype** na marketingowe "rewolucyjne/gwarancja/100%/game changer").
- Pełny **multi-stage Pipeline** (LIGHT/MEDIUM/HEAVY/FULL/AUTO) z detektorami Risk/Pressure/Drift, Response Simulator w FULL, Release Gate PASS/WARN/BLOCK + proofChain + Mermaid + self-contained HTML raporty audytowe.
- **Zero LLM w warstwie decyzyjnej** — LLM tylko generuje, ALFA decyduje. Filtry są falsyfikowalne i audytowalne.
- **Rozwiązanie deprecated Groups API** — pełne połączenie z inteligentnym browser agentem [BrowserOperator](https://github.com/BrowserOperator/browser-operator-core) (vision + planning + CDP). Wysokopoziomowe taski przez `/v1/responses`. Fallback na Playwright z persistent contexts.
- **Modularne Grok Skills** — cały system rozbity na czyste, wąskie, reużywalne skille (w `~/.grok/skills/`). Możesz brać tylko `alfa-guardrails` do swojego content pipeline'u albo cały zestaw do własnego agenta.
- Brutalist UI (czarny + biały + czerwone linie strukturalne) — zero pizdy, tylko to co działa.
- Pełny stack: tRPC + React 19 + Drizzle + scheduler + tones + knowledge base + agent skills + group filters + media + analytics + notifications + webhooks.

## Szybki start

```bash
# 1. Zainstaluj zależności
pnpm install

# 2. Skopiuj .env.example → .env i uzupełnij (DB, Facebook App, BrowserOperator URL itd.)
cp .env.example .env

# 3. (Opcjonalnie) Przygotuj Playwright (fallback)
pnpm browser:setup

# 4. Push DB schema
pnpm db:push

# 5. Odpal
pnpm dev
```

Otwórz `/alfa-lab` — tam możesz testować ALFA na żywo z pełnym pipeline'em i raportami.

## Kluczowe rzeczy

### ALFA — standalone + wbudowane

```bash
# CLI
pnpm alfa pipeline --depth full --html report.html "Twój tekst marketingowy tutaj"

# Lub w kodzie / tRPC
# patrz server/routers-ai-generation.ts i client/src/pages/AlfaLab.tsx
```

Dokumentacja: [ALFA.md](./ALFA.md)

Manifesto + architektura + przykłady dobrych/złych tekstów + jak integruje się z resztą systemu.

### Połączenie z przeglądarką (BrowserOperator)

Grupy Facebooka nie mają już działającego API do postowania (deprecated 2024).

Zamiast tego:

- Wysokopoziomowe instrukcje idą do lokalnego BrowserOperator agenta.
- ALFA-cleared content jest wklejany **verbatim** ("use EXACTLY this text, copy-paste, change nothing").
- Operator radzi sobie z dynamicznym UI Facebooka dzięki vision + planning.

Konfiguracja w `.env`:
```
BROWSER_OPERATOR_API_URL=http://localhost:8081
# opcjonalnie AUTH_KEY
```

W schedulerze i testach (🌐 button w GroupsManager) automatycznie preferuje operatora, z fallbackiem na Playwright.

Patrz: `server/browser-operator-client.ts`, `server/group-browser-poster.ts`, `server/facebook-agent.ts`.

### Modularne Grok Skills (osobne skille)

Cały agent został rozbity na wąskie, wysokiej jakości skille (dla Grok / Claude Code / innych agentów).

Główne:

- `alfa-guardrails` — rdzeń (Filtry Tonoyana + pełny pipeline + raporty)
- `browser-operator` — integracja z BrowserOperatorem (ten repo co podałeś)
- `alfa-styk` — **1 dobra styka** — klej, kontrakty, kolejność, end-to-end przepisy między skillami
- `facebook-group-poster` + `facebook-page-poster` + `facebook-message-responder`
- `facebook-scheduler`, `notification-manager`, `media-manager`, `facebook-post-analytics`
- `tone-config-manager`, `knowledge-base-manager`, `agent-skills-manager`, `group-filter-builder`
- `facebook-api-client`, `facebook-webhook-handler`
- `brutalist-design`, `alfa-webapp`, `alfa-facebook-agent`, `facebook-agent-runner`
- `alfa-project` — master overview całego systemu

Skille żyją w Twoim `~/.grok/skills/` (lub równoważniku).

Każdy skill ma jasne "When to use", trigger phrases, integration rules i "always ALFA first".

Dzięki `alfa-styk` wiesz dokładnie jak je składać, żeby nie rozleciało się w produkcji.

### Inne ważne rzeczy

- **Tones + Knowledge Base + Agent Skills** — grounding generacji przed ALFA.
- **Group Filters** — zaawansowane AND/OR targetowanie grup (lokalizacja, rozmiar, engagement, custom keywords) + performance tracking.
- **Scheduler** — działa w tle, ogarnia Page (Graph) + Groups (browser), media, retry, logi, notyfikacje.
- **AlfaLab + demo reports** — `/alfa-lab` + katalog `demos/` z przykładami BLOCK / PASS.
- **Brutalist design system** — konsekwentny w całym UI.

## Architektura (w skrócie)

Generacja (tone + KB + skills)  
→ **alfa-guardrails** (obowiązkowe, deterministyczne)  
→ tylko PASS (lub zatwierdzony WARN) leci dalej z exact text + proofChain  
→ facebook-page-poster (Graph) / facebook-group-poster (browser-operator)  
→ media via media-manager  
→ scheduler + analytics + notifications

Live messages: webhook → handler → message-responder (z ALFA) → send.

## Development

```bash
pnpm dev          # full stack
pnpm test         # vitest (w tym filtry ALFA)
pnpm alfa:check   # szybki check
```

Nowe ALFA filtry/pipeline: `server/validation/filtry-tonoyana.ts` + `alfa-pipeline.ts`.

Nowe skrypty CLI: `scripts/alfa.ts`, `scripts/alfa-validate.ts`.

## Status

Projekt ewoluował pod "wolna ręka" + "ma być kozacki".

- ALFA jest teraz dużo ostrzejsze niż na początku (F8 + severity logic + angielskie patterny + pełne raporty + testy zielone).
- BrowserOperator jest wpięty jako preferowane rozwiązanie na grupy.
- Całość jest modularna dzięki osobnym skillom + jasnej "styce".
- Nadal da się odpalić jako pełny webapp z brutalist dashboardem.

Zobacz też:
- [ALFA.md](./ALFA.md) — głęboka dokumentacja guardrailsów
- [todo.md](./todo.md) — co jeszcze jest do zrobienia / co zrobione
- [RESEARCH_FINDINGS.md](./RESEARCH_FINDINGS.md) — dlaczego Groups API nie działa i co z tym zrobiliśmy

## Licencja / Darmowy

Nazwa "darmowy" oznacza, że agent ma być **zaufany** (nie halucynuje na Twoich klientach i grupie) i otwarty w sensie możliwości użycia poza pierwotną platformą.

Używaj odpowiedzialnie. Facebook ma swoje limity i polityki — agent ich nie obchodzi, Ty musisz.

---

Zrobione z wolną ręką. ALFA ma zęby. Browser radzi sobie z grupami. Skille są osobne i się stykają.

Jeśli chcesz użyć tylko części (np. same guardrailsy albo tylko browser poster) — bierz odpowiednie skille i jazda.

Powodzenia. Nie wrzucaj gówna na grupy.