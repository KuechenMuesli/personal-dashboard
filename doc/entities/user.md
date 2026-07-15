---
type: Entity
title: User
description: Die zentrale Benutzerentität, verwaltet von Supabase Auth.
tags: [entity, user, auth]
timestamp: 2024-05-23T10:00:00Z
---

Die `User`-Entität repräsentiert einen Benutzer der Anwendung. Sie wird im `auth.users`-Schema von Supabase verwaltet und durch eine eindeutige `UUID` identifiziert.

### Beziehungen

Ein `User` ist die Wurzel des Datenmodells für einen authentifizierten Benutzer:

-   **Besitzt** eine oder mehrere [Layouts](./layout.md) (Workspaces).
-   **Besitzt** genau einen [UserSecrets](./user-secrets.md)-Eintrag, der alle Konfigurationen und Geheimnisse enthält.
-   **Kann erstellen** null oder mehr [CustomThemes](./custom-theme.md).
-   **Kann erstellen** null oder mehr [Quickshares](./quickshare.md).

### Anonyme vs. Authentifizierte Benutzer

-   **Anonyme Benutzer:** Existieren nur im Kontext der Browser-Session. Ihre Daten werden ausschließlich im `localStorage` gespeichert. Es gibt keine `User`-Entität in der Datenbank.
-   **Authentifizierte Benutzer:** Werden nach der Anmeldung (E-Mail/Passwort, OAuth) in der `auth.users`-Tabelle von Supabase erstellt. Ihre `user_id` wird als Fremdschlüssel in allen zugehörigen Tabellen verwendet, um die Datenintegrität und Sicherheit durch Row-Level Security Policies zu gewährleisten.