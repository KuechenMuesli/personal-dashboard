---
type: Architectural Pattern
title: Backend-for-Frontend (BFF)
description: Die Nutzung von SvelteKit Server-Routen als sichere Fassade für externe Dienste.
tags: [bff, security, api, architecture]
timestamp: 2024-05-23T10:00:00Z
---

Das Backend-for-Frontend (BFF) Muster wird durch die Server-Routen von SvelteKit implementiert. Diese agieren als eine sichere und spezialisierte Zwischenschicht zwischen dem Frontend und externen Diensten.

### Zweck und Vorteile

1.  **Sicherheit durch Kapselung:** Sensible Daten wie API-Schlüssel oder OAuth Refresh-Tokens werden serverseitig in der [UserSecrets](../entities/user-secrets.md) Entität gespeichert und verlassen niemals den Server. Die BFF-Endpunkte nutzen diese Geheimnisse, um Anfragen im Namen des Benutzers an Drittanbieter-APIs zu authentifizieren.

2.  **Abstraktion und Stabilität:** Das BFF entkoppelt das Frontend von den spezifischen Implementierungen externer APIs. Änderungen an einer externen API erfordern nur eine Anpassung im entsprechenden BFF-Endpunkt, nicht im gesamten Frontend-Code.

3.  **Umgehung von Browser-Beschränkungen:** Durch das Ausführen der Anfragen auf dem Server werden CORS-Probleme vermieden, die bei direkten Aufrufen von Drittanbieter-APIs aus dem Browser auftreten würden. Der [API-Proxy](../components/api-proxy.md) ist eine generalisierte Implementierung dieses Prinzips.

### Beispielfluss: Abruf von Microsoft To-Do Aufgaben

```mermaid
graph TD
    subgraph Client (Browser)
        A[Frontend Widget <br> (Todo.svelte)]
    end

    subgraph Server (BFF on Cloudflare)
        B[API Endpoint <br> (/api/ms-todo)]
        C[UserSecrets Storage <br> (via Supabase)]
    end

    subgraph External
        D[Microsoft Graph API]
    end

    A -- 1. GET /api/ms-todo --> B
    B -- 2. Reads Refresh Token --> C
    B -- 3. Authenticates against --> D
    D -- 4. Returns Todo Data --> B
    B -- 5. Forwards Data --> A

    linkStyle 0 stroke-width:2px,stroke:blue
    linkStyle 1 stroke-width:1px,stroke:grey,stroke-dasharray: 5 5
    linkStyle 2 stroke-width:2px,stroke:red
    linkStyle 3 stroke-width:2px,stroke:red
    linkStyle 4 stroke-width:2px,stroke:blue
```
Dieser Fluss zeigt, wie der Refresh-Token sicher auf dem Server verbleibt und nur vom BFF-Endpunkt verwendet wird.