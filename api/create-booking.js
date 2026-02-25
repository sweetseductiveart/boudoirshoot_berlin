// Vercel Serverless Function - POST /api/create-booking
// Erstellt eine neue Buchung im Master-Kalender

const { google } = require('googleapis');

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
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const auth = getServiceAccountAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.MASTER_CALENDAR_ID;
        
        const { event } = req.body;
        
        if (!event) {
            return res.status(400).json({ success: false, error: 'Event data required' });
        }
        
        const response = await calendar.events.insert({
            calendarId,
            resource: event
        });
        
        res.status(200).json({
            success: true,
            event: response.data
        });
        
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
