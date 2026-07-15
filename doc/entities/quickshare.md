---
type: Entity
title: Quickshare
description: Ein temporärer, über einen Link zugänglicher, geteilter Inhalt.
tags: [entity, sharing, quickshare]
timestamp: 2024-05-23T10:00:00Z
---

Die `Quickshare`-Entität realisiert die Funktionalität zum schnellen Teilen von Inhalten (z.B. aus dem `ClipboardSync`-Widget) über einen eindeutigen, temporären Link.

### Attribute

-   `id`: Eine eindeutige, zufällig generierte ID, die Teil der Sharing-URL ist.
-   `user_id`: Fremdschlüssel, der auf den [User](./user.md) verweist, der den Inhalt geteilt hat.
-   `data`: Der zu teilende Inhalt.
-   `type`: Der Typ des Inhalts (z.B. `text`, `image`).
-   `name`: Ein optionaler Dateiname.
-   `expires_at`: Ein Zeitstempel, nach dem der geteilte Inhalt nicht mehr zugänglich ist.

### Beziehungen

-   **Gehört zu** einem [User](./user.md).
-   Ist lose mit einer Widget-Instanz über eine `service_id` verknüpft, um alte Links bei Aktualisierung der Quelldaten invalidieren zu können.

Die serverseitige Logik unter `/api/share` ist für die Erstellung und den Abruf dieser `Quickshare`-Einträge verantwortlich.