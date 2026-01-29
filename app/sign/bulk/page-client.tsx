"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";

import { putFile } from "@/lib/files/put-file";
import { getSupportedContentType } from "@/lib/utils/get-content-type";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BulkRecipient {
  id: string;
  name: string;
  email: string;
}

export default function BulkSendClient() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    emailSubject: "",
    emailMessage: "",
  });

  const [recipients, setRecipients] = useState<BulkRecipient[]>([
    { id: "1", name: "", email: "" },
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const contentType = file.type;
    const supportedFileType = getSupportedContentType(contentType);

    if (supportedFileType !== "pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setCurrentFile(file);
    setFormData((prev) => ({
      ...prev,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
    }));
  };

  const addRecipient = () => {
    const newId = (recipients.length + 1).toString();
    setRecipients([...recipients, { id: newId, name: "", email: "" }]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length === 1) {
      toast.error("At least one recipient is required");
      return;
    }
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const updateRecipient = (
    id: string,
    field: keyof BulkRecipient,
    value: string
  ) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const newRecipients: BulkRecipient[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      
      if (parts.length >= 2) {
        const email = parts.find((p) => p.includes("@")) || parts[1];
        const name = parts.find((p) => !p.includes("@")) || parts[0];
        
        if (email && name) {
          newRecipients.push({
            id: `csv-${Date.now()}-${i}`,
            name: name,
            email: email,
          });
        }
      }
    }
    
    return newRecipients;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedRecipients = parseCSV(text);
      
      if (parsedRecipients.length > 0) {
        const existingValid = recipients.filter((r) => r.name && r.email);
        const combined = [...existingValid, ...parsedRecipients];
        setRecipients(combined.length > 0 ? combined : parsedRecipients);
        toast.success(`Imported ${parsedRecipients.length} recipients (total: ${combined.length})`);
      } else {
        toast.error("Could not parse any recipients from CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!teamId) {
      toast.error("Team not found");
      return;
    }

    if (!currentFile) {
      toast.error("Please upload a PDF file");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    const validRecipients = recipients.filter(
      (r) => r.email.trim() && r.name.trim()
    );
    
    if (validRecipients.length === 0) {
      toast.error("Please add at least one recipient with name and email");
      return;
    }

    setIsLoading(true);
    setTotalCount(validRecipients.length);
    setCreatedCount(0);

    try {
      setUploadProgress(10);

      const { type, data } = await putFile({
        file: currentFile,
        teamId: teamId,
      });

      setUploadProgress(30);

      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || null,
            file: data,
            storageType: type,
            emailSubject: formData.emailSubject || null,
            emailMessage: formData.emailMessage || null,
            recipients: validRecipients.map((r) => ({
              name: r.name,
              email: r.email,
            })),
          }),
        }
      );

      setUploadProgress(90);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create documents");
      }

      const result = await response.json();
      setUploadProgress(100);
      setCreatedCount(result.count);

      toast.success(`Created ${result.count} documents for signing`);
      
      setTimeout(() => {
        router.push("/sign");
      }, 1500);
    } catch (error) {
      console.error("Error creating documents:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create documents"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
        <section className="mb-6 flex items-center gap-4">
          <Link href="/sign">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div className="space-y-0 sm:space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Bulk Send Document
            </h2>
            <p className="text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-none">
              Send the same document to multiple people at once. Each recipient
              gets their own copy to sign.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Document
              </CardTitle>
              <CardDescription>
                Upload the PDF document everyone will sign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file">PDF File</Label>
                <div className="mt-2">
                  {currentFile ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3 dark:bg-gray-800">
                      <FileTextIcon className="h-8 w-8 text-red-500" />
                      <div className="flex-1">
                        <p className="font-medium">{currentFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentFile(null)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                      <UploadIcon className="mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF only</p>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Annual Policy Acknowledgment 2025"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add a description for this document"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Recipients ({recipients.filter((r) => r.email && r.name).length})
              </CardTitle>
              <CardDescription>
                Add all the people who need to sign this document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <label className="flex-1">
                  <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <UploadIcon className="h-4 w-4" />
                    Import from CSV
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCSVUpload}
                  />
                </label>
              </div>
              
              <p className="text-xs text-muted-foreground">
                CSV format: name, email (one per line)
              </p>

              <div className="max-h-[300px] space-y-3 overflow-y-auto">
                {recipients.map((recipient, index) => (
                  <div
                    key={recipient.id}
                    className="flex items-center gap-2 rounded-lg border bg-gray-50 p-3 dark:bg-gray-800"
                  >
                    <span className="w-6 text-sm text-muted-foreground">
                      {index + 1}.
                    </span>
                    <Input
                      value={recipient.name}
                      onChange={(e) =>
                        updateRecipient(recipient.id, "name", e.target.value)
                      }
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Input
                      type="email"
                      value={recipient.email}
                      onChange={(e) =>
                        updateRecipient(recipient.id, "email", e.target.value)
                      }
                      placeholder="Email"
                      className="flex-1"
                    />
                    {recipients.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecipient(recipient.id)}
                      >
                        <Trash2Icon className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={addRecipient}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Another Recipient
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Email Message (optional)</CardTitle>
            <CardDescription>
              Customize the email that will be sent to all recipients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                value={formData.emailSubject}
                onChange={(e) =>
                  setFormData({ ...formData, emailSubject: e.target.value })
                }
                placeholder="Please sign: [Document Title]"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="emailMessage">Message</Label>
              <Textarea
                id="emailMessage"
                value={formData.emailMessage}
                onChange={(e) =>
                  setFormData({ ...formData, emailMessage: e.target.value })
                }
                placeholder="Please review and sign this document at your earliest convenience."
                className="mt-1"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {isLoading && (
          <div className="mb-6 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
            <div className="mb-2 flex items-center gap-2">
              <Loader2Icon className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Creating documents...
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            {createdCount > 0 && (
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                Created {createdCount} of {totalCount} documents
              </p>
            )}
          </div>
        )}

        {createdCount > 0 && !isLoading && (
          <div className="mb-6 rounded-lg border bg-green-50 p-4 dark:bg-green-950">
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Successfully created {createdCount} documents!
              </span>
            </div>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Redirecting to dashboard...
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/sign">
            <Button variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !currentFile}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UsersIcon className="mr-2 h-4 w-4" />
                Send to {recipients.filter((r) => r.email && r.name).length}{" "}
                Recipients
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
