---
type: Entity
title: CustomTheme
description: Ein vom Benutzer erstelltes Theme zur visuellen Anpassung des Dashboards.
tags: [entity, theme, personalization]
timestamp: 2024-05-23T10:00:00Z
---

Ein `CustomTheme` ermöglicht es Benutzern, das Erscheinungsbild ihres Dashboards über die vordefinierten Themes hinaus anzupassen.

### Attribute

-   `id`: Eindeutige UUID für das Theme.
-   `user_id`: Fremdschlüssel, der auf den [User](./user.md) verweist, der das Theme erstellt hat.
-   `name`: Ein vom Benutzer vergebener Name für das Theme.
-   `theme_data`: Ein JSONB-Feld, das die CSS-Variablen (z.B. Farben, Schriftarten) als Key-Value-Paare speichert.

### Beziehungen

-   **Gehört zu** genau einem [User](./user.md).
-   **Kann referenziert werden** von einem oder mehreren [Layouts](./layout.md) desselben Benutzers.

Die `ThemeEditor.svelte`-Komponente im Frontend bietet die Benutzeroberfläche zum Erstellen und Bearbeiten dieser `CustomTheme`-Entitäten.