---
type: Concept
title: Design Rationale
description: Begründung für die Kernarchitektur und die Datenmodellierung.
tags: [architecture, design, rationale]
timestamp: 2024-05-23T10:00:00Z
---

Die Architektur wurde gewählt, um eine hochperformante, sichere und flexible Single-Page Application (SPA) zu schaffen, die sowohl offlinefähig ist als auch eine nahtlose Cloud-Synchronisation ermöglicht.

```mermaid
graph TD
    subgraph Browser
        A[SvelteKit Frontend]
    end

    subgraph Cloudflare Edge
        B[BFF API Endpoints]
    end

    subgraph Backend & External Services
        C[Supabase BaaS <br>(Auth, Database, Storage)]
        D[Microsoft Graph API]
        E[Other 3rd Party APIs]
    end

    A -- HTTPS Request --> B
    B -- DB Connection/Auth --> C
    B -- Authenticated API Call --> D
    B -- Proxied API Call --> E

    style A fill:#f2f2f2,stroke:#333
    style B fill:#e6f7ff,stroke:#005f87
    style C fill:#e8f5e9,stroke:#2e7d32
    style D fill:#fff3e0,stroke:#ef6c00
    style E fill:#fff3e0,stroke:#ef6c00
```

### Kernentscheidungen

1.  **Architekturmuster: [Local-First mit optionaler Cloud-Synchronisation](../architecture/local-first-sync.md)**
    *   **Entscheidung:** Zustandsänderungen werden primär im `localStorage` des Browsers gespeichert. Eine optionale Synchronisation gleicht diese Daten mit Supabase ab.
    *   **Begründung:** Dieses Muster gewährleistet eine extrem schnelle, von der Netzwerklatenz unabhängige UI-Interaktion und ermöglicht eine grundlegende Offline-Nutzung. Die Cloud-Synchronisation dient als Erweiterung für Backup und Multi-Device-Nutzung, nicht als blockierende Abhängigkeit.

2.  **Architekturmuster: [Backend-for-Frontend (BFF)](../architecture/backend-for-frontend.md)**
    *   **Entscheidung:** Die serverseitige Logik ist in Form von SvelteKit Server-Routen implementiert, die als Fassade für externe Dienste und die Datenbank agieren.
    *   **Begründung:** Dieses Muster dient primär der Sicherheit und Abstraktion. Sensible API-Schlüssel und OAuth-Tokens werden serverseitig gehalten und niemals an den Client gesendet. Zudem werden CORS-Probleme umgangen und externe APIs abstrahiert.

3.  **Technologie-Entscheidung: SvelteKit auf Serverless (Cloudflare)**
    *   **Entscheidung:** Die Anwendung ist mit SvelteKit gebaut und für den Betrieb auf Cloudflare Pages/Workers konfiguriert.
    *   **Begründung:** Svelte 5 (Runes) ermöglicht eine hochreaktive und performante UI. Cloudflare als Deployment-Ziel bietet globale Skalierbarkeit, niedrige Latenz durch Edge-Computing und potenziell geringere Betriebskosten.

4.  **Datenmodell: [Flexibler Key-Value-Store](../architecture/data-model.md)**
    *   **Entscheidung:** Anstatt für jedes Widget eine eigene Datenbanktabelle anzulegen, werden alle benutzerspezifischen Konfigurationen und Geheimnisse in einer einzigen JSONB-Spalte in der [UserSecrets](../entities/user-secrets.md)-Entität gespeichert.
    *   **Begründung:** Dieses Design bietet maximale Flexibilität und Erweiterbarkeit. Neue Widgets können hinzugefügt werden, ohne dass Datenbankschema-Migrationen erforderlich sind, was die Entwicklung und Wartung erheblich vereinfacht.