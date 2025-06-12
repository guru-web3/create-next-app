import { useState, useEffect } from "react";
import {
  usePrivy,
  getAccessToken,
  useHeadlessDelegatedActions,
} from "@privy-io/react-auth";
import axios from "axios";

interface PrivateKeyExporterProps {
  onExportComplete?: (privateKey: string) => void;
}

export default function PrivateKeyExporter({
  onExportComplete,
}: PrivateKeyExporterProps) {
  const { user, exportWallet } = usePrivy();
  const { delegateWallet } = useHeadlessDelegatedActions();

  const [isExporting, setIsExporting] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [exportStep, setExportStep] = useState<
    "initial" | "policy" | "updating" | "exporting" | "decrypting" | "complete"
  >("initial");
  const [keyPair, setKeyPair] = useState<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  } | null>(null);
  const { wallet } = user || {};

  // Check if the wallet to delegate by inspecting the user's linked accounts
  const isAlreadyDelegated = !!user?.linkedAccounts.find(
    (account) => account.type === "wallet" && account.delegated
  );

  // Generate keypair on component mount
  useEffect(() => {
    generateKeyPair();
  }, []);

  // Generate a P-256 key pair for wallet export
  const generateKeyPair = async () => {
    try {
      // Generate a new P-256 key pair using the Web Crypto API
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey", "deriveBits"]
      );

      setKeyPair(keyPair);
      console.log("Key pair generated successfully");
    } catch (error) {
      console.error("Error generating key pair:", error);
      setError("Failed to generate encryption keys. Please try again.");
    }
  };

  const callDelegate = async () => {
    if (!wallet) {
      console.error("No wallet connected");
      return;
    }
    try {
      console.log("Delegating wallet...", isAlreadyDelegated, user);
      const result = await delegateWallet({
        address: user?.wallet?.address || "",
        chainType: "ethereum",
      });
      console.log("Delegated wallet result:", result);
    } catch (error) {
      console.error("Error delegating wallet:", error);
    }
  };

  // Export public key to base64 for the API
  const exportPublicKeyAsBase64 = async () => {
    if (!keyPair) {
      await generateKeyPair();
      if (!keyPair) throw new Error("Failed to generate key pair");
    }

    // Export the public key to raw format
    const rawPublicKey = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    // Convert to base64
    const uint8Array = new Uint8Array(rawPublicKey);
    let binaryString = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i] as number);
    }
    return btoa(binaryString);
  };

  // Decrypt the wallet private key from the encrypted response
  const decryptWalletKey = async (
    encapsulatedKey: string,
    ciphertext: string
  ) => {
    try {
      setExportStep("decrypting");

      // Dynamically import HPKE libs (to reduce bundle size)
      const { CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } = await import(
        "@hpke/core"
      );
      const { Chacha20Poly1305 } = await import("@hpke/chacha20poly1305");

      // Initialize cipher suite
      const suite = new CipherSuite({
        kem: new DhkemP256HkdfSha256(),
        kdf: new HkdfSha256(),
        aead: new Chacha20Poly1305(),
      });

      // Helper to convert base64 to ArrayBuffer
      const base64ToBuffer = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      };

      // Create recipient context for decryption
      const recipient = await suite.createRecipientContext({
        recipientKey: keyPair!.privateKey,
        enc: base64ToBuffer(encapsulatedKey),
      });

      // Decrypt the private key
      const decryptedBytes = await recipient.open(base64ToBuffer(ciphertext));
      const decryptedKey = new TextDecoder().decode(decryptedBytes);

      console.log("Decryption successful!");
      return decryptedKey;
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt wallet key. Please try again.");
    }
  };

  // Handle updating wallet with policy
  const updateWalletWithPolicy = async (
    policyIdToUse: string,
    ownerId: string
  ) => {
    if (!wallet?.id) {
      setError("No wallet connected to update");
      return false;
    }

    setExportStep("updating");
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await axios.post(
        "/api/update-wallet-policy",
        {
          walletId: wallet.id,
          policyIds: [policyIdToUse],
          ownerId: ownerId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data && response.data.success) {
        return true;
      } else {
        throw new Error("Failed to update wallet with policy");
      }
    } catch (error) {
      console.error("Error updating wallet with policy:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update wallet with policy"
      );
      return false;
    }
  };

  // Handle exporting the private key
  const exportPrivateKey = async () => {
    if (!wallet || wallet.walletClientType !== "privy") {
      setError("Only embedded wallets can be exported");
      return;
    }

    if (!keyPair) {
      setError("Encryption keys not ready. Please try again.");
      await generateKeyPair();
      return;
    }

    setIsExporting(true);
    setError(null);
    setPrivateKey(null);

    try {
      // Step 1: Create export policy
      const exportPolicyId = "kgftjkiqrz1pxpwqs9ugjqul";
      const ownerId = "w2tnqrp76l3efku9sf0yy4o7";
      if (!exportPolicyId || !ownerId) {
        throw new Error(
          "Failed to create export policy, missing required policy ID or owner ID"
        );
      }

      // Step 2: Update wallet with policy
      const updateResult = await updateWalletWithPolicy(
        exportPolicyId,
        ownerId
      );
      if (!updateResult) {
        throw new Error("Failed to update wallet with policy");
      }

      // Step 3: Export the wallet
      setExportStep("exporting");
      const accessToken = await getAccessToken();

      // Export the public key to base64
      const publicKeyBase64 = await exportPublicKeyAsBase64();

      const response = await axios.post(
        "/api/export-wallet",
        {
          walletId: wallet.id,
          address: wallet.address,
          publicKey: publicKeyBase64,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data && response.data.encryptedData) {
        const { encapsulated_key, ciphertext } = response.data.encryptedData;

        // Decrypt the wallet key using HPKE
        const decryptedPrivateKey = await decryptWalletKey(
          encapsulated_key,
          ciphertext
        );

        setPrivateKey(decryptedPrivateKey);
        setExportStep("complete");
        if (onExportComplete) {
          onExportComplete(decryptedPrivateKey);
        }
      } else {
        throw new Error(
          "Failed to export wallet. Encrypted data not received."
        );
      }
    } catch (error) {
      console.error("Error exporting wallet:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to export wallet. Please try again."
      );
      setExportStep("initial");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
    }
  };

  // Security timer to auto-hide private key after 60 seconds
  const toggleShowKey = () => {
    if (!showKey && privateKey) {
      setShowKey(true);
      setTimeout(() => {
        setShowKey(false);
      }, 60000); // 60 seconds
    } else {
      setShowKey(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Export Private Key
      </h2>

      {wallet ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Connected wallet:</p>
            <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
              {wallet.address}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Type: {wallet.walletClientType || "Unknown"}
              {wallet.walletClientType !== "privy" && (
                <span className="text-amber-600 ml-2">
                  (Only embedded wallets can be exported)
                </span>
              )}
            </p>
          </div>

          {!privateKey ? (
            <>
              {/* export via privy UI */}
              <button
                onClick={exportWallet}
                className={`text-sm ${
                  !isAlreadyDelegated
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : "bg-gray-300 hover:bg-gray-400 text-gray-700"
                } py-2 px-4 rounded-md`}
              >
                Export via privy UI
              </button>

              {/* export via API */}
              {exportStep === "initial" && (
                <>
                  <h3 className="font-semibold text-violet-800">
                    Wallet Access Status
                  </h3>

                  {!isAlreadyDelegated ? (
                    <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3">
                      <p className="text-blue-700 text-sm">
                        <strong>Required Step:</strong> You need to delegate
                        your wallet before exporting your private key.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-3">
                      <p className="text-green-700 text-sm">
                        <strong>Wallet Delegated:</strong> Your wallet is
                        delegated. You can now export your private key.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-3 flex-wrap">
                    <button
                      onClick={callDelegate}
                      className={`text-sm ${
                        !isAlreadyDelegated
                          ? "bg-violet-600 hover:bg-violet-700 text-white"
                          : "bg-gray-300 hover:bg-gray-400 text-gray-700"
                      } py-2 px-4 rounded-md`}
                    >
                      {!isAlreadyDelegated
                        ? "Delegate Wallet"
                        : "Revoke Delegation"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={exportPrivateKey}
                      disabled={
                        isExporting ||
                        wallet.walletClientType !== "privy" ||
                        !keyPair ||
                        !isAlreadyDelegated
                      }
                      className={`w-full py-2 px-4 rounded-md text-sm transition flex items-center justify-center ${
                        wallet.walletClientType === "privy" &&
                        keyPair &&
                        isAlreadyDelegated
                          ? "bg-violet-600 hover:bg-violet-700 text-white"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {!keyPair
                        ? "Preparing encryption keys..."
                        : !isAlreadyDelegated
                        ? "Delegate wallet first"
                        : "Export Private Key"}
                    </button>

                    {wallet.walletClientType !== "privy" && (
                      <p className="mt-2 text-xs text-center text-amber-600">
                        Only embedded wallets can be exported
                      </p>
                    )}

                    {!isAlreadyDelegated &&
                      wallet.walletClientType === "privy" && (
                        <p className="mt-2 text-xs text-center text-gray-600">
                          Click "Delegate Wallet" above to enable export
                        </p>
                      )}
                  </div>
                </>
              )}

              {(exportStep === "policy" ||
                exportStep === "updating" ||
                exportStep === "exporting" ||
                exportStep === "decrypting") && (
                <div className="flex flex-col items-center py-4">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-violet-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-violet-800 font-medium">
                      {exportStep === "policy" && "Creating export policy..."}
                      {exportStep === "updating" && "Updating wallet policy..."}
                      {exportStep === "exporting" && "Exporting wallet data..."}
                      {exportStep === "decrypting" &&
                        "Decrypting private key..."}
                    </span>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-violet-600 h-1.5 rounded-full"
                      style={{
                        width:
                          exportStep === "policy"
                            ? "25%"
                            : exportStep === "updating"
                            ? "50%"
                            : exportStep === "exporting"
                            ? "75%"
                            : "90%",
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded border border-red-200">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="border rounded-md p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-gray-800">
                  Your Private Key
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleShowKey}
                    className="text-xs bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 py-1 px-2 rounded"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {showKey ? (
                <div className="relative">
                  <pre className="bg-gray-100 p-3 rounded border border-gray-300 overflow-x-auto text-xs font-mono">
                    {privateKey}
                  </pre>
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs py-0.5 px-1 rounded-bl">
                    VISIBLE
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 p-3 rounded border border-gray-300 text-xs font-mono relative">
                  <span className="blur-sm select-none">
                    {privateKey.replace(/./g, "•")}
                  </span>
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    Click "Show" to reveal
                  </span>
                </div>
              )}

              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-800 font-semibold">
                  SECURITY WARNING: Your private key is extremely sensitive.
                  Never share it with anyone.
                </p>
                <p className="text-xs text-red-700 mt-1">
                  For security, this will automatically hide in 60 seconds.
                </p>
              </div>

              <button
                onClick={() => {
                  setPrivateKey(null);
                  setShowKey(false);
                  setExportStep("initial");
                }}
                className="mt-4 w-full text-sm bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-md"
              >
                Done
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-center">
          No wallet connected. Please connect a wallet first.
        </div>
      )}
    </div>
  );
}
