import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
// import { getAuthorizationSignature } from "../../utils/serverUtils";
import { getAuthorizationSignature } from "../../utils/newServerUtils";
import withCors from "../../utils/corsMiddleware";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get Privy app credentials
    const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      return res.status(500).json({
        error: "Server misconfiguration: Missing Privy credentials",
      });
    }

    // Authorization header (Basic auth using app_id:api_key)
    const authString = `${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`;
    const base64Auth = Buffer.from(authString).toString("base64");
    const basicAuthHeader = `Basic ${base64Auth}`;
    console.log("Basic Auth Header:", basicAuthHeader);
    // Extract request parameters
    const { walletId, address, publicKey } = req.body;

    if (!walletId || !address) {
      return res.status(400).json({
        error: "Missing required fields: walletId and address are required",
      });
    }

    if (!publicKey) {
      return res.status(400).json({
        error: "Missing required field: publicKey is required for encryption",
      });
    }

    try {
      // Construct the URL for wallet export
      const url = `https://auth.privy.io/v1/wallets/${walletId}/export`;

      // Request body with the client-supplied public key
      const body = {
        encryption_type: "HPKE",
        recipient_public_key: publicKey,
      };

      // Generate the signature
      const signature = getAuthorizationSignature({
        url,
        body,
        method: "POST",
      });
      console.log("Generated export signature:", signature);

      // Make the API call to export the wallet
      console.log("Export wallet response:", url, body);
      const response = await axios({
        method: "POST",
        url,
        headers: {
          Authorization: basicAuthHeader,
          "privy-app-id": PRIVY_APP_ID,
          "privy-authorization-signature": `${signature}`,
          "Content-Type": "application/json",
        },
        data: body,
      });

      console.log("Export response received");

      if (
        response.data &&
        response.data.encapsulated_key &&
        response.data.ciphertext
      ) {
        // Pass the encrypted data back to the client for decryption
        // This is more secure since the private key never leaves the client's browser
        return res.status(200).json({
          success: true,
          encryptedData: {
            encapsulated_key: response.data.encapsulated_key,
            ciphertext: response.data.ciphertext,
          },
        });
      } else {
        throw new Error("Export response missing expected data");
      }
    } catch (error: Error | any) {
      console.error(
        "Wallet export failed:",
        error.response ? error.response.data : error.message
      );
      return res.status(500).json({
        error: "Failed to export wallet private key",
        details: error.response
          ? error.response.data
          : error instanceof Error
          ? error.message
          : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

export default withCors(handler);
