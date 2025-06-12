import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAuthorizationSignature } from "../../utils/serverUtils";
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
        error: "Server misconfiguration: Missing Privy credentials"
      });
    }

    // Authorization header (Basic auth using app_id:api_key)
    const authString = `${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`;
    const base64Auth = Buffer.from(authString).toString("base64");
    const basicAuthHeader = `Basic ${base64Auth}`;

    // Extract the email from the request
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Missing required field: email"
      });
    }

    try {
      // Query Privy API to find users by email
      
      const queryUrl = `https://auth.privy.io/api/v1/users/email/address`;
      const queryBody = {
        type: "email",
        address: email
      };
      
      const querySignature = getAuthorizationSignature({ 
        url: queryUrl, 
        body: queryBody 
      });
      
      const usersResponse = await axios({
        method: "POST",
        url: queryUrl,
        headers: {
          Authorization: basicAuthHeader,
          "privy-app-id": PRIVY_APP_ID,
          "privy-authorization-signature": querySignature,
          "Content-Type": "application/json",
        },
        data: queryBody,
      });
      console.log("Users response:", usersResponse.data);
      
      if (usersResponse.data && usersResponse.data.id) {
        
        // Return the first user that matches the email
        const user = usersResponse.data;
        console.log("User found:", user);
        const wallet = user.linked_accounts.find((linked_account: any) => linked_account.type === "wallet");    

        return res.status(200).json({
          success: true,
          user: {
            id: usersResponse.data.id,
            email: email,
            wallet: wallet
          }
        });
      } else {
        // No user found with this email
        return res.status(404).json({
          success: false,
          error: "No user found with this email address"
        });
      }
    } catch (error: Error | any) {
      console.error(
        "Error querying user by email:",
        error.response ? error.response: error
      );
      return res.status(500).json({
        error: "Failed to query user by email",
        details: error.response ? error.response.data : (error instanceof Error ? error.message : "Unknown error")
      });
    }
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// Wrap the handler with CORS middleware
export default withCors(handler);