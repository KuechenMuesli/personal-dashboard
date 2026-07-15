---
type: Data Model
title: Core Data Model and Relationships
description: Die primären Datenentitäten und ihre Beziehungen im Supabase-Schema.
tags: [database, schema, erd, data]
timestamp: 2024-05-23T10:00:00Z
---

Das Datenmodell ist auf Flexibilität und Skalierbarkeit ausgelegt. Es kombiniert relationale Tabellen für klar strukturierte Daten mit JSONB-Feldern für flexible, semi-strukturierte Konfigurationen. Die Datenisolation wird durch Row-Level Security (RLS) Policies in Supabase sichergestellt.

### Entity-Relationship-Diagramm (Physisches Modell)

Das Diagramm zeigt die primären SQL-Tabellen und ihre Beziehungen.

```mermaid
erDiagram
    USER {
        uuid id PK "Supabase Auth User"
    }
    LAYOUT {
        uuid id PK
        uuid user_id FK
        jsonb layout_data "Stores widget instances, positions, sizes"
        text theme_name
        timestamp updated_at
    }
    USER_SECRETS {
        uuid user_id PK, FK
        jsonb secrets "Key-value store for API keys and widget configs"
    }
    CUSTOM_THEMES {
        uuid id PK
        uuid user_id FK
        text name
        jsonb theme_data "CSS variables"
    }

    USER ||--|{ LAYOUT : "owns"
    USER ||--o| USER_SECRETS : "has"
    USER ||--|{ CUSTOM_THEMES : "creates"

    LAYOUT }o--|| CUSTOM_THEMES : "references"
```

### Logische vs. Physische Entitäten

-   **Physische Entitäten:** Die oben gezeigten Tabellen (`USER`, `LAYOUT`, `USER_SECRETS`, `CUSTOM_THEMES`) existieren physisch in der PostgreSQL-Datenbank.
-   **Logische Entitäten:** Konzepte wie `StoredWidget` sind logische Entitäten. Eine `StoredWidget`-Instanz wird nicht in einer eigenen Tabelle gespeichert, sondern als JSON-Objekt innerhalb des `layout_data` JSONB-Feldes der [Layout](../entities/layout.md)-Tabelle.

### Design-Begründung

-   **`LAYOUT.layout_data` (JSONB):** Speichert ein Array von Widget-Instanzen. Dies ermöglicht flexible Layout-Änderungen ohne Schema-Migrationen.
-   **`USER_SECRETS.secrets` (JSONB):** Dient als flexibler und sicherer "Tresor" für alle Widget-Konfigurationen und API-Schlüssel. Der Schlüssel im JSON-Objekt ist typischerweise die ID der Widget-Instanz. Dieses Design ist entscheidend für die einfache Erweiterbarkeit des Systems um neue Widgets. Siehe [UserSecrets](../entities/user-secrets.md) für Details.