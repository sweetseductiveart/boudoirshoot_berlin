# Calendar Setup Anleitung

## Setup Configuration (PII Management)

⚠️ **WICHTIG - Sicherheit:**

Die Scripts laden PII (E-Mail-Adressen, Namen) aus einer separaten Datei, die **NICHT in Git eingecheckt wird**:

```bash
# Template (kann sicher in Git liegen):
.setup-config.example.json

# Deine lokale PII-Konfiguration (wird NICHT eingecheckt):
.setup-config.json
```

### Setup-Konfiguration erstellen

1. Kopiere `.setup-config.example.json` zu `.setup-config.json`:
   ```bash
   cp .setup-config.example.json .setup-config.json
   ```

2. Bearbeite `.setup-config.json` mit deinen Daten:
   ```json
   {
     "MASTER_CALENDAR_ID": "deine-calendar-id@group.calendar.google.com",
     "calendarName": "Studio Buchungen - 28. März 2026",
     "calendarDescription": "Master-Kalender für alle Studios",
     "timeZone": "Europe/Zurich",
     "users": [
       {
         "email": "dominik.suess@gmail.com",
         "name": "Dominik Süss",
         "role": "owner"
       },
       {
         "email": "nale270788@gmail.com",
         "name": "Nale",
         "role": "reader"
       }
     ]
   }
   ```

3. Die Datei wird durch `.gitignore` geschützt - sie wird nicht eingecheckt ✅

## Automatisches Setup ausführen

Das Setup ist in zwei separate Schritte aufgeteilt für mehr Sicherheit:

1. **Schritt 1**: Kalender erstellen
2. **Schritt 2**: Kalender mit Benutzern teilen

### Installation & Ausführung

```bash
# 1. Dependencies installieren (einmalig)
npm install

# 2. Konfiguration erstellen (einmalig)
cp .setup-config.example.json .setup-config.json
# → Bearbeite .setup-config.json mit deinen Daten

# 3a. NUR Kalender erstellen
npm run setup:create

# 3b. Kalender mit Benutzern teilen
npm run setup:share

# ODER beide zusammen:
npm run setup
```

### Was die Scripts machen

#### `setup-calendars-single.js` - Kalender erstellen

1. ✅ **Liest Konfiguration** aus `.setup-config.json`
2. ✅ **Erstellt Master-Kalender** mit Daten aus der Konfiguration
3. ✅ **Speichert Calendar-ID** in `.calendar-id.json` (für nächste Steps)

### Schritt-für-Schritt

```bash
# Im Verzeichnis mit den Dateien:
cd c:\Users\domin\Documents\boudoir_event_site_github_pages

# 1. Dependencies installieren (nur einmal nötig)
npm install

# 2. Kalender erstellen
npm run setup:create

# 3. Mit Benutzern teilen
npm run setup:share
```

### Output-Beispiel

```
🚀 Starten der Kalender-Erstellung...

📅 Erstelle 14 Kalender...
  Erstelle Studio 1 - Zone 1... ✅
  Erstelle Studio 1 - Zone 2... ✅
  ...

✅ 14 Kalender erfolgreich erstellt!

📝 Aktualisiere booking-config.js...
✅ booking-config.js erfolgreich aktualisiert!

💾 Calendar IDs gespeichert in .calendar-ids.json

📌 NÄCHSTER SCHRITT:
Führe jetzt aus:
  npm run setup:share
```

Dann:

```
🚀 Starten der Kalender-Freigabe...

👥 Teile 14 Kalender mit 10 Benutzern...
   Das sind 140 Freigaben!

📌 Studio 1 - Zone 1:
    fotograf1@example.com... ✅
    fotograf2@example.com... ✅
    ...

✨ Kalender-Freigabe abgeschlossen!
```

### Fehlerbehandlung

**Fehler: "service-account-key.json nicht gefunden"**
- Stelle sicher, dass die JSON-Datei im gleichen Verzeichnis wie die Scripts liegt

**Fehler: ".calendar-ids.json nicht gefunden"**
- Führe erst `npm run setup:create` aus

**Fehler: "Permission denied" oder "Insufficient Permissions"**
- Überprüfe, dass der Service Account die Berechtigung "Editor" hat
- Ggf. die JSON-Datei neu generieren

### Nach dem Setup

1. Öffne [Google Calendar](https://calendar.google.com/)
2. Du solltest alle 14 neuen Kalender sehen
3. Überprüfe, dass alle Kalender mit den autorisierten Nutzern geteilt sind
4. Öffne `booking.html` und teste das Buchungssystem

### Cleanup (Sicherheit)

Nach erfolgreichem Setup solltest du diese Dateien löschen oder sichern:

```bash
# Lösche den Service Account Key
del service-account-key.json

# Lösche die temporäre Calendar-IDs Datei (Optional - wird nicht eingecheckt)
del .calendar-ids.json
```

### Manuelles Setup (falls Script nicht funktioniert)

Falls die Scripts nicht funktionieren, kannst du die Kalender auch manuell erstellen:
1. Gehe zu [Google Calendar](https://calendar.google.com/)
2. Erstelle 14 neue Kalender (Namen siehe oben)
3. Kopiere die Calendar IDs in `booking-config.js`
4. Teile die Kalender manuell mit deinen Nutzern

Siehe auch: [BOOKING-SETUP.md](BOOKING-SETUP.md) für das manuelle Setup.
