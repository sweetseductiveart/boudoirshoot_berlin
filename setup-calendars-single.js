const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load PII configuration from .setup-config.json (NOT checked into git)
const setupConfigPath = path.join(__dirname, '.setup-config.json');
if (!fs.existsSync(setupConfigPath)) {
    console.error('❌ Fehler: .setup-config.json nicht gefunden!');
    console.error('📝 Bitte erstellen Sie .setup-config.json mit den erforderlichen Konfigurationen.');
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

async function createMasterCalendar() {
    try {
        console.log('🚀 Erstelle Master-Kalender...\n');

        const calendarResource = {
            summary: setupConfig.calendarName,
            description: setupConfig.calendarDescription,
            timeZone: setupConfig.timeZone
        };

        const response = await calendar.calendars.insert({
            requestBody: calendarResource
        });

        const calendarId = response.data.id;
        console.log('✅ Master-Kalender erfolgreich erstellt!');
        console.log(`   Kalender-ID: ${calendarId}\n`);

        // Save to .calendar-id.json for later sharing
        const calendarIdData = {
            name: setupConfig.calendarName,
            calendarId: calendarId,
            description: setupConfig.calendarDescription,
            createdAt: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(__dirname, '.calendar-id.json'),
            JSON.stringify(calendarIdData, null, 2)
        );

        console.log('💾 Kalender-ID gespeichert in .calendar-id.json');

        // Update booking-config.js
        updateBookingConfig(calendarId);

        console.log('\n✨ Setup abgeschlossen!');
        console.log('   Nächster Schritt: npm run setup:share');

    } catch (error) {
        console.error('❌ Fehler beim Erstellen des Kalenders:');
        console.error(error.message);
        process.exit(1);
    }
}

function updateBookingConfig(calendarId) {
    const configPath = path.join(__dirname, 'booking-config.js');
    let configContent = fs.readFileSync(configPath, 'utf-8');

    // Replace the MASTER_CALENDAR_ID
    configContent = configContent.replace(
        /MASTER_CALENDAR_ID:\s*['"][^'"]*['"]/,
        `MASTER_CALENDAR_ID: '${calendarId}'`
    );

    fs.writeFileSync(configPath, configContent);
    console.log('📝 booking-config.js aktualisiert mit Master-Kalender-ID\n');
}

createMasterCalendar();
