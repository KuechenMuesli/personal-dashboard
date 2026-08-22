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

## Design-System

Alles Optische kommt aus `src/lib/styles/`. Wer eine Farbe, einen Radius oder einen
Schatten direkt in eine Komponente schreibt, hat den falschen Ort erwischt.

    theme.css       Tokens und die acht Themes
    primitives.css  wiederverwendbare Bausteine (.ds-*)
    compat.css      Uebergangsschicht, faellt weg wenn die Widgets migriert sind

**Drei Schichten, und die Reihenfolge ist nicht beliebig.** Gespeicherte Custom-Themes
liegen in Supabase als roher CSS-Text und referenzieren die alten Variablennamen.
Diese Namen sind damit ein oeffentlicher Vertrag:

1. Palette-Slots (`--color-neutral-800` = Karte, `--color-neutral-900` = Eingabe,
   `--color-blue-500` = Akzent, `--theme-body-bg`, `--color-widget-text`). Das ist,
   was ein Theme setzt. Umbenennen bricht jedes gespeicherte Nutzer-Theme.
2. Semantische Tokens (`--ds-surface`, `--ds-fill`, `--ds-border`, `--ds-text`, ...),
   auf `body` aus Schicht 1 abgeleitet. Muss auf `body` stehen: die Theme-Klasse haengt
   dort, und `var()` sieht nur Werte desselben Elements.
3. Utilities via `@theme inline`: `bg-surface`, `bg-fill`, `border-line`,
   `text-primary/secondary/muted`, `text-accent`, `shadow-card`.

**Falle: `@theme inline` ist Pflicht, nicht Geschmack.** Ohne `inline` emittiert Tailwind
`:root { --color-surface: var(--ds-surface) }`. Custom Properties werden am deklarierenden
Element aufgeloest — auf `:root` ist `--ds-surface` unbekannt, der Wert bleibt dauerhaft
ungueltig, `bg-surface` faerbt nichts. Mit `inline` landet `var(--ds-surface)` direkt in
der Utility und wird erst dort aufgeloest, wo sie benutzt wird.

**Helle Themes brauchen keine Sonderbehandlung mehr.** Frueher hat ein `!important`-Block
jede `bg-black/XX`-Utility einzeln nachjustiert. Jetzt kippen `--ds-fill` und `--ds-border`
einmal zentral von Weiss- auf Schwarztoene. Der Block in `compat.css` existiert nur noch
fuer nicht migrierte Widgets — wer eins migriert, ersetzt `bg-black/XX` durch
`bg-fill`/`bg-fill-strong` und streicht die Zeile dort.

**Zustaende immer ueber `aria-pressed`.** `.ds-tile`, `.ds-segment-item` und `.ds-nav-item`
haengen ihre Auswahl-Optik an `[aria-pressed='true']`, damit Optik und Semantik nicht
auseinanderlaufen koennen. `aria-selected` ist auf `<button>` ungueltig — das setzt
`role="tab"` voraus.

Skala: Radius sm 8 / md 12 / lg 16 / xl 20. Labels sind 11px/600, nicht mehr
10px/900/uppercase. Der Akzent traegt Fokus, Auswahl und die eine primaere Aktion —
keine grossen Flaechen.

**Stand:** System, Primitives und die gesamte Shell sind migriert (Dashboard, Settings,
Login, Reset, Impressum, Privacy, Share, Fehlerseite, alle `lib/components/`).
Die 18 Widgets in `src/lib/widgets/` sind es **nicht** — sie laufen weiter ueber
`compat.css`. Sichtbar wird das an Widget-internen Ueberschriften, die noch
10px/900/uppercase sind, waehrend der Karten-Titel daneben schon 11px/600 ist.

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

**Markdown.** `marked` gibt rohes HTML unverändert durch und lässt `javascript:`-URLs stehen —
auf fremden Inhalten war das gespeichertes XSS. Gerendert wird ausschließlich über
`renderMarkdown()` aus `src/lib/markdown.ts`; ein direkter `marked.parse`-Aufruf in einem
`{@html}` ist ein Fehler. Das Modul schaltet die HTML-Tokenizer ab und lässt nur http/https/
mailto sowie data:image (ohne SVG) als URL-Schema durch. Falle beim Anfassen: Renderer und
Tokenizer dürfen nur per `setOptions` gesetzt werden — `new Marked({renderer})` und `.use()`
kopieren nur eigene Objekt-Eigenschaften, Klassenmethoden liegen auf dem Prototyp und kommen
nie an; marked rendert dann still mit den Standardklassen weiter. `npm run test:markdown`
prüft 33 Angriffsvektoren und 16 Regressionsfälle.

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

### Pruefskripte fuer das Design-System

Drei Skripte in `node_modules/.cache/`. Die ersten beiden sind in Sekunden durch und
pruefen Dinge, die ein Build gar nicht prueft:

    node node_modules/.cache/ds-verify.mjs           171 Zusicherungen auf dem kompilierten CSS
    node node_modules/.cache/ds-compile.mjs $(pwd)   alle .svelte durch den Svelte-Compiler
    node node_modules/.cache/ds-bundle.mjs <alt> <neu>   zwei echte Builds vergleichen

`ds-verify.mjs` kompiliert `layout.css` ueber `@tailwindcss/node`, loest die Kaskade
`:root -> body.theme-X` von Hand auf und prueft fuer alle acht Themes, dass jedes
`--ds-*` zu einer konkreten Farbe wird. Der wichtigste Fall darin: ein Theme, das
**nur** die alten Palette-Namen setzt — genau so liegen die Nutzer-Themes in der
Datenbank — muss die `--ds-*`-Tokens trotzdem korrekt steuern.

Falle beim Anfassen von `ds-verify.mjs`: ein flacher Regex ueber die Regeln reicht
nicht. Tailwind verschachtelt `@supports`-Bloecke in die `body`-Regel, `[^{}]*`
verschluckt dann alles dahinter. Das Skript zaehlt Klammern.

Gemessen an zwei echten Builds (HEAD `4df57da` gegen den Stand nach der Umstellung),
Client-Bundle `_app/immutable`:

    CSS gzip     16.8 KB  ->  17.6 KB   (+0.78 KB, die Primitives)
    JS  gzip    356.6 KB  -> 354.1 KB   (-2.50 KB, kuerzere class-Strings)
    Summe       373.4 KB  -> 371.7 KB   (-1.72 KB)

Die Rechnung geht auf, weil die class-Attribute der Shell von 34.4 KB auf 20.0 KB
Quelltext geschrumpft sind — im Schnitt von 85 auf 49 Bytes je Attribut. Wer Primitives
ergaenzt, ohne dass sie mehrfach benutzt werden, dreht das ins Negative.


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

Erledigt: L-01 (Icons), L-02 (Precache), S-01/S-02 (Proxy), S-03 (Markdown-Rendering),
R-01 (Service-Worker-Regression).
Offen und nach Schwere sortiert: S-04 `/post-reminders/[id]` ohne jede Authentifizierung les- und schreibbar,
S-05 `csrf.checkOrigin: false`, S-06 Open Redirect in beiden Auth-Callbacks, U-01
`localStorage.clear()` löscht anonymen Nutzern bei jedem Reload das Layout, L-03 supabase-js
(57 KB gzip) auf dem kritischen Pfad jeder Route, L-04 beide Sprachwörterbücher im
Initial-Bundle.
