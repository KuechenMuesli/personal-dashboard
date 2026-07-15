---
type: Entity
title: Layout (Workspace)
description: Repräsentiert ein spezifisches Dashboard-Setup eines Benutzers.
tags: [entity, layout, workspace]
timestamp: 2024-05-23T10:00:00Z
---

Ein `Layout` (im Frontend auch als "Workspace" bezeichnet) repräsentiert ein spezifisches Dashboard-Setup eines Benutzers, einschließlich der Anordnung der Widgets und des gewählten Themes.

### Attribute

-   `id`: Eindeutige UUID für das Layout.
-   `user_id`: Fremdschlüssel, der auf den [User](./user.md) verweist.
-   `layout_data`: Ein JSONB-Feld, das ein Array von [Widget](./widget.md)-Instanzen enthält. Jedes Objekt im Array definiert den Typ, die ID, die Position (x, y) und die Dimensionen (width, height) eines Widgets.
-   `theme_name`: Der Name des aktiven Themes (entweder ein vordefiniertes oder ein Verweis auf ein [CustomTheme](./custom-theme.md)).
-   `updated_at`: Zeitstempel der letzten Änderung, entscheidend für die [Synchronisationslogik](../architecture/local-first-sync.md).

### Beziehungen

-   **Gehört zu** genau einem [User](./user.md).
-   **Enthält** null oder mehr `StoredWidget`-Instanzen (als JSON-Daten).
-   **Referenziert** optional ein [CustomTheme](./custom-theme.md).