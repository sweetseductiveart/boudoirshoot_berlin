// Vercel Serverless Function - GET /api/get-config
// Returns decrypted AUTHORIZED_USERS from encrypted GitHub file
// Uses ENCRYPTION_SECRET from Vercel environment variables to decrypt

import crypto from 'crypto';

function decryptData(encryptedData, secret) {
    try {
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            crypto.scryptSync(secret, 'salt', 32),
            iv
        );
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt config');
    }
}

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
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        // Get secret from environment (only the secret, not the encrypted data)
        const secret = process.env.ENCRYPTION_SECRET;
        
        if (!secret) {
            console.error('Missing ENCRYPTION_SECRET environment variable');
            return res.status(500).json({ 
                success: false, 
                error: 'Server configuration error' 
            });
        }
        
        // Fetch encrypted data from GitHub raw content
        // This loads from the public GitHub repo
        const githubRawUrl = 'https://raw.githubusercontent.com/sweetseductiveart/boudoirshoot_berlin/main/config/authorized-users.encrypted.json';
        
        console.log('📥 Fetching encrypted config from GitHub...');
        const fetchResponse = await fetch(githubRawUrl);
        
        if (!fetchResponse.ok) {
            console.error(`Failed to fetch from GitHub: ${fetchResponse.status}`);
            throw new Error('Failed to load encrypted config from GitHub');
        }
        
        const encryptedFile = await fetchResponse.json();
        const encryptedData = encryptedFile.encrypted;
        
        if (!encryptedData) {
            throw new Error('Invalid encrypted config file format');
        }
        
        console.log('🔐 Decrypting config with ENCRYPTION_SECRET...');
        // Decrypt the data using the secret
        const decryptedData = decryptData(encryptedData, secret);
        console.log('📋 Decrypted data type:', typeof decryptedData);
        console.log('📋 Decrypted data keys:', Object.keys(decryptedData));
        
        // Extract users array and config object from decrypted data
        let authorizedUsers = [];
        let config = {};
        
        if (Array.isArray(decryptedData)) {
            // Old format: just an array of users
            console.log('✅ Using old format (array of users)');
            authorizedUsers = decryptedData;
        } else if (decryptedData.users && Array.isArray(decryptedData.users)) {
            // New format: { config: {...}, users: [...] }
            console.log('✅ Using new format (config + users)');
            authorizedUsers = decryptedData.users;
            config = decryptedData.config || {};
        } else {
            console.warn('⚠️ Unexpected decrypted data format, treating as array if possible');
            if (Array.isArray(decryptedData)) {
                authorizedUsers = decryptedData;
            }
        }
        
        console.log(`📨 Returning ${authorizedUsers.length} users`);
        
        // Return the decrypted config
        res.status(200).json({
            success: true,
            AUTHORIZED_USERS: authorizedUsers,
            CONFIG: config
        });
        
    } catch (error) {
        console.error('Error in get-config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
