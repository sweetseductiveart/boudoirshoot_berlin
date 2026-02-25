# 🚀 Vercel Serverless Backend Setup

## Warum diese Änderung?

**Problem:** Frontend-only OAuth gibt Zugriff auf alle Kalender des Nutzers
**Lösung:** Vercel Serverless Functions mit Service Account haben nur Zugriff auf den Master-Kalender

## 📋 Voraussetzungen

- GitHub Account (kostenlos)
- Vercel Account (kostenlos, mit GitHub verbinden)
- Google Cloud Project (bereits vorhanden)

---

## 🔧 Setup-Schritte

### 1. Service Account erstellen (Google Cloud Console)

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
2. Wähle dein Projekt aus
3. Navigation: **IAM & Admin** → **Service Accounts**
4. Klick **+ CREATE SERVICE ACCOUNT**
5. Eingaben:
   - **Name:** `Booking System Backend`
   - **ID:** `booking-system-backend`
   - Klick **CREATE AND CONTINUE**
6. **Role:** Keine Rolle nötig (Skip)
7. Klick **DONE**

### 2. Service Account Key generieren

1. Klick auf den neu erstellten Service Account
2. Tab **KEYS** → **ADD KEY** → **Create new key**
3. Format: **JSON**
4. Key wird heruntergeladen (z.B. `booking-system-backend-xxx.json`)
5. ⚠️ **WICHTIG:** Diese Datei sicher aufbewahren, niemals ins Git committen!

### 3. Service Account Zugriff auf Kalender geben

1. Öffne [Google Calendar](https://calendar.google.com/)
2. Finde den Master-Kalender in der Seitenleiste
3. Klick auf **⋮** (drei Punkte) → **Settings and sharing**
4. Scrolle zu **Share with specific people**
5. Klick **+ Add people**
6. Email eingeben: `booking-system-backend@[PROJECT-ID].iam.gserviceaccount.com`
   - (Diese Email findest du auch in der JSON-Datei unter `client_email`)
7. Permission: **Make changes to events**
8. Klick **Send**

### 4. Vercel Account erstellen & Projekt verbinden

1. Gehe zu [vercel.com](https://vercel.com/)
2. Klick **Sign Up** → **Continue with GitHub**
3. Autorisiere Vercel für GitHub
4. Dashboard: Klick **Add New...** → **Project**
5. Importiere das Repository: `boudoir_event_site_github_pages`
6. **Framework Preset:** Keine (Other)
7. **Build Settings:**
   - Build Command: *leer lassen*
   - Output Directory: `.` (Punkt)
   - Install Command: `npm install`
8. Klick **Deploy** (wird erstmal fehlschlagen - das ist ok!)

### 5. Environment Variables in Vercel setzen

1. Im Vercel Dashboard: Gehe zu deinem Projekt
2. Tab **Settings** → **Environment Variables**
3. Füge hinzu:

#### Variable 1: GOOGLE_SERVICE_ACCOUNT_KEY
- **Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Value:** Der komplette Inhalt der JSON-Datei (alles zwischen `{` und `}`)
  ```json
  {
    "type": "service_account",
    "project_id": "...",
    "private_key_id": "...",
    ...
  }
  ```
- **Environment:** Production, Preview, Development (alle auswählen)

#### Variable 2: MASTER_CALENDAR_ID
- **Name:** `MASTER_CALENDAR_ID`
- **Value:** `1a899b209080a2018996025b1f12c25edeeac46999cd479d164a64b90633e4d1@group.calendar.google.com`
- **Environment:** Production, Preview, Development (alle auswählen)

4. Klick **Save** bei beiden

### 6. Neues Deployment auslösen

1. Tab **Deployments**
2. Klick auf das letzte Deployment → **⋮** → **Redeploy**
3. Warte bis Status **Ready** ist (~2 Min)

### 7. API URL notieren

Nach erfolgreichem Deployment:
- Deine API URL ist: `https://[DEIN-PROJEKT-NAME].vercel.app/api/`
- Teste: `https://[DEIN-PROJEKT-NAME].vercel.app/api/bookings`

### 8. Frontend anpassen

Die API URL muss ins Frontend eingetragen werden:

**In `booking-config.js` hinzufügen:**
```javascript
// Vercel API Base URL
VERCEL_API_URL: 'https://[DEIN-PROJEKT-NAME].vercel.app/api',
```

Dann in `booking-script.js` die Calendar API Calls durch Vercel API ersetzen (siehe nächster Schritt).

---

## 🔄 Frontend-Änderungen

Das Frontend muss angepasst werden, um die Vercel API statt direkte Calendar API zu nutzen:

1. **Kein OAuth mehr nötig** für Calendar-Zugriff
2. Nur noch **Google Sign-In** für Identität
3. API-Calls gehen zu Vercel Functions

Die Code-Änderungen folgen im nächsten Schritt.

---

## ✅ Vorteile dieser Lösung

✅ **Sicherheit:** Service Account hat nur Zugriff auf Master-Kalender
✅ **Privacy:** Nutzer müssen keine Calendar-Berechtigungen erteilen
✅ **Einfachheit:** Nutzer sehen nur "Sign in with Google" (keine beängstigenden Berechtigungen)
✅ **Kostenlos:** Vercel Free Tier reicht für dieses Event
✅ **Zero Server Management:** Alles serverless
✅ **Auto-Deployment:** Push to GitHub → Automatisch deployed

---

## 🆘 Troubleshooting

**Problem:** API gibt 500 Error
- Lösung: Check Environment Variables in Vercel Settings
- Service Account JSON korrekt kopiert?
- MASTER_CALENDAR_ID korrekt?

**Problem:** "Permission denied" Fehler
- Lösung: Service Account muss im Google Calendar als "Make changes to events" freigegeben sein

**Problem:** CORS Fehler
- Lösung: Sollte nicht passieren, da CORS Headers in allen API Functions gesetzt sind
- Falls doch: Origin in Vercel Settings checken

---

## 📊 Kostenübersicht (Vercel Free Tier)

- ✅ **100 GB Bandwidth/Monat:** Mehr als genug
- ✅ **100 GB-Std Function Execution:** ~100.000 API Calls
- ✅ **100 Deployments/Tag:** Unlimitiert für dieses Projekt
- ✅ **Unbegrenzte Preview Deployments**
- 💡 **Für dieses Event:** Komplett kostenlos nutzbar

---

## 🎯 Nächster Schritt

Sobald Vercel deployed ist und die API URLs funktionieren:
→ Ich passe das Frontend an, um die neuen API Endpoints zu nutzen
