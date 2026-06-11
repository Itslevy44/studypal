export async function getMpesaToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa credentials not configured');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const url = process.env.MPESA_ENVIRONMENT === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // always fetch fresh token — caching can cause stale/error responses
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[M-Pesa] Auth failed. Status:', response.status, 'Body:', errorText);
      throw new Error(`M-Pesa Authentication failed: ${response.status} — ${errorText}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      console.error('[M-Pesa] Auth response missing access_token:', JSON.stringify(data));
      throw new Error('M-Pesa returned no access token');
    }

    console.log('[M-Pesa] Token obtained successfully');
    return data.access_token;
  } catch (error) {
    console.error('[M-Pesa] Error getting token:', error);
    throw error;
  }
}

export function generatePassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

export function generateTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}`;
}
