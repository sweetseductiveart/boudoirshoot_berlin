// Vercel Serverless Function - POST /api/send-email
// Sends emails via Gmail API using Service Account

import { google } from 'googleapis';

const getServiceAccountAuth = () => {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    return new google.auth.GoogleAuth({
        credentials,
        scopes: [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/calendar.readonly'
        ]
    });
};

const createEmailMessage = (to, subject, body) => {
    const message = [
        `To: ${to}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        'Content-Transfer-Encoding: 7bit',
        `Subject: ${subject}`,
        '',
        body
    ].join('\n');

    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
};

export default async (req, res) => {
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
        const gmail = google.gmail({ version: 'v1', auth });

        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ success: false, error: 'to, subject, and body required' });
        }

        const emailMessage = createEmailMessage(to, subject, body);

        const response = await gmail.users.messages.send({
            userId: 'me',
            resource: { raw: emailMessage }
        });

        console.log('✅ Email sent successfully:', response.data.id);

        res.status(200).json({
            success: true,
            messageId: response.data.id
        });
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
