import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAuthorizationSignature } from "../../utils/newServerUtils";
// import { getAuthorizationSignature } from "../../utils/serverUtils";
import withCors from "../../utils/corsMiddleware";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract userId from request body
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: "Missing required field: userId"
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

    // API endpoint for deleting a user
    const url = `https://auth.privy.io/api/v1/users/${userId}`;

    // Generate the signature for this request
    const signature = getAuthorizationSignature({
      url,
      body: {},
    });

    try {
      // Make the API call to delete the user
      await axios({
        method: "DELETE",
        url,
        headers: {
          Authorization: basicAuthHeader,
          "privy-app-id": PRIVY_APP_ID,
          "privy-authorization-signature": signature,
          "Content-Type": "application/json",
        }
      });

      return res.status(200).json({
        success: true,
        message: `User ${userId} deleted successfully`,
      });
    } catch (error: Error | any) {
      console.error(
        "User deletion failed:",
        error.response ? error.response.data : error.message
      );
      return res.status(error.response ? error.response.status : 500).json({
        error: "Failed to delete user",
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