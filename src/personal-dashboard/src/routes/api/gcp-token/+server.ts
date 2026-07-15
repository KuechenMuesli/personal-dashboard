import { json } from '@sveltejs/kit';
import crypto from 'crypto';

export async function POST({ request }) {
    try {
        const { serviceAccount } = await request.json();
        
        if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
            return json({ error: "Invalid Service Account JSON" }, { status: 400 });
        }
        
        const header = { alg: 'RS256', typ: 'JWT' };
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 3600;
        const payload = {
            iss: serviceAccount.client_email,
            sub: serviceAccount.client_email,
            aud: 'https://oauth2.googleapis.com/token',
            iat,
            exp,
            scope: 'https://www.googleapis.com/auth/cloud-platform'
        };
        
        const encodeBase64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
        const signatureInput = `${encodeBase64(header)}.${encodeBase64(payload)}`;
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signatureInput);
        const signature = sign.sign(serviceAccount.private_key, 'base64url');
        const jwt = `${signatureInput}.${signature}`;
        
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
        });
        
        const data = await res.json();
        if (!res.ok) {
            return json({ error: data.error_description || data.error }, { status: res.status });
        }
        
        return json({ access_token: data.access_token, expires_in: data.expires_in });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
