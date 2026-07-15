---
type: Component
title: API Proxy
description: Der serverseitige Endpunkt für das Proxying von Anfragen an whitelisted externe APIs.
tags: [component, proxy, security, bff]
timestamp: 2024-05-23T10:00:00Z
---

Der API-Proxy, implementiert unter `/api/proxy/+server.ts`, ist eine generalisierte Komponente des [Backend-for-Frontend (BFF)](../architecture/backend-for-frontend.md)-Musters. Er leitet Anfragen vom Frontend an externe APIs weiter.

### Zweck

-   **CORS-Umgehung:** Ermöglicht den Aufruf von APIs, die keine direkten Anfragen von Browsern erlauben.
-   **Geheimhaltung von Schlüsseln:** Ermöglicht das Hinzufügen von API-Schlüsseln auf der Serverseite, ohne sie im Frontend preiszugeben (obwohl in der aktuellen Implementierung der Schlüssel oft noch vom Client kommt und im [UserSecrets](../entities/user-secrets.md) gespeichert sein sollte).
-   **Caching:** Bietet eine Möglichkeit, Antworten von externen APIs serverseitig zu cachen.

### Sicherheitsmechanismus: SSRF-Schutz

Um Server-Side Request Forgery (SSRF)-Angriffe zu verhindern, bei denen ein Angreifer den Proxy missbrauchen könnte, um interne Netzwerkressourcen anzugreifen, enthält der Proxy eine Whitelist.

-   **Implementierung:** Eine `allowedPrefixes`-Liste in der `+server.ts`-Datei definiert, welche URL-Präfixe für Proxy-Anfragen erlaubt sind.
-   **Funktion:** Jede eingehende Proxy-Anfrage wird gegen diese Liste validiert. Anfragen an nicht-whitelisted URLs werden abgelehnt. Dies schränkt den potenziellen Missbrauch des Proxys erheblich ein.