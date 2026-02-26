// ============================================
// BOOKING SYSTEM CONFIGURATION
// ============================================

const BOOKING_CONFIG = {
    // Event Configuration
    EVENT_DATE: '2026-03-28',
    EVENT_START_TIME: '10:00',
    EVENT_END_TIME: '18:00',
    
    // Google Authentication Configuration
    // Nur für Identity-Verifikation (kein Kalender-Zugriff)
    GOOGLE_CLIENT_ID: '852794055520-sltiiejq082ef5q53uq777pv2hi8d51f.apps.googleusercontent.com',
    
    // Vercel API Configuration
    // Backend übernimmt alle Kalender-Operationen
    VERCEL_API_URL: 'https://boudoirshoot-berlin.vercel.app/api',
    
    // MASTER CALENDAR CONFIGURATION
    // Ein einzelner Master-Kalender für alle 14 Zonen
    // Nutzer erhalten Read-Only Zugriff, Änderungen erfolgen nur über das Buchungssystem
    MASTER_CALENDAR_ID: '1a899b209080a2018996025b1f12c25edeeac46999cd479d164a64b90633e4d1@group.calendar.google.com',
    
    // Studio Zones Configuration (14 Zonen in 3 Studios)
    // WICHTIG: Alle Zonen teilen sich einen Master-Kalender
    // Studio 1: Zone 1-6 (6 Zonen) - ROT/ORANGE Töne
    // Studio 3: Zone 1-4 (4 Zonen) - BLAU/LILA Töne
    // Studio 4: Zone 1-4 (4 Zonen) - GRÜN/TÜRKIS Töne
    STUDIOS: [
        {
            id: 'studio1_zone1',
            name: 'Studio 1 - Zone 1',
            studio: 'Studio 1',
            zone: 1,
            color: '#E74C3C'  // Dunkelrot
        },
        {
            id: 'studio1_zone2',
            name: 'Studio 1 - Zone 2',
            studio: 'Studio 1',
            zone: 2,
            color: '#EC7063'  // Rot-mittel
        },
        {
            id: 'studio1_zone3',
            name: 'Studio 1 - Zone 3',
            studio: 'Studio 1',
            zone: 3,
            color: '#F1948A'  // Rot-hell
        },
        {
            id: 'studio1_zone4',
            name: 'Studio 1 - Zone 4',
            studio: 'Studio 1',
            zone: 4,
            color: '#E67E22'  // Orange-dunkel
        },
        {
            id: 'studio1_zone5',
            name: 'Studio 1 - Zone 5',
            studio: 'Studio 1',
            zone: 5,
            color: '#F39C12'  // Orange-mittel
        },
        {
            id: 'studio1_zone6',
            name: 'Studio 1 - Zone 6',
            studio: 'Studio 1',
            zone: 6,
            color: '#F8B739'  // Orange-hell
        },
        {
            id: 'studio3_zone1',
            name: 'Studio 3 - Zone 1',
            studio: 'Studio 3',
            zone: 1,
            color: '#2E86DE'  // Blau-dunkel
        },
        {
            id: 'studio3_zone2',
            name: 'Studio 3 - Zone 2',
            studio: 'Studio 3',
            zone: 2,
            color: '#54A0FF'  // Blau-mittel
        },
        {
            id: 'studio3_zone3',
            name: 'Studio 3 - Zone 3',
            studio: 'Studio 3',
            zone: 3,
            color: '#8E44AD'  // Lila-dunkel
        },
        {
            id: 'studio3_zone4',
            name: 'Studio 3 - Zone 4',
            studio: 'Studio 3',
            zone: 4,
            color: '#A569BD'  // Lila-hell
        },
        {
            id: 'studio4_zone1',
            name: 'Studio 4 - Zone 1',
            studio: 'Studio 4',
            zone: 1,
            color: '#27AE60'  // Grün-dunkel
        },
        {
            id: 'studio4_zone2',
            name: 'Studio 4 - Zone 2',
            studio: 'Studio 4',
            zone: 2,
            color: '#52BE80'  // Grün-mittel
        },
        {
            id: 'studio4_zone3',
            name: 'Studio 4 - Zone 3',
            studio: 'Studio 4',
            zone: 3,
            color: '#16A085'  // Türkis-dunkel
        },
        {
            id: 'studio4_zone4',
            name: 'Studio 4 - Zone 4',
            studio: 'Studio 4',
            zone: 4,
            color: '#48C9B0'  // Türkis-hell
        }
    ],
    
    // Authorized Users Configuration
    // WICHTIG: Diese werden von der API (/api/get-config) geladen
    // Die Konfiguration ist verschlüsselt und wird vom Server entschlüsselt
    AUTHORIZED_USERS: [],  // Wird bei Login von API gefüllt
    
    // Booking Rules
    RULES: {
        MIN_DURATION: 30, // Minuten
        MAX_DURATION: 60, // Minuten
        MAX_TOTAL_BOOKING_TIME: 60, // Maximale Gesamtbuchungszeit pro Nutzer in Minuten
        SLOT_INTERVAL: 30, // Zeitslots in 30-Minuten-Intervallen
        ALLOW_PARALLEL_BOOKINGS: false, // Nutzer kann keine parallelen Slots buchen
        ALLOW_OVERBOOKING: false // Reservierte Slots können nicht überbucht werden
    }
};

// Time Slot Generator
function generateTimeSlots(startTime, endTime, interval) {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        slots.push(timeString);
        
        currentMin += interval;
        if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
        }
    }
    
    return slots;
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BOOKING_CONFIG, generateTimeSlots };
}
