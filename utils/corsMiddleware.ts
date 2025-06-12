import { NextApiRequest, NextApiResponse } from "next";
import { NextApiHandler } from "next";

// Define CORS headers to allow all origins
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow any origin
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, privy-app-id, privy-authorization-signature",
  "Access-Control-Max-Age": "86400" // 24 hours cache
};

// Middleware function to handle CORS
function withCors(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Set CORS headers on all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Handle OPTIONS request (preflight)
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // Continue with the request
    return handler(req, res);
  };
}

export default withCors;