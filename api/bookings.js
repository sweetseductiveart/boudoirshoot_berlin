// Vercel Serverless Function - GET /api/bookings
// Liest alle Buchungen aus dem Master-Kalender

const { google } = require('googleapis');

// Service Account Credentials aus Environment Variables
const getServiceAccountAuth = () => {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.events']
    });
};

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        const auth = getServiceAccountAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        
        const { timeMin, timeMax } = req.query;
        const calendarId = process.env.MASTER_CALENDAR_ID;
        
        const response = await calendar.events.list({
            calendarId,
            timeMin: timeMin || new Date().toISOString(),
            timeMax,
            singleEvents: true,
            orderBy: 'startTime'
        });
        
        res.status(200).json({
            success: true,
            events: response.data.items
        });
        
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
