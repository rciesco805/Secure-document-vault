import { Metadata } from "next";
import { Suspense } from "react";

import BankConnectClient from "./page-client";

export const metadata: Metadata = {
  title: "Bank Connect | BF Fund",
  description: "Securely link your bank account for capital calls and distributions",
};

export default function BankConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin text-gray-400 rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    }>
      <BankConnectClient />
    </Suspense>
  );
}
