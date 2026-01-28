import Head from "next/head";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <>
      <Head>
        <title>Offline - BF Fund</title>
        <meta name="description" content="You are currently offline" />
      </Head>
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
            <WifiOff className="h-10 w-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You&apos;re Offline</h1>
          <p className="text-slate-400 mb-6">
            It looks like you&apos;ve lost your internet connection. Please check your
            connection and try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <p className="text-xs text-slate-500 mt-8">
            Some features may be available offline once you&apos;ve visited them before.
          </p>
        </div>
      </div>
    </>
  );
}
