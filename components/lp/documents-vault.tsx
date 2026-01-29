import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  FolderOpen,
  FileCheck,
  FileLock,
  Shield,
  Eye,
  WifiOff,
} from "lucide-react";
import { SaveOfflineButton } from "@/components/offline/save-offline-button";

interface Document {
  id: string;
  title: string;
  documentType: string;
  fileUrl?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

interface DocumentsVaultProps {
  documents: Document[];
  ndaSigned: boolean;
  accreditationStatus: string;
  onViewAll?: () => void;
}

const DOC_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  NDA: { icon: FileLock, color: "text-purple-400", label: "Non-Disclosure Agreement" },
  SUBSCRIPTION: { icon: FileCheck, color: "text-emerald-400", label: "Subscription Agreement" },
  K1: { icon: FileText, color: "text-blue-400", label: "K-1 Tax Document" },
  PPM: { icon: FileText, color: "text-amber-400", label: "Private Placement Memo" },
  OPERATING_AGREEMENT: { icon: FileText, color: "text-cyan-400", label: "Operating Agreement" },
  OTHER: { icon: FileText, color: "text-gray-400", label: "Document" },
};

export function DocumentsVault({ 
  documents, 
  ndaSigned, 
  accreditationStatus,
  onViewAll 
}: DocumentsVaultProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredDocs = filter === "all" 
    ? documents 
    : documents.filter((d) => d.documentType === filter);

  const docTypes = [...new Set(documents.map((d) => d.documentType))];

  const getDocConfig = (type: string) => DOC_TYPE_CONFIG[type] || DOC_TYPE_CONFIG.OTHER;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-purple-500" />
              Your Document Vault
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              Securely stored signed documents and fund materials
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-white"
              asChild
            >
              <Link href="/lp/offline-documents">
                <WifiOff className="h-4 w-4 mr-1" />
                Offline
              </Link>
            </Button>
            {onViewAll && (
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={onViewAll}
              >
                View All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/50 overflow-x-auto">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-gray-700" : "text-gray-400 hover:text-white"}
          >
            All ({documents.length})
          </Button>
          {docTypes.map((type) => {
            const config = getDocConfig(type);
            const count = documents.filter((d) => d.documentType === type).length;
            return (
              <Button
                key={type}
                variant={filter === type ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter(type)}
                className={filter === type ? "bg-gray-700" : "text-gray-400 hover:text-white"}
              >
                {config.label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="mb-4 p-3 bg-gray-700/30 rounded-lg flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {ndaSigned ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-amber-400" />
                )}
                <span className={`text-sm ${ndaSigned ? "text-emerald-400" : "text-amber-400"}`}>
                  NDA
                </span>
              </div>
              <div className="flex items-center gap-2">
                {accreditationStatus !== "PENDING" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-amber-400" />
                )}
                <span className={`text-sm ${accreditationStatus !== "PENDING" ? "text-emerald-400" : "text-amber-400"}`}>
                  Accreditation
                </span>
              </div>
            </div>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-500">No documents yet</p>
            <p className="text-gray-600 text-sm mt-1">
              {!ndaSigned ? "Complete your NDA to access documents" : "Documents will appear here when available"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredDocs.slice(0, 6).map((doc) => {
              const config = getDocConfig(doc.documentType);
              const IconComponent = config.icon;
              
              return (
                <div 
                  key={doc.id} 
                  className="p-3 bg-gray-700/40 rounded-lg flex items-center justify-between group hover:bg-gray-700/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 bg-gray-600/50 rounded-lg`}>
                      <IconComponent className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-gray-500 text-xs">
                        {doc.signedAt 
                          ? `Signed ${new Date(doc.signedAt).toLocaleDateString()}`
                          : new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.fileUrl && (
                      <>
                        <SaveOfflineButton
                          documentId={doc.id}
                          documentName={doc.title}
                          documentUrl={doc.fileUrl}
                          documentType={doc.documentType}
                          variant="icon"
                        />
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <a
                          href={doc.fileUrl}
                          download
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
