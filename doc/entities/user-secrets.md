---
type: Entity
title: UserSecrets
description: Der flexible und sichere Speicher für alle benutzerspezifischen Konfigurationen und Geheimnisse.
tags: [entity, secrets, security, config]
timestamp: 2024-05-23T10:00:00Z
---

Die `UserSecrets`-Entität ist eine der wichtigsten Design-Entscheidungen für die Flexibilität und Sicherheit des Systems. Sie besteht aus einer einzigen Tabelle mit einer 1:1-Beziehung zum [User](./user.md).

### Struktur

-   `user_id`: Primärschlüssel und Fremdschlüssel zur `User`-Tabelle.
-   `secrets`: Ein einzelnes JSONB-Feld.

### Funktionsweise

Das `secrets`-Feld fungiert als flexibler Key-Value-Store für alle Daten, die benutzerspezifisch und potenziell sensibel sind.

-   **Schlüssel:** Die Schlüssel innerhalb des JSON-Objekts sind typischerweise die eindeutigen IDs der [Widget](./widget.md)-Instanzen oder globale Bezeichner (z.B. `global-todo-sync`).
-   **Werte:** Die Werte können beliebige JSON-Strukturen sein, z.B. API-Schlüssel, URLs für iFrame-Widgets, Filter-Einstellungen etc.

### Beispielhafter Inhalt des `secrets`-Feldes

```json
{
  "widget-uuid-123-stock": {
    "symbol": "AAPL"
  },
  "widget-uuid-456-parcel": {
    "apiKey": "parcel_api_key_encrypted_or_handled_by_bff",
    "trackingNumber": "123456789"
  },
  "global-msproxy-tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Vorteile

-   **Erweiterbarkeit:** Neue Widgets können hinzugefügt werden, ohne dass Datenbankmigrationen erforderlich sind. Sie legen ihre Konfiguration einfach unter ihrer ID im JSON-Objekt ab.
-   **Sicherheit:** Sensible Daten werden zentral an einem Ort gespeichert, auf den nur der Benutzer über RLS-Policies und das [BFF](../architecture/backend-for-frontend.md) zugreifen kann. Sie werden niemals direkt an das Frontend gesendet.