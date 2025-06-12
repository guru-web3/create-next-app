import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAuthorizationSignature as getAuthorizationSignatureOld } from "../../utils/serverUtils";
import withCors from "../../utils/corsMiddleware";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get request body
  const { walletId, policyIds, ownerId } = req.body;

  if (!walletId || !policyIds || !Array.isArray(policyIds)) {
    return res.status(400).json({
      error: "Missing required fields: walletId and policyIds (array) are required"
    });
  }

  try {
    // Get Privy app credentials
    const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
      return res.status(500).json({
        error: "Server misconfiguration: Missing Privy credentials"
      });
    }

    // Authorization header (Basic auth using app_id:api_key)
    const authString = `${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`;
    const base64Auth = Buffer.from(authString).toString("base64");
    const basicAuthHeader = `Basic ${base64Auth}`;

    // API endpoint for updating a wallet
    const url = `https://auth.privy.io/v1/wallets/${walletId}`;

    // Request body
    const body = {
      policy_ids: policyIds,
      owner_id: ownerId,
    };

    // Generate the signature for this request
   
    const signature2 = getAuthorizationSignatureOld({
      url,
      body,
      method: "PATCH", // PATCH method for updating wallet
    });

    try {
      // Make the API call to update the wallet
      const response = await axios({
        method: "PATCH",
        url,
        headers: {
          Authorization: basicAuthHeader,
          "privy-app-id": PRIVY_APP_ID,
          "privy-authorization-signature": `${signature2}`,
          "Content-Type": "application/json",
        },
        data: body,
      });

      return res.status(200).json({
        success: true,
        wallet: response.data
      });
    } catch (error: Error | any) {
      console.error(
        "Wallet update failed:",
        error.response ? error.response.data : error.message
      );
      return res.status(error.response ? error.response.status : 500).json({
        error: "Failed to update wallet",
        details: error.response ? error.response.data : (error instanceof Error ? error.message : "Unknown error")
      });
    }
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

// Wrap the handler with CORS middleware
export default withCors(handler);