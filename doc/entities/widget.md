---
type: Entity
title: Widget (Definition und Instanz)
description: Das Konzept eines Widgets, unterteilt in Definition und Instanz.
tags: [entity, widget]
timestamp: 2024-05-23T10:00:00Z
---

Das Konzept "Widget" hat zwei Bedeutungen im System: die abstrakte Definition und die konkrete Instanz.

### 1. Widget-Definition

Eine Widget-Definition ist ein abstraktes Konzept, das im Frontend-Code (`+page.svelte`) als Konfigurationsobjekt existiert. Es beschreibt einen Widget-**Typ**.

-   **Zweck:** Definiert, welche Widgets dem Benutzer zur Auswahl stehen.
-   **Attribute:** Enthält typischerweise den Namen des Widgets (z.B. "Kalender"), die zu ladende Svelte-Komponente und Standardgrößen für das Raster.

### 2. StoredWidget (Instanz)

Eine `StoredWidget`-Instanz ist eine konkrete Instanz eines Widgets auf einem [Layout](./layout.md). Sie ist keine eigene Datenbanktabelle, sondern wird als JSON-Objekt innerhalb des `layout_data`-Feldes der `Layout`-Tabelle gespeichert.

-   **Zweck:** Repräsentiert ein vom Benutzer platziertes und konfiguriertes Widget.
-   **Attribute:**
    -   `id`: Eine eindeutige ID für diese spezifische Instanz.
    -   `type`: Verweist auf die Widget-Definition (z.B. "calendar").
    -   `x`, `y`: Position auf dem Dashboard-Raster.
    -   `width`, `height`: Dimensionen auf dem Raster.
-   **Konfiguration:** Die benutzerspezifische Konfiguration und sensible Daten (z.B. API-Schlüssel) für diese Instanz werden nicht hier, sondern im [UserSecrets](./user-secrets.md)-Objekt gespeichert. Der Schlüssel ist dabei die `id` der `StoredWidget`-Instanz. Diese Trennung von Layout und Konfiguration ist ein zentrales Sicherheitsmerkmal.