import { useState } from "react";
import PrivateKeyExporter from "./PrivateKeyExporter";
import PrivateKeyImporter from "./PrivateKeyImporter";

type TabType = "export" | "import";

interface WalletManagerProps {
  onExportComplete?: (privateKey: string) => void;
}

export default function WalletManager({
  onExportComplete,
}: WalletManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("export");

  const tabs = [
    {
      id: "export" as TabType,
      name: "Export Wallet",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      description: "Export your private key from an existing wallet",
    },
    {
      id: "import" as TabType,
      name: "Import Wallet",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      ),
      description: "Import a wallet using your private key",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tab Navigation Header */}
      <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wallet Management
          </h1>
          <p className="text-sm text-gray-600">
            Securely export or import your crypto wallet private keys
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? "border-violet-500 text-violet-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`mr-2 transition-colors duration-200 ${
                      isActive
                        ? "text-violet-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50 rounded-b-lg min-h-[600px]">
        {/* Tab Description */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center">
                <span className="text-violet-600">
                  {tabs.find((tab) => tab.id === activeTab)?.icon}
                </span>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {tabs.find((tab) => tab.id === activeTab)?.name}
              </h2>
              <p className="text-sm text-gray-600">
                {tabs.find((tab) => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-6">
          {activeTab === "export" && (
            <div className="animate-fadeIn">
              <PrivateKeyExporter onExportComplete={onExportComplete} />
            </div>
          )}

          {activeTab === "import" && (
            <div className="animate-fadeIn">
              <PrivateKeyImporter/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
