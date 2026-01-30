"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import { useTeam } from "@/context/team-context";
import AppLayout from "@/components/layouts/app";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DownloadIcon,
  UploadIcon,
  FileIcon,
  DatabaseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  HardDriveIcon,
} from "lucide-react";

const EXPORTABLE_MODELS = [
  { id: "fund", label: "Funds", description: "Fund details, targets, and status" },
  { id: "investor", label: "Investors", description: "Investor profiles and KYC data" },
  { id: "investment", label: "Investments", description: "Commitments and funded amounts" },
  { id: "capitalCall", label: "Capital Calls", description: "Capital call records" },
  { id: "capitalCallResponse", label: "Capital Call Responses", description: "Investor responses to calls" },
  { id: "distribution", label: "Distributions", description: "Distribution records" },
  { id: "fundReport", label: "Fund Reports", description: "Quarterly and annual reports" },
  { id: "investorNote", label: "Investor Notes", description: "GP notes on investors" },
  { id: "investorDocument", label: "Investor Documents", description: "Signed document references" },
  { id: "accreditationAck", label: "Accreditation Records", description: "506(c) compliance acknowledgments" },
  { id: "bankLink", label: "Bank Links", description: "Connected bank account metadata" },
  { id: "transaction", label: "Transactions", description: "Capital calls and distributions" },
];

export default function DataMigrationPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [activeTab, setActiveTab] = useState("export");
  const [selectedModels, setSelectedModels] = useState<string[]>(
    EXPORTABLE_MODELS.map((m) => m.id)
  );
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingBlobs, setIsExportingBlobs] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [importResult, setImportResult] = useState<any>(null);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((m) => m !== modelId)
        : [...prev, modelId]
    );
  };

  const selectAll = () => {
    setSelectedModels(EXPORTABLE_MODELS.map((m) => m.id));
  };

  const selectNone = () => {
    setSelectedModels([]);
  };

  const handleExport = async () => {
    if (!teamId || selectedModels.length === 0) return;

    setIsExporting(true);
    try {
      const response = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          models: selectedModels,
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fund-data-export-${new Date().toISOString().split("T")[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Data exported successfully");
    } catch (error: any) {
      toast.error(error.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBlobs = async () => {
    if (!teamId) return;

    setIsExportingBlobs(true);
    try {
      const response = await fetch("/api/admin/export-blobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          includeSignedUrls: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Blob export failed");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blob-manifest-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Blob manifest exported (${data.blobs.length} files)`);
    } catch (error: any) {
      toast.error(error.message || "Blob export failed");
    } finally {
      setIsExportingBlobs(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!teamId || !importFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileContent = await importFile.text();
      const data = JSON.parse(fileContent);

      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          data,
          dryRun: isDryRun,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      const result = await response.json();
      setImportResult(result);

      if (result.success) {
        toast.success(isDryRun ? "Dry run completed" : "Data imported successfully");
      } else {
        toast.warning("Import completed with errors");
      }
    } catch (error: any) {
      toast.error(error.message || "Import failed");
      setImportResult({ success: false, errors: [{ model: "parse", error: error.message }] });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout>
      <main className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <SettingsHeader />

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Data Migration</h1>
            <p className="text-muted-foreground">
              Export and import fund data for backups or AWS migration (RDS, S3)
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="export" className="flex items-center gap-2">
                <DownloadIcon className="h-4 w-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <UploadIcon className="h-4 w-4" />
                Import
              </TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DatabaseIcon className="h-5 w-5" />
                      Database Export
                    </CardTitle>
                    <CardDescription>
                      Export fund data as JSON or CSV for migration to AWS RDS
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={selectNone}>
                        Clear
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {EXPORTABLE_MODELS.map((model) => (
                        <div key={model.id} className="flex items-start gap-2">
                          <Checkbox
                            id={model.id}
                            checked={selectedModels.includes(model.id)}
                            onCheckedChange={() => toggleModel(model.id)}
                          />
                          <div className="grid gap-0.5 leading-none">
                            <Label htmlFor={model.id} className="cursor-pointer text-sm font-medium">
                              {model.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{model.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <Label className="text-sm">Format:</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={exportFormat === "json" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setExportFormat("json")}
                        >
                          <FileJsonIcon className="mr-1 h-4 w-4" />
                          JSON
                        </Button>
                        <Button
                          variant={exportFormat === "csv" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setExportFormat("csv")}
                        >
                          <FileSpreadsheetIcon className="mr-1 h-4 w-4" />
                          CSV
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={handleExport}
                      disabled={isExporting || selectedModels.length === 0}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Export Data ({selectedModels.length} models)
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDriveIcon className="h-5 w-5" />
                      Blob Export
                    </CardTitle>
                    <CardDescription>
                      Export file manifest with signed URLs for migration to AWS S3
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Generates a manifest of all investor documents with temporary download URLs.
                      Use these URLs to download files and re-upload to your S3 bucket.
                    </p>

                    <div className="rounded-lg border bg-muted/50 p-4">
                      <h4 className="mb-2 font-medium">S3 Migration Steps:</h4>
                      <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                        <li>Export blob manifest with signed URLs</li>
                        <li>Use the URLs to download each file</li>
                        <li>Upload to your S3 bucket</li>
                        <li>Update storage keys in imported data</li>
                      </ol>
                    </div>

                    <Button
                      onClick={handleExportBlobs}
                      disabled={isExportingBlobs}
                      variant="outline"
                      className="w-full"
                    >
                      {isExportingBlobs ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Generating Manifest...
                        </>
                      ) : (
                        <>
                          <FileIcon className="mr-2 h-4 w-4" />
                          Export Blob Manifest
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="import" className="mt-6">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadIcon className="h-5 w-5" />
                    Import Data
                  </CardTitle>
                  <CardDescription>
                    Restore fund data from a previous export
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-file">Select Export File (JSON)</Label>
                    <input
                      id="import-file"
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>

                  {importFile && (
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <p className="text-sm font-medium">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dry-run"
                      checked={isDryRun}
                      onCheckedChange={(checked) => setIsDryRun(checked as boolean)}
                    />
                    <Label htmlFor="dry-run" className="cursor-pointer">
                      Dry run (validate without making changes)
                    </Label>
                  </div>

                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !importFile}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        {isDryRun ? "Validating..." : "Importing..."}
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        {isDryRun ? "Validate Import" : "Import Data"}
                      </>
                    )}
                  </Button>

                  {importResult && (
                    <div
                      className={`rounded-lg border p-4 ${
                        importResult.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {importResult.success ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircleIcon className="h-5 w-5 text-yellow-600" />
                        )}
                        <span className="font-medium">
                          {importResult.success ? "Import Successful" : "Import Completed with Issues"}
                        </span>
                      </div>

                      {importResult.imported && (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">Records Processed:</p>
                          {Object.entries(importResult.imported).map(([model, count]) => (
                            <p key={model} className="text-muted-foreground">
                              {model}: {count as number} imported
                              {importResult.skipped?.[model] > 0 &&
                                `, ${importResult.skipped[model]} skipped`}
                            </p>
                          ))}
                        </div>
                      )}

                      {importResult.errors?.length > 0 && (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="font-medium text-red-600">Errors:</p>
                          {importResult.errors.map((err: any, i: number) => (
                            <p key={i} className="text-red-600">
                              {err.model}: {err.error}
                            </p>
                          ))}
                        </div>
                      )}

                      {isDryRun && importResult.success && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          This was a dry run. Uncheck the option and import again to apply changes.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppLayout>
  );
}
