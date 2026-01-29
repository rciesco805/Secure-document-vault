import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  FileText,
  WifiOff,
  Trash2,
  ExternalLink,
  HardDrive,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCachedDocuments,
  getCacheStats,
  removeCachedDocument,
  clearDocumentCache,
  formatCacheSize,
  isOfflineCacheSupported,
  type CachedDocument,
  type CacheStats,
} from "@/lib/offline/document-cache";
import { usePWAStatus } from "@/components/pwa-install";

export default function OfflineDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isOnline } = usePWAStatus();
  
  const [documents, setDocuments] = useState<CachedDocument[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/lp/login");
    }
  }, [status, router]);

  const userId = session?.user?.id;

  useEffect(() => {
    const loadCachedDocuments = async () => {
      if (!isOfflineCacheSupported()) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const [docs, cacheStats] = await Promise.all([
          getCachedDocuments(userId),
          getCacheStats(userId),
        ]);
        setDocuments(docs);
        setStats(cacheStats);
      } catch (error) {
        console.error("Failed to load cached documents:", error);
        toast.error("Failed to load offline documents");
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedDocuments();
  }, [userId]);

  const handleRemoveDocument = async (doc: CachedDocument) => {
    try {
      const result = await removeCachedDocument(doc.id, doc.url, userId);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        toast.success("Document removed from offline storage");
        const newStats = await getCacheStats(userId);
        setStats(newStats);
      } else {
        toast.error("Failed to remove document");
      }
    } catch (error) {
      toast.error("Failed to remove document");
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await clearDocumentCache(userId);
      if (result.success) {
        setDocuments([]);
        setStats({ documentCount: 0, cacheEntries: 0, estimatedSize: 0, documents: [] });
        toast.success("All offline documents cleared");
      } else {
        toast.error("Failed to clear cache");
      }
    } catch (error) {
      toast.error("Failed to clear cache");
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const [docs, cacheStats] = await Promise.all([
        getCachedDocuments(userId),
        getCacheStats(userId),
      ]);
      setDocuments(docs);
      setStats(cacheStats);
      toast.success("Refreshed");
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Head>
          <title>Offline Documents - BF Fund</title>
        </Head>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" asChild>
              <Link href="/lp/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Offline Documents</h1>
          </div>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <WifiOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Not Supported</h3>
              <p className="text-slate-400">
                Offline document storage is not supported in this browser.
                Please use a modern browser like Chrome, Firefox, or Safari.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Head>
        <title>Offline Documents - BF Fund</title>
        <meta name="description" content="View and manage your offline documents" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/lp/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <WifiOff className="h-6 w-6" />
                Offline Documents
              </h1>
              <p className="text-slate-400 text-sm">
                {isOnline ? "You're online" : "You're offline"} - {documents.length} document{documents.length !== 1 ? "s" : ""} saved
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {documents.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all offline documents?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {documents.length} documents from offline storage.
                      You can save them again when you're online.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll}>
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {stats && (
          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Storage used:</span>
                  <span className="font-medium">{formatCacheSize(stats.estimatedSize)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Documents:</span>
                  <span className="font-medium">{stats.documentCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {documents.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center">
              <WifiOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Offline Documents</h3>
              <p className="text-slate-400 mb-4">
                Save documents for offline access by clicking the "Save Offline" button
                when viewing a document.
              </p>
              <Button asChild>
                <Link href="/lp/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="bg-slate-900 border-slate-800">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        <FileText className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">{doc.name}</h3>
                        <p className="text-sm text-slate-400">
                          Saved {formatDate(doc.savedAt)} • {formatCacheSize(doc.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(doc)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
