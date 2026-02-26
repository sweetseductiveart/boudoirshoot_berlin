// Share Master Calendar with users from configuration
// Before running: Create .setup-config.json with user list

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
const MASTER_CALENDAR_ID = setupConfig.MASTER_CALENDAR_ID;

if (!MASTER_CALENDAR_ID) {
    console.error('❌ MASTER_CALENDAR_ID nicht in .setup-config.json gefunden!');
    process.exit(1);
}

async function shareCalendarWithUsers() {
    try {
        // Load credentials
        const credentials = JSON.parse(fs.readFileSync('credentials.json'));
        const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        
        // Load token
        const token = JSON.parse(fs.readFileSync('token.json'));
        oAuth2Client.setCredentials(token);
        
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        console.log(`\n📅 Teile Master-Kalender mit ${setupConfig.users.length} Benutzern...\n`);
        console.log(`   Kalender ID: ${MASTER_CALENDAR_ID}\n`);
        
        // Share with each user from config
        for (const user of setupConfig.users) {
            const aclRule = {
                scope: {
                    type: 'user',
                    value: user.email
                },
                role: user.role || 'reader'
            };
            
            try {
                await calendar.acl.insert({
                    calendarId: MASTER_CALENDAR_ID,
                    resource: aclRule
                });
                
                console.log(`✅ Kalender erfolgreich mit ${user.email} geteilt!`);
                console.log(`   Name: ${user.name}, Rolle: ${user.role}`);
                
            } catch (error) {
                if (error.code === 409) {
                    console.log(`⚠️  ${user.email} hat bereits Zugriff auf diesen Kalender.`);
                } else {
                    console.error(`❌ Fehler beim Teilen mit ${user.email}:`, error.message);
                }
            }
        }
        
        console.log(`\n✨ Kalender-Freigabe abgeschlossen!`);
        console.log(`💡 Benutzer können sich jetzt mit ihrer Email im Buchungssystem anmelden.`);
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Konfiguration:', error.message);
    }
}

shareCalendarWithUsers();
