"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Download, Eye, Calendar, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvestorDocument {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  signedAt: string | null;
  createdAt: string;
}

export default function LPDocsClient() {
  const router = useRouter();
  const [documents, setDocuments] = useState<InvestorDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/lp/docs");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  const getDocTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      NDA: { label: "NDA", variant: "default" },
      SUBSCRIPTION: { label: "Subscription", variant: "secondary" },
      TAX: { label: "Tax Document", variant: "outline" },
      REPORT: { label: "Report", variant: "outline" },
      OTHER: { label: "Document", variant: "outline" },
    };
    return types[type] || types.OTHER;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/lp/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">My Documents</h1>
          <p className="text-gray-400 mt-2">
            Your secure document vault - all signed agreements and fund documents
          </p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Document Vault
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No documents yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Signed documents will appear here after completion
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => {
                  const badgeInfo = getDocTypeBadge(doc.documentType);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-600 rounded-lg">
                          <FileText className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{doc.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                            {doc.signedAt && (
                              <span className="text-gray-500 text-sm flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Signed {new Date(doc.signedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="View Document"
                        >
                          <Eye className="h-5 w-5" />
                        </a>
                        <a
                          href={doc.fileUrl}
                          download
                          className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
