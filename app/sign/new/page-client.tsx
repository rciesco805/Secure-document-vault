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
  UserIcon,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: "SIGNER" | "VIEWER" | "APPROVER";
  signingOrder: number;
}

export default function NewSignatureDocumentClient() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    emailSubject: "",
    emailMessage: "",
  });

  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", name: "", email: "", role: "SIGNER", signingOrder: 1 },
  ]);

  const processFile = (file: File) => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const addRecipient = () => {
    const newId = (recipients.length + 1).toString();
    setRecipients([
      ...recipients,
      {
        id: newId,
        name: "",
        email: "",
        role: "SIGNER",
        signingOrder: recipients.length + 1,
      },
    ]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length === 1) {
      toast.error("At least one recipient is required");
      return;
    }
    const updated = recipients
      .filter((r) => r.id !== id)
      .map((r, idx) => ({ ...r, signingOrder: idx + 1 }));
    setRecipients(updated);
  };

  const updateRecipient = (
    id: string,
    field: keyof Recipient,
    value: string
  ) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async (navigateToPrepare: boolean = false) => {
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
    if (validRecipients.length === 0 && navigateToPrepare) {
      toast.error("Please add at least one recipient with name and email");
      return;
    }

    setIsLoading(true);

    try {
      setUploadProgress(10);

      const { type, data } = await putFile({
        file: currentFile,
        teamId: teamId,
      });

      setUploadProgress(50);

      const response = await fetch(
        `/api/teams/${teamId}/signature-documents`,
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
              role: r.role,
              signingOrder: r.signingOrder,
            })),
            status: "DRAFT",
          }),
        }
      );

      setUploadProgress(90);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create document");
      }

      const result = await response.json();
      setUploadProgress(100);

      if (navigateToPrepare) {
        toast.success("Document created. Now place signature fields.");
        router.push(`/sign/${result.id}/prepare`);
      } else {
        toast.success("Document saved as draft");
        router.push(`/sign/${result.id}`);
      }
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create document"
      );
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
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
              New Signature Document
            </h2>
            <p className="text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-none">
              Upload a document, add recipients, and send for signature.
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
                Upload the PDF document you want signed
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
                    <label 
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
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
                  placeholder="Enter document title"
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
                <UserIcon className="h-5 w-5" />
                Recipients
              </CardTitle>
              <CardDescription>
                Add the people who need to sign this document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipients.map((recipient, index) => (
                <div
                  key={recipient.id}
                  className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-800"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Recipient {index + 1}
                    </span>
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={recipient.name}
                        onChange={(e) =>
                          updateRecipient(recipient.id, "name", e.target.value)
                        }
                        placeholder="John Smith"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={recipient.email}
                        onChange={(e) =>
                          updateRecipient(recipient.id, "email", e.target.value)
                        }
                        placeholder="john@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Role</Label>
                      <Select
                        value={recipient.role}
                        onValueChange={(value) =>
                          updateRecipient(
                            recipient.id,
                            "role",
                            value as Recipient["role"]
                          )
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SIGNER">
                            Needs to Sign
                          </SelectItem>
                          <SelectItem value="VIEWER">
                            Receives a Copy
                          </SelectItem>
                          <SelectItem value="APPROVER">
                            Needs to Approve
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

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
              Customize the email that will be sent to recipients
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

        <div className="flex justify-end gap-3">
          <Link href="/sign">
            <Button variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isLoading || !currentFile}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isLoading || !currentFile}
          >
            {isLoading
              ? `Uploading... ${uploadProgress}%`
              : "Continue to Prepare"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
