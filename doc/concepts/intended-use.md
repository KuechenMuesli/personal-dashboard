---
type: Concept
title: Intended Use
description: Der primäre Zweck und die Ziele der Personal Dashboard Anwendung.
tags: [purpose, goals, strategy]
timestamp: 2024-05-23T10:00:00Z
---

Der übergeordnete Zweck der Software ist die Bereitstellung eines hochgradig personalisierbaren, benutzerzentrierten **Personal Dashboards**. Dieses Dashboard dient als zentrale Anlaufstelle, die es dem Benutzer ermöglicht, relevante Informationen und Werkzeuge aus verschiedenen Quellen an einem Ort zu aggregieren und zu visualisieren.

### Primäre Ziele

1.  **Zentralisierung von Informationen**
    Die Anwendung dient als persönlicher "Single Point of Truth", indem sie Daten aus diversen externen Diensten (z.B. Microsoft Kalender, Apple Reminders, Finanz-APIs) und lokalen Eingaben zusammenführt. Dies wird durch ein modulares Widget-System realisiert.

2.  **Maximale Personalisierung und Kontrolle**
    Der Benutzer hat die volle Kontrolle über das Layout (Hinzufügen, Verschieben, Größe ändern von Widgets), die Funktionalität (Auswahl und Konfiguration von Widgets) und das Erscheinungsbild (Themes) seines Dashboards. Die Unterstützung für mehrere "Workspaces" ermöglicht die Erstellung kontextbezogener, voneinander unabhängiger Dashboards.

3.  **Effizienz und Produktivitätssteigerung**
    Die Software zielt darauf ab, alltägliche Aufgaben zu beschleunigen. Die [Smart Search Komponente](../components/smart-search.md) ermöglicht direkte Berechnungen, Einheitenumrechnungen und die Suche in aggregierten Daten, was den Wechsel zwischen verschiedenen Tools reduziert. Funktionen wie die Synchronisation der Zwischenablage unterstützen diesen Zweck.

4.  **Plattformunabhängigkeit und Datenhoheit**
    Die Anwendung ist nach dem [Local-First Prinzip](../architecture/local-first-sync.md) konzipiert. Sie funktioniert vollständig ohne Account (Daten werden nur lokal gespeichert) und bietet optional eine Cloud-Synchronisation für authentifizierte Benutzer. Dies gibt dem Benutzer die Wahl und Kontrolle über seine Daten.