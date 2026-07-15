---
type: Component
title: Smart Search
description: Die multifunktionale Suchkomponente für Berechnungen, Konvertierungen und Datensuche.
tags: [component, search, risk]
timestamp: 2024-05-23T10:00:00Z
---

Die `Searchbar`-Komponente ist mehr als eine einfache Websuche. Ihre Logik, zentralisiert in `src/lib/utils/searchUtils.ts`, bietet erweiterte Funktionalitäten zur Steigerung der Produktivität.

### Kernfunktionen

1.  **Mathematische Auswertung:** Eingaben, die wie mathematische Ausdrücke aussehen (z.B. `10 * (5+3)`), werden direkt ausgewertet und das Ergebnis angezeigt.
2.  **Einheitenumrechnung:** Unterstützt die Konvertierung zwischen vordefinierten Einheiten (z.B. `10 usd in eur`, `5ft in cm`).
3.  **Interne Datensuche:** Durchsucht aggregierte Daten aus anderen Widgets, wie Kalendertermine und To-Do-Einträge.
4.  **Websuche:** Wenn keine der obigen Funktionen zutrifft, wird die Eingabe an eine Websuchmaschine (DuckDuckGo) weitergeleitet.

### Risiko-Identifikation

Die Implementierung der mathematischen Auswertung stellt ein [identifiziertes Sicherheitsrisiko](../concepts/risk-analysis.md#2-komplexer-fallstrick-smart-search-funktionalität) dar.

-   **Mechanismus:** Die Funktion `evaluateMath` verwendet `new Function('return ' + s)()` zur Auswertung des Eingabe-Strings.
-   **Gefahr:** Dieser Ansatz ist eine Form von `eval` und potenziell anfällig für Cross-Site-Scripting (XSS), wenn es einem Angreifer gelingt, die Regex-basierte Eingabevalidierung (`securityCheck`) zu umgehen.
-   **Empfehlung:** Für zukünftige Versionen sollte der Einsatz einer sichereren, dedizierten Mathe-Parsing-Bibliothek anstelle von `new Function()` evaluiert werden.