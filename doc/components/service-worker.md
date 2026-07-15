---
type: Component
title: Service Worker (PWA)
description: Implementierung von Offline-Fähigkeiten und Caching-Strategien.
tags: [component, pwa, offline, service-worker]
timestamp: 2024-05-23T10:00:00Z
---

Die Anwendung implementiert einen Service Worker (`src/service-worker.ts`), um als Progressive Web App (PWA) zu fungieren. Dies verbessert die Ladezeiten und ermöglicht eine grundlegende Offline-Nutzung.

### Caching-Strategien

Der Service Worker verwendet unterschiedliche Strategien für verschiedene Arten von Ressourcen:

1.  **Cache First (für statische Assets):**
    -   **Betrifft:** Build-Artefakte, Schriften, statische App-Dateien.
    -   **Strategie:** Anfragen für diese Ressourcen werden zuerst aus dem Cache bedient. Nur wenn die Ressource nicht im Cache ist, wird eine Netzwerkanfrage gestellt. Dies sorgt für extrem schnelle Ladezeiten bei wiederholten Besuchen.

2.  **Network First mit Cache-Fallback (für dynamische Seiten):**
    -   **Betrifft:** Seiten-Navigationen und dynamische Inhalte.
    -   **Strategie:** Der Service Worker versucht zuerst, die neueste Version der Seite aus dem Netzwerk abzurufen. Schlägt dies fehl (z.B. im Offline-Modus), wird auf die zuletzt im Cache gespeicherte Version zurückgegriffen.
    -   **Ergebnis:** Dies stellt sicher, dass der Benutzer immer die aktuellsten Daten sieht, wenn er online ist, aber dennoch eine funktionierende (wenn auch potenziell veraltete) Version der App hat, wenn er offline ist. Dies ergänzt die [Local-First-Architektur](../architecture/local-first-sync.md) auf der Datenebene.