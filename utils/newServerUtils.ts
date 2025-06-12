import canonicalize from 'canonicalize'; // Support JSON canonicalization
import crypto from 'crypto'; // Support P-256 signing

// Replace this with your private key from the Dashboard
// const PRIVY_AUTHORIZATION_KEY = 'wallet-auth:MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgxds08orzQiYYUZ1IJ9xtMtD70dx2I0uAJiPmMEkzvhKhRANCAATB327b8zd+tQ46UeBRdzz6O6uEzXm8uJwH/nTyN3fQ+GnUkEvYcQggV5gQiqK459lpmDiagpDcE1maLPaj5Y2N';
// ...

export function getAuthorizationSignature({ url, body, method = "POST" }: any) {
  const PRIVY_SIGNING_KEY = process.env.PRIVY_SIGNING_KEY as string;

  const payload = {
    version: 1,
    method,
    url,
    body,
    headers: {
        "privy-app-id": process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    }
  };

  // JSON-canonicalize the payload and convert it to a buffer
  const serializedPayload = canonicalize(payload) as string;
  const serializedPayloadBuffer = Buffer.from(serializedPayload);

  // Replace this with your app's authorization key. We remove the 'wallet-auth:' prefix
  // from the key before using it to sign requests
  const privateKeyAsString = PRIVY_SIGNING_KEY.replace('wallet-auth:', '');

  // Convert your private key to PEM format, and instantiate a node crypto KeyObject for it
  const privateKeyAsPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyAsString}\n-----END PRIVATE KEY-----`;
  const privateKey = crypto.createPrivateKey({
    key: privateKeyAsPem,
    format: 'pem'
  });

  // Sign the payload buffer with your private key and serialize the signature to a base64 string
  const signatureBuffer = crypto.sign('sha256', serializedPayloadBuffer, privateKey);
  const signature = signatureBuffer.toString('base64');
  console.log('Generated signature:', signature);
  return signature;
}
