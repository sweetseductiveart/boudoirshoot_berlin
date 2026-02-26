# Studio Buchungssystem - Setup-Anleitung

## Übersicht

Dieses System ermöglicht die Verwaltung von Buchungen für 14 Studios am 28. März 2026 über Google Calendar. Es bietet:

- Google OAuth Authentifizierung für autorisierte Nutzer
- Buchung von 30- oder 60-Minuten-Slots (max. 60 Minuten total pro Nutzer)
- Kollisionserkennung und Vermeidung von Doppelbuchungen
- Mehrere Ansichten: Gesamtübersicht, persönlicher Zeitplan, Studio-Ansicht, Druckansicht
- Automatische Synchronisation mit Google Calendar

## Voraussetzungen

1. Google Cloud Platform Account
2. Service Account mit Credentials (für automatisierte Kalender-Verwaltung)
3. Webserver für Hosting (z.B. GitHub Pages, Netlify, oder lokaler Server)

---

## 1. Google Cloud Platform Setup

### Schritt 1: Google Cloud Projekt erstellen

1. Gehen Sie zu [Google Cloud Console](https://console.cloud.google.com/)
2. Klicken Sie auf "Neues Projekt"
3. Projektname: `Studio-Buchungssystem`
4. Klicken Sie auf "Erstellen"

### Schritt 2: Google Calendar API aktivieren

1. Öffnen Sie das neue Projekt
2. Navigieren Sie zu **APIs & Services** > **Library**
3. Suchen Sie nach "Google Calendar API"
4. Klicken Sie auf "Enable"

### Schritt 3: OAuth 2.0 Client ID erstellen

1. Gehen Sie zu **APIs & Services** > **Credentials**
2. Klicken Sie auf **+ Create Credentials** > **OAuth client ID**
3. Falls noch nicht geschehen, konfigurieren Sie den OAuth consent screen:
   - User Type: **External**
   - App Name: `Studio Buchungssystem`
   - User support email: Ihre E-Mail
   - Developer contact: Ihre E-Mail
   - Scopes: Fügen Sie folgende Scopes hinzu:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Test users: Fügen Sie alle autorisierten Benutzer-E-Mails hinzu

4. Zurück zu Credentials > Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Studio Buchungssystem Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:8080` (für lokale Entwicklung)
     - `https://IhreDomain.github.io` (für GitHub Pages)
     - Weitere Domains nach Bedarf
   - Authorized redirect URIs:
     - `http://localhost:8080/booking.html`
     - `https://IhreDomain.github.io/booking.html`
   - Klicken Sie auf **Create**

5. **Client ID** kopieren und speichern

### Schritt 4: API Key erstellen

1. Gehen Sie zu **APIs & Services** > **Anmeldedaten**
2. Klicken Sie auf **+ Anmeldedaten erstellen** > **API-Schlüssel**
3. Im Dialog "API-Schlüssel erstellen" öffnet sich:

#### Dialog-Einstellungen:

**Name** (Optional):
- Geben Sie einen eindeutigen Namen ein, z.B. `Studio-Buchungssystem API Key`

**API-Aufrufe über ein Dienstkonto authentifizieren**:
- Lassen Sie dieses Kontrollkästchen **NICHT** aktiviert

**Anwendungseinschränkungen**:
- **Für Entwicklung (lokal)**: Wählen Sie **Keine**
- **Für Produktion**: Wählen Sie **Websites** und fügen Sie hinzu:
  - `http://localhost:8080`
  - `https://IhreDomain.github.io`
  - Weitere Domains nach Bedarf

**API-Einschränkungen**:
- Wählen Sie **Schlüssel einschränken**
- Aus der Dropdown-Liste **Google Calendar API** auswählen
- Klicken Sie auf **Erstellen**

4. Kopieren Sie den erstellten **API-Schlüssel** und speichern Sie ihn sicher
5. Fügen Sie den API-Schlüssel in `booking-config.js` ein:
   ```javascript
   GOOGLE_API_KEY: 'AIzaSyDxxxxxxxxxxxxxxxxxx...'
   ```

**⚠️ Sicherheitshinweis**: 
- Der API-Schlüssel wird am besten nicht in öffentlichen Repos (z.B. GitHub) gespeichert
- Für GitHub Pages: Erwägen Sie einen Backend-Proxy oder Firebase Cloud Functions
- Aktivieren Sie Domain-Restrictions um Missbrauch zu vermeiden

---

## 2. Google Calendar Setup

### Master-Kalender Architektur (Neu)

Dieses System verwendet einen **Master-Kalender** für alle 14 Zonen:

- ✅ **Einfach für Models/Fotografen**: Nur 1 Kalender statt 14
- ✅ **Read-Only für Nutzer**: Können den Kalender sehen, aber nicht direkt ändern
- ✅ **Sichere Änderungen**: Alle Buchungen erfolgen nur über das Buchungssystem
- ✅ **Zentrale Verwaltung**: Eine Stelle für alle Informationen

### Automatisches Setup (Empfohlen)

Das neue Setup-Script erstellt den Master-Kalender automatisch:

```bash
npm run setup
```

Das Script wird:
1. Automatisch einen neuen Master-Kalender erstellen
2. Die Kalender-ID in `booking-config.js` eintragen
3. Den Kalender als Besitzer zu dominik.suess@gmail.com übertragen

**Nach dem Setup:**
1. Du erhältst eine **Kalender-Einladung** an deine E-Mail
2. **Akzeptiere** die Einladung in Gmail
3. Der Kalender erscheint automatisch in Google Calendar ✅

### Manuelles Setup (Falls nötig)

Falls du den Kalender lieber manuell erstellen möchtest:

1. Gehen Sie zu [Google Calendar](https://calendar.google.com/)
2. Klicken Sie links auf **+** neben "Weitere Kalender"
3. Wählen Sie **Neuen Kalender erstellen**
4. Name: `Studio Buchungen - 28. März 2026`
5. Beschreibung: `Master-Kalender für alle 14 Studio-Zonen`
6. Klicken Sie auf **Kalender erstellen**

### Kalender-ID ermitteln (Manuell):

1. Klicken Sie auf den erstellten Kalender in der Liste
2. Klicken Sie auf die drei Punkte > **Einstellungen und Freigabe**
3. Scrollen Sie zu **Kalender integrieren**
4. Kopieren Sie die **Kalender-ID** (Format: `xyz123@group.calendar.google.com`)
5. Fügen Sie die ID in `booking-config.js` ein:
   ```javascript
   MASTER_CALENDAR_ID: 'IhreKalenderID@group.calendar.google.com'
   ```

### Kalender-Berechtigung einstellen:

**Wichtig**: Nur Read-Only für Models/Fotografen, damit sie die Übersicht sehen, aber das System alleine bucht.

1. Klicken Sie auf die Einstellungen des Kalenders
2. Scrollen Sie zu **Für bestimmte Personen freigeben**
3. Klicken Sie auf **+ Personen hinzufügen**
4. Fügen Sie die Benutzer-E-Mails hinzu
5. **Berechtigung**: Wählen Sie **Sehen** (nicht "Bearbeiten"!)
6. Klicken Sie auf **Senden**

---

## 3. Konfiguration der Anwendung

### Datei: `booking-config.js`

Öffnen Sie die Datei und ersetzen Sie folgende Werte:

```javascript
// Google Calendar API Configuration
GOOGLE_API_KEY: 'YOUR_API_KEY_HERE', // ← Ihr API Key
GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com', // ← Ihre Client ID

// Master Calendar
MASTER_CALENDAR_ID: 'IhreKalenderID@group.calendar.google.com' // ← Ihre Master Calendar ID
```

### Autorisierte Benutzer konfigurieren:

```javascript
AUTHORIZED_USERS: [
    {
        email: 'fotograf1@example.com', // ← Echte E-Mail-Adresse
        name: 'Max Mustermann',
        role: 'Fotograf'
    },
    {
        email: 'model1@example.com', // ← Echte E-Mail-Adresse
        name: 'Lisa Müller',
        role: 'Model'
    },
    // ... weitere Benutzer
]
```

**WICHTIG**: Nur E-Mail-Adressen in dieser Liste können sich anmelden und Buchungen vornehmen!

---

## 4. Deployment

### Setup durchführen

**Erste Schritte (Service Account + Master Calendar):**

```bash
# 1. Master-Kalender erstellen und mit Benutzer teilen
npm run setup

# 2. Browser öffnen
# https://calendar.google.com/
# → Du solltest "Studio Buchungen - 28. März 2026" sehen
```

**Das wars für das Setup!** Der Master-Kalender wird automatisch erstellt und mit Read-Only Berechtigungen geteilt.

### Option A: Lokaler Test

1. Starten Sie einen lokalen Webserver:
   ```bash
   npm run server
   ```

2. Öffnen Sie Browser: `http://localhost:8000/booking.html`

### Option B: GitHub Pages

1. Committen Sie alle Dateien:
   ```bash
   git add booking.html booking-config.js booking-script.js booking-styles.css
   git commit -m "Add booking system with master calendar"
   git push origin main
   ```

2. Aktivieren Sie GitHub Pages in Repository Settings
3. Öffnen Sie: `https://IhrUsername.github.io/IhrRepo/booking.html`

### Option C: Andere Hosting-Dienste

- **Netlify**: Drag & Drop der Dateien
- **Vercel**: Git-Integration
- **Firebase Hosting**: `firebase deploy`

---

## 5. Verwendung

### Anmeldung

1. Öffnen Sie die Buchungsseite
2. Klicken Sie auf **Mit Google anmelden**
3. Wählen Sie einen autorisierten Google Account aus
4. Gewähren Sie die angeforderten Berechtigungen

### Ansichten

#### **Gesamtübersicht**
- Zeigt alle 14 Studios mit ihren Buchungen
- Eigene Buchungen sind blau markiert
- Klick auf Buchung zeigt Details

#### **Meine Buchungen**
- Personalisierte Ansicht der eigenen Buchungen
- Dropdown zur Auswahl anderer Nutzer (für Admins)
- Tabellarische Übersicht mit Details

#### **Studio-Ansicht**
- Auswahl eines Studios aus Dropdown
- Zeitplan mit allen Slots (10:00 - 18:00)
- Formular zum Erstellen neuer Buchungen:
  - Startzeit wählen
  - Dauer wählen (30 oder 60 Min.)
  - Partner auswählen (Fotograf/Model)
  - Notizen hinzufügen

#### **Druckansicht**
- Auswahl: Einzelnes Studio oder alle Studios
- Druckfreundliches Layout
- Manuelle Eintragungsmöglichkeit für vor-Ort-Buchungen
- Ideal für laminierte Ausdrucke mit Folienstift

### Buchungen erstellen

1. Wechseln Sie zur **Studio-Ansicht**
2. Wählen Sie ein Studio aus
3. Füllen Sie das Buchungsformular aus:
   - **Startzeit**: Verfügbare Zeiten (grau = nicht verfügbar)
   - **Dauer**: 30 oder 60 Minuten
   - **Partner**: Auswahl aus autorisierten Nutzern
   - **Notizen**: Optional
4. Klicken Sie auf **Buchung erstellen**

### Buchungen löschen

1. Klicken Sie auf eine Buchung (in beliebiger Ansicht)
2. Im Modal klicken Sie auf **Buchung löschen**
3. Bestätigen Sie die Löschung
4. Nur eigene Buchungen können gelöscht werden

---

## 6. Regeln und Einschränkungen

Das System erzwingt automatisch folgende Regeln:

- ✅ Nur 30- oder 60-Minuten-Buchungen möglich
- ✅ Maximale Gesamtbuchungszeit pro Nutzer: 60 Minuten
- ✅ Keine parallelen Buchungen für denselben Nutzer
- ✅ Keine Überbuchung von Studios
- ✅ Buchungen nur zwischen 10:00 und 18:00 Uhr
- ✅ Zeitslots nur zur vollen/halben Stunde

Diese Regeln können in `booking-config.js` unter `RULES` angepasst werden.

---

## 7. Fehlerbehebung

### "Fehler beim Initialisieren der Google API"

- **Lösung**: Prüfen Sie API Key und Client ID in `booking-config.js`
- Stellen Sie sicher, dass die Google Calendar API aktiviert ist

### "Ihr Google-Account ist nicht autorisiert"

- **Lösung**: E-Mail-Adresse in `AUTHORIZED_USERS` in `booking-config.js` hinzufügen
- E-Mail muss auch als Test User im OAuth Consent Screen eingetragen sein

### "Fehler beim Laden der Buchungen"

- **Lösung**: Prüfen Sie Calendar IDs in `booking-config.js`
- Stellen Sie sicher, dass Kalender für den Benutzer freigegeben sind
- Überprüfen Sie OAuth Scopes

### Buchungen werden nicht angezeigt

- **Lösung**: Prüfen Sie, ob Datum korrekt ist (`2026-03-28`)
- Überprüfen Sie Zeitzone-Einstellungen
- Öffnen Sie Browser-Konsole (F12) für Fehlerdetails

### CORS-Fehler beim lokalen Testen

- **Lösung**: Verwenden Sie einen lokalen Webserver (siehe Deployment)
- Öffnen Sie Dateien nicht direkt mit `file://`

---

## 8. Erweiterte Konfiguration

### Zeitrahmen ändern

```javascript
EVENT_DATE: '2026-03-28',        // Datum ändern
EVENT_START_TIME: '09:00',       // Startzeit ändern
EVENT_END_TIME: '20:00',         // Endzeit ändern
```

### Slot-Intervall ändern

```javascript
SLOT_INTERVAL: 15, // Slots alle 15 Minuten statt 30
```

### Maximale Buchungszeit ändern

```javascript
MAX_TOTAL_BOOKING_TIME: 120, // 120 Minuten statt 60
```

### Parallele Buchungen erlauben

```javascript
ALLOW_PARALLEL_BOOKINGS: true, // Nutzer kann mehrere parallele Slots buchen
```

---

## 9. Sicherheitshinweise

- ⚠️ API Keys und Client IDs sollten in `booking-config.js` gespeichert werden
- ⚠️ Für GitHub Pages: Keine sensiblen Daten in öffentlichen Repos
- ⚠️ Verwenden Sie Domain-Restrictions für API Keys
- ⚠️ OAuth Consent Screen sollte nur autorisierte Test Users enthalten
- ⚠️ Regelmäßige Überprüfung der Zugriffsrechte auf Google Calendar

---

## 10. Support und Kontakt

Bei Problemen:

1. Überprüfen Sie die Browser-Konsole (F12) auf Fehlermeldungen
2. Prüfen Sie alle Konfigurationsschritte
3. Stellen Sie sicher, dass alle Google Cloud APIs aktiviert sind
4. Überprüfen Sie Kalender-Freigaben

---

## Zusammenfassung der Dateien

- **booking.html** - Hauptseite mit UI-Struktur
- **booking-config.js** - Konfiguration (API Keys, Studios, Benutzer, Master Calendar ID)
- **booking-script.js** - Hauptlogik und Google Calendar Integration
- **booking-styles.css** - Styling und responsive Design
- **setup-calendars-single.js** - Erstellt automatisch den Master-Kalender
- **setup-transfer-ownership.js** - Überträgt den Kalender als Besitzer
- **BOOKING-SETUP.md** - Diese Anleitung

**Im Produktivbetrieb nicht vergessen:**
- ⚠️ `service-account-key.json` **NICHT** in Git committen (steht in `.gitignore`)
- ⚠️ `.calendar-id.json` **NICHT** in Git committen (steht in `.gitignore`)

---

**Viel Erfolg mit dem Buchungssystem! 🎉**
