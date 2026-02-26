const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load PII configuration from .setup-config.json (NOT checked into git)
const setupConfigPath = path.join(__dirname, '.setup-config.json');
if (!fs.existsSync(setupConfigPath)) {
    console.error('❌ Fehler: .setup-config.json nicht gefunden!');
    console.error('📝 Bitte erstellen Sie .setup-config.json mit Konfigurationen.');
    process.exit(1);
}

const setupConfig = JSON.parse(fs.readFileSync(setupConfigPath, 'utf-8'));

// Service Account Credentials
const SERVICE_ACCOUNT_KEY = require('./service-account-key.json');

const calendar = google.calendar({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
        credentials: SERVICE_ACCOUNT_KEY,
        scopes: ['https://www.googleapis.com/auth/calendar']
    })
});

// Load calendar ID from .calendar-id.json
const calendarIdPath = path.join(__dirname, '.calendar-id.json');

if (!fs.existsSync(calendarIdPath)) {
    console.error('❌ Fehler: .calendar-id.json nicht gefunden!');
    console.error('📝 Bitte führen Sie erst setup-calendars-single.js aus.');
    process.exit(1);
}

const calendarIdData = JSON.parse(fs.readFileSync(calendarIdPath, 'utf-8'));
const calendarId = calendarIdData.calendarId;

// Get owner user from config
const ownerUser = setupConfig.users.find(u => u.role === 'owner');
if (!ownerUser) {
    console.error('❌ Fehler: Kein Owner in .setup-config.json definiert!');
    process.exit(1);
}

async function makeUserOwner() {
    try {
        console.log(`🔄 Übertrage Kalender-Besitztum an ${ownerUser.email}...\n`);
        console.log(`📌 Kalender: ${calendarIdData.name}`);
        console.log(`   ${calendarId}\n`);

        // Step 1: Add user as owner (not just reader)
        console.log(`1️⃣  Füge ${ownerUser.email} als BESITZER hinzu...`);
        
        const acl = await calendar.acl.insert({
            calendarId: calendarId,
            requestBody: {
                role: 'owner',  // 'owner' role, not 'reader'
                scope: {
                    type: 'user',
                    value: ownerUser.email
                }
            }
        });

        console.log('   ✅ Erfolgreich als Besitzer hinzugefügt\n');

        console.log('✨ Kalender-Übertragung abgeschlossen!\n');
        console.log('📝 Was jetzt passiert:');
        console.log('   1. dominik.suess@gmail.com erhält eine Einladung');
        console.log('   2. Nach Annahme erscheint der Kalender im persönlichen Account');
        console.log('   3. Der Service Account behält vollen Zugriff');
        console.log('   4. Du kannst Buchungen via API automatisieren\n');
        console.log('💡 Tipp: Öffne deine E-Mail und akzeptiere die Kalender-Einladung!');

    } catch (error) {
        if (error.message.includes('Calendar usage limits exceeded')) {
            console.log('   ⚠️  Rate Limit erreicht. Versuche es in 1-2 Stunden nochmal!');
            console.log(`   Befehl: npm run setup:transfer`);
        } else if (error.message.includes('Already exists')) {
            console.log('   ℹ️  Nutzer ist bereits als Besitzer hinzugefügt!');
            console.log('   Überprüfe deine E-Mail-Einladungen (dominik.suess@gmail.com)');
        } else {
            console.error('   ❌ Fehler:', error.message);
        }
    }
}

makeUserOwner();
