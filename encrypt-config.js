#!/usr/bin/env node
// Encryption utility for AUTHORIZED_USERS
// Run: node encrypt-config.js
// 
// This script reads the unencrypted config/authorized-users.json file
// and generates an encrypted version for GitHub storage

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Encryption function

// Encryption function
function encryptData(data, secret) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        crypto.scryptSync(secret, 'salt', 32),
        iv
    );
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
}

// Main - run this script directly
const secret = process.argv[2];

if (!secret) {
    console.error('❌ Usage: node encrypt-config.js <SECRET>');
    console.error('Example: node encrypt-config.js "my-super-secret-key"');
    console.error('\nMake sure config/authorized-users.json exists with unencrypted user data.');
    process.exit(1);
}

try {
    // Read unencrypted config from file
    const configPath = path.join(__dirname, 'config', 'authorized-users.json');
    
    if (!fs.existsSync(configPath)) {
        console.error(`❌ File not found: ${configPath}`);
        console.error('Please create config/authorized-users.json with your user data first.');
        process.exit(1);
    }
    
    console.log(`📖 Reading config from: ${configPath}`);
    const configContent = fs.readFileSync(configPath, 'utf8');
    const configData = JSON.parse(configContent);
    
    // Extract the structure - it should be { config: {...}, users: [...] }
    const dataToEncrypt = configData;
    const userCount = configData.users ? configData.users.length : Array.isArray(configData) ? configData.length : 0;
    
    console.log(`✅ Loaded ${userCount} users`);
    
    const encrypted = encryptData(dataToEncrypt, secret);

    console.log('\n🔐 Config encrypted successfully!\n');
    console.log('Encrypted value for config/authorized-users.encrypted.json:\n');
    console.log(encrypted);
    
    // Also save to encrypted file automatically
    const encryptedPath = path.join(__dirname, 'config', 'authorized-users.encrypted.json');
    const encryptedContent = {
        encrypted: encrypted,
        generatedAt: new Date().toISOString(),
        userCount: userCount
    };
    
    fs.writeFileSync(encryptedPath, JSON.stringify(encryptedContent, null, 2));
    console.log(`\n💾 Saved to: ${encryptedPath}`);
    
    console.log('\n⚠️  Remember to set ENCRYPTION_SECRET in Vercel environment variables:');
    console.log(`   ENCRYPTION_SECRET=${secret}`);
    console.log('\n✅ Ready to deploy!\n');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

export { encryptData };
