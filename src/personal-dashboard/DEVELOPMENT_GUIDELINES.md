# Development Guidelines

Willkommen im Personal Dashboard Projekt! Um die Code-Qualität, Performance und Wartbarkeit hoch zu halten, befolgen wir strikt die folgenden Entwicklungsrichtlinien. Jede Erweiterung und jedes Refactoring muss sich an diesen Prinzipien orientieren.

## 1. Clean Code & Architektur
- **Lesbarkeit vor Cleverness:** Schreibe Code, der leicht verständlich ist. Vermeide unnötig komplexe Einzeiler, wenn mehrere Zeilen besser lesbar sind.
- **Svelte 5 Runes:** Wir nutzen moderne Svelte 5 Features (`$state`, `$derived`, `$effect`, `$props`). Der Code sollte deklarativ und reaktiv gestaltet sein.
- **Komponenten-Struktur:** Halte Komponenten klein und fokussiert. Wenn eine Komponente zu viele Aufgaben übernimmt, lagere Logik oder UI-Teile in kleinere Unterkomponenten aus.
- **Trennung von Logik und UI:** Größere Datenoperationen und API-Calls gehören in `+page.server.ts` oder API Routes, während die Client-Komponenten für die Darstellung und lokale Interaktion zuständig sind.

## 2. Strict TypeScript
- **Kein `any`:** Die Verwendung von `any` ist strengstens untersagt. Definiere immer klare Interfaces oder Types für deine Datenstrukturen.
- **Null Safety:** Achte auf mögliche `null` oder `undefined` Werte und behandle diese (z. B. durch Optional Chaining `?.` oder Nullish Coalescing `??`).
- **Svelte-Check:** Bevor Code in den Main-Branch gemerged wird, muss `npm run check` fehlerfrei durchlaufen.

## 3. No-Latency & Performance (Absolute Priorität)
- **Zero-Latency Feel:** Die App muss sich für den Nutzer sofort reaktiv anfühlen. Optisches Feedback auf Nutzeraktionen (Klicks, Navigation) muss unmittelbar erfolgen, ohne auf Server-Antworten zu warten (Optimistic UI Updates, wo sinnvoll).
- **Local-First:** Das Dashboard ist als Local-First-Anwendung konzipiert. Daten werden primär im `localStorage` gespeichert und ausgelesen. Supabase dient als Hintergrund-Sync-Layer. Ein Laden des Dashboards muss ohne Netzwerkanfragen zur Datenbank möglich sein.
- **Bundle-Size:** Achte darauf, keine großen externen Bibliotheken einzubinden, wenn es nicht zwingend erforderlich ist. Nutze native Browser-APIs, wo immer möglich.

## 4. Internationalisierung (i18n)
- **Keine Hardcoded-Texte:** Jeder sichtbare Text in der App MUSS zwingend in den Übersetzungsdateien (`src/lib/i18n/en.ts` und `src/lib/i18n/de.ts`) hinterlegt werden.
- **Konsistenz:** Wenn neue Features gebaut werden, pflege die Übersetzungen in allen unterstützten Sprachen sofort ein.
- **Nutzung:** Verwende das `$lib/i18n/i18n.svelte.ts` Store (`i18n.t.mein.text`), um die Texte in den Svelte-Komponenten dynamisch zu laden.

## 5. Design & UI/UX
- **Konsistente Ästhetik:** Nutze das etablierte Design-System (Tailwind CSS, Frosted Glass / Backdrop-Blur-Effekte, abgerundete Ecken).
- **Responsive Design:** Jedes Feature muss sowohl auf dem Desktop als auch auf mobilen Geräten perfekt funktionieren.
- **Icons:** Wir verwenden `lucide-svelte` für Icons. Halte die Icon-Sprache konsistent.

---
Bitte lies dir diese Richtlinien durch, bevor du an neuen Features oder Bugfixes arbeitest. Code, der diese Prinzipien verletzt, wird nicht akzeptiert.
