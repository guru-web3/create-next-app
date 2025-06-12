"use server";
import canonicalize from "canonicalize";
import { createPrivateKey, sign } from "crypto";

// Function to generate the authorization signature
export function getAuthorizationSignature({ url, body, method = "POST" }: any) {
  const PRIVY_SIGNING_KEY = process.env.PRIVY_AUTH_KEY as string;
  // const PRIVY_SIGNING_KEY = process.env.PRIVY_SIGNING_KEY as string;

  // Format the private key as PEM
  const privateKeyAsPem = `-----BEGIN PRIVATE KEY-----\n${PRIVY_SIGNING_KEY}\n-----END PRIVATE KEY-----`;

  try {
    const privateKey = createPrivateKey({
      key: privateKeyAsPem,
      format: "pem",
    });

    // Create the payload object according to Privy's requirements
    const payload = {
      version: 1,
      method,
      url,
      body,
      headers: {
        "privy-app-id": process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      },
    };

    // Canonicalize the payload to ensure consistent serialization
    const serializedPayload = canonicalize(payload);
    const serializedPayloadBuffer = Buffer.from(serializedPayload as string);

    // Sign the payload
    const signatureBuffer = sign("sha256", serializedPayloadBuffer, privateKey);

    return signatureBuffer.toString("base64");
  } catch (error) {
    console.error("Error generating signature:", error);
    throw error;
  }
}
