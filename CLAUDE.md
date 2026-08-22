# CLAUDE.md

Arbeitsanweisungen für dieses Repository. Ergänzt `src/personal-dashboard/DEVELOPMENT_GUIDELINES.md`
(dort stehen die inhaltlichen Projektregeln) — hier steht, was beim Arbeiten schiefgeht.

## Wo der Code liegt

Die Anwendung liegt **nicht** im Repo-Wurzelverzeichnis, sondern in `src/personal-dashboard/`.
Dort stehen `package.json`, `svelte.config.js` und `src/`. Alle npm-Befehle von dort aus starten.

Stack: SvelteKit 2 mit Svelte 5 (Runes durchgängig), Tailwind v4, TypeScript strict,
Deployment auf Cloudflare Pages/Workers via `adapter-cloudflare`, Supabase als Sync-Layer.
Produktiv unter https://dashboard.paul-simon.dev.

## Kommentare

Keine Kommentare, die beschreiben, was der Code tut — der Code steht daneben.
Kommentiert wird ausschließlich das **Warum**: Fallstricke, Trade-offs, nicht offensichtliche
Zwänge, Dinge, die schon mal schiefgegangen sind. Ein Kommentar, der beim Lesen der Zeile
darunter keine neue Information liefert, gehört gelöscht. Das gilt auch für JSDoc-Blöcke,
die nur den Parameternamen wiederholen.

## Prioritäten

Ladezeit steht an erster Stelle, User-Experience direkt danach. Beides schlägt Eleganz.

Bevor eine Optimierung gebaut wird: prüfen, ob die teure Operation ganz entfallen kann,
statt nur schneller zu werden. Beispiel aus der Praxis — die Lucide-Icons wurden zuerst in
25 Dateien nach Anfangsbuchstaben aufgeteilt und bedarfsgerecht nachgeladen. Ein Icon ist
180 Bytes, der größte Bucket 10,6 KB gzip. Die richtige Lösung war, die 180 Bytes beim
Auswählen im Favoriten zu speichern, sodass beim Rendern gar nichts nachgeladen wird.
Faustregel: übertragene Bytes zu Nutzdaten jenseits von etwa 3:1 heißt, die Aufteilung
setzt am falschen Punkt an.

## Fallen, die schon zugeschnappt sind

**Service Worker (`src/service-worker.ts`).** Cache-first darf ausschließlich für Dateien
gelten, deren Name den Inhalt festlegt: alles unter `/_app/immutable/` und der `static`-Ordner.
`prerendered` (`/`, `/impressum`, `/privacy`) gehört ausdrücklich nicht dazu — gleicher Pfad,
wechselnder Inhalt. Ein Verstoß dagegen hat Prod lahmgelegt: die Startseite kam aus dem Cache
und zeigte auf Chunk-Namen, die es nach dem Deployment nicht mehr gab, alle Assets 404,
`Importing a module script failed`. Seitenaufrufe laufen deshalb ausnahmslos network-first.
Der Precache holt die Shell mit `new Request(asset, { cache: 'reload' })`, sonst landet ein
Dokument aus dem HTTP-Cache im Precache. Vor jeder Änderung am Routing:
`node_modules/.cache/sw-test.mjs`-Muster nachbauen und prüfen, welche Pfade cache-first werden.

**Lucide-Icons.** Niemals `import * as icons from "lucide-svelte"` — der Namespace ist nicht
tree-shakebar und zieht 843 KB in den Chunk. Nur benannte Importe (`import { Plus } from
"lucide-svelte"`). Icons, die zur Laufzeit über einen Namen ausgewählt werden, kommen aus
`src/lib/icons/`: `iconData.ts` ist generiert (`npm run icons:generate`, nach jedem Update
von `lucide-svelte` neu), `LucideIcon.svelte` rendert Pfaddaten synchron, `iconSet.ts` lädt
die Sammlung nur für den Icon-Browser und die Migration. Marken-Icons wie `Github` gibt es
in lucide v1 nicht mehr.

**Proxy (`/api/proxy`).** Zielprüfung liegt in `src/lib/server/proxyTargets.ts` und arbeitet
auf der geparsten URL, nie auf der Zeichenkette — eine Substring-Allowlist hat vorher
`http://169.254.169.254/?calendar` durchgelassen. Zwei Klassen: bekannte API-Hosts dürfen
Zugangsdaten des Clients sehen, beliebige Kalender-URLs nicht (nur GET, Größenlimit, Antwort
muss `BEGIN:VCALENDAR` sein). Antworten, die mit Zugangsdaten geholt wurden, werden nie
gecacht — der Isolate-Cache ist zwischen allen Nutzern geteilt. Weiterleitungen werden von
Hand verfolgt und bei jedem Sprung neu geprüft.

**Widget-Einstellungen.** Jedes Widget implementiert „erst Cloud-Secrets, sonst localStorage"
selbst, und jedes anders. Daraus stammen mehrere „lädt nicht"-Bugs der Historie. `Todo.svelte`
prüft `secretsLoaded` korrekt, `ClockWeatherDate.svelte` nicht (Wetter lädt für neue anonyme
Nutzer nie), `Embed.svelte` lädt in `$effect` und `onMount` gleichzeitig. Wer hier etwas
anfasst: eine gemeinsame `createWidgetSettings<T>(id, key, defaults)` wäre die richtige Lösung.

**Widget-Registry in `src/routes/+page.svelte`.** `widgets` ist `$derived` über `i18n.t`.
Dadurch entstehen bei jedem Sprachwechsel neue `load`-Closures, das `{#await}` startet neu und
alle Widgets verlieren ihren Zustand. Beim Anfassen mitkorrigieren: Registry als `const`
außerhalb der Reaktivität, Anzeigenamen erst im Picker auflösen.

## Was in dieser Umgebung nicht geht

`npm run build` ist aus einer Claude-Session heraus **nicht** ausführbar. `svelte.config.js`
importiert `adapter-cloudflare` → wrangler → workerd, und `node_modules` enthält das
macOS-Binary. Der Build muss auf Pauls Rechner laufen. Entsprechend gilt: Bundle-Größen
lassen sich nur aus einem vorhandenen Build unter `.svelte-kit/output/client/.vite/manifest.json`
lesen, nicht neu messen.

`npx svelte-check` läuft (etwa 40 Sekunden, im Hintergrund starten), meldet aber aus demselben
Grund pro `.svelte`-Datei einen zusätzlichen Fehler „Error in svelte.config.js / workerd".
Das ist Rauschen. Echte Fehlerzahl mit einem Regex auf `^<pfad>:<zeile>:<spalte>\nError: …`
filtern und die `Error in svelte.config.js`-Einträge abziehen. Stand August 2026: **40 echte
Fehler** — das ist die Baseline, an der neue Arbeit gemessen wird. Die Guidelines fordern 0.

Einzelne Komponenten lassen sich trotzdem prüfen: ein Skript nach `node_modules/.cache/` legen
(dort findet node das `svelte`-Paket) und `compile(source, { runes: true })` aufrufen. Den
Rohtext übergeben — der Svelte-5-Compiler versteht `lang="ts"` selbst.

`device_bash` kann nichts löschen (EPERM auf `rm`, `rmdir`, `unlink`). Generatoren deshalb ohne
`rmSync` bauen. Sollen Dateien weg: in einen `_to_delete/`-Ordner verschieben und Paul sagen.

## Verifikation

Alles, was nicht per Build geprüft werden kann, braucht einen eigenen Testlauf. Was sich
bewährt hat: reine Logik in ein eigenes Modul ziehen (so entstand `proxyTargets.ts`) und mit
einem Node-Skript gegen konkrete Fälle prüfen — inklusive der Fälle, die vorher kaputt waren.
Die Icon-Daten wurden gegen alle 1.686 Originale in `node_modules/lucide-svelte` abgeglichen.

Der Service-Worker-Fehler ist entstanden, weil dieser Schritt einmal ausgelassen wurde.

## Commits

Englisch, einzeilig, kein Konventions-Präfix, ein Thema pro Commit. Ursachen hängt Paul mit
`- cause: …` an. Beispiele aus der Historie:

    Fix for todo widget not loading todos on site refresh
    Potential fix for todos not loading correct date list - cause: race condition
    Implement new DB-Schema

Vor dem Stagen prüfen, dass zusammengehörige Dateien vollständig drin sind — es ist schon
zweimal passiert, dass generierte Dateien ohne die Module committet wurden, die sie benutzen.
`monetization_plan.md` gehört nicht ins öffentliche Repo.

## Offene Befunde

Das Audit vom 21.08.2026 liegt als Artifact vor:
https://claude.ai/code/artifact/578cfead-0f9b-4cb6-959f-84b5133d72cf

Erledigt: L-01 (Icons), L-02 (Precache), S-01/S-02 (Proxy), R-01 (Service-Worker-Regression).
Offen und nach Schwere sortiert: S-03 gespeichertes XSS in `/s/[id]` (`{@html marked.parse(…)}`
auf fremdem Inhalt), S-04 `/post-reminders/[id]` ohne jede Authentifizierung les- und schreibbar,
S-05 `csrf.checkOrigin: false`, S-06 Open Redirect in beiden Auth-Callbacks, U-01
`localStorage.clear()` löscht anonymen Nutzern bei jedem Reload das Layout, L-03 supabase-js
(57 KB gzip) auf dem kritischen Pfad jeder Route, L-04 beide Sprachwörterbücher im
Initial-Bundle.
