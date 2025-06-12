import { useState } from "react";
import {
  usePrivy,
  useImportWallet,
} from "@privy-io/react-auth";

export default function PrivateKeyImporter() {
  const { user } = usePrivy();
  const { importWallet } = useImportWallet();

  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedWallet, setImportedWallet] = useState<{
    address: string;
    id: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importStep, setImportStep] = useState<
    "initial" | "validating" | "importing" | "delegating" | "complete"
  >("initial");


  // Handle importing the private key
  const importPrivateKey = async () => {
    setIsImporting(true);
    setError(null);
    setImportedWallet(null);

    try {
      
      await importWallet({
        privateKey: privateKeyInput.trim(),
      })
    } catch (error) {
      console.error("Error importing wallet:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to import wallet. Please try again."
      );
      setImportStep("initial");
    } finally {
      setIsImporting(false);
    }
  };

  const clearForm = () => {
    setPrivateKeyInput("");
    setImportedWallet(null);
    setShowPrivateKey(false);
    setImportStep("initial");
    setError(null);
  };

  const toggleShowPrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Import Private Key
      </h2>

      {user ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Connected account:</p>
            <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
              {user.email?.address || user.phone?.number || user.google?.email || "Unknown"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              User ID: {user.id}
            </p>
          </div>

          {!importedWallet ? (
            <>
              {importStep === "initial" && (
                <>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Private Key
                    </label>
                    
                    <div className="relative">
                      <textarea
                        value={privateKeyInput}
                        onChange={(e) => setPrivateKeyInput(e.target.value)}
                        placeholder="Enter your private key (with or without 0x prefix)..."
                        className={`w-full p-3 border rounded-md resize-none h-24 font-mono text-sm ${
                          showPrivateKey ? "" : "blur-sm"
                        } ${
                          error && !privateKeyInput.trim()
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-300 focus:border-violet-500"
                        } focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50`}
                        disabled={isImporting}
                      />
                      
                      {privateKeyInput && !showPrivateKey && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-md">
                          <span className="text-gray-500 text-sm">
                            Private key hidden for security
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={toggleShowPrivateKey}
                        className="text-xs bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded flex items-center space-x-1"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {showPrivateKey ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l-1.285 1.285m0 0l-1.285 1.285"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          )}
                        </svg>
                        <span>{showPrivateKey ? "Hide" : "Show"}</span>
                      </button>
                    </div>

                  </div>

                  <button
                    onClick={importPrivateKey}
                    disabled={
                      isImporting ||
                      !privateKeyInput.trim()
                    }
                    className={`w-full py-2 px-4 rounded-md text-sm transition flex items-center justify-center ${
                      !isImporting &&
                      privateKeyInput.trim()
                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {!privateKeyInput.trim()
                      ? "Enter private key to continue"
                      : "Import Wallet"}
                  </button>
                </>
              )}

              {(importStep === "validating" ||
                importStep === "importing" ||
                importStep === "delegating") && (
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
                      {importStep === "validating" && "Validating private key..."}
                      {importStep === "importing" && "Importing wallet..."}
                      {importStep === "delegating" && "Setting up wallet access..."}
                    </span>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width:
                          importStep === "validating"
                            ? "33%"
                            : importStep === "importing"
                            ? "66%"
                            : "90%",
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded border border-red-200 flex items-start space-x-2">
                  <svg
                    className="w-4 h-4 text-red-600 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="border rounded-md p-3 bg-green-50 border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-md font-medium text-green-800">
                  Wallet Imported Successfully!
                </h3>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm text-green-700 font-medium">Wallet Address:</p>
                  <p className="font-mono text-xs break-all bg-green-100 p-2 rounded border border-green-200">
                    {importedWallet.address}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-green-700 font-medium">Wallet ID:</p>
                  <p className="font-mono text-xs break-all bg-green-100 p-2 rounded border border-green-200">
                    {importedWallet.id}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-2 bg-green-100 border border-green-200 rounded-md">
                <p className="text-xs text-green-800 font-semibold">
                  SUCCESS: Your wallet has been imported and is now available in your account.
                </p>
                <p className="text-xs text-green-700 mt-1">
                  You can now use this wallet for transactions and other operations.
                </p>
              </div>

              <button
                onClick={clearForm}
                className="mt-4 w-full text-sm bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-md transition"
              >
                Import Another Wallet
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-center">
          No account connected. Please connect your account first.
        </div>
      )}
    </div>
  );
}