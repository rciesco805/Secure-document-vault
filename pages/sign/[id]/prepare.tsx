import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckIcon,
  GripVerticalIcon,
  PenIcon,
  TypeIcon,
  CalendarIcon,
  CheckSquareIcon,
  UserIcon,
  MailIcon,
  Trash2Icon,
  SaveIcon,
  BriefcaseIcon,
  BadgeIcon,
} from "lucide-react";

import { useSignatureDocument } from "@/lib/swr/use-signature-documents";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fieldTypes = [
  { type: "SIGNATURE", label: "Signature", icon: PenIcon },
  { type: "INITIALS", label: "Initials", icon: TypeIcon },
  { type: "DATE_SIGNED", label: "Date", icon: CalendarIcon },
  { type: "NAME", label: "Name", icon: UserIcon },
  { type: "EMAIL", label: "Email", icon: MailIcon },
  { type: "TITLE", label: "Title", icon: BadgeIcon },
  { type: "COMPANY", label: "Company", icon: BriefcaseIcon },
  { type: "TEXT", label: "Text", icon: TypeIcon },
  { type: "CHECKBOX", label: "Checkbox", icon: CheckSquareIcon },
];

interface PlacedField {
  id: string;
  type: string;
  recipientId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PrepareDocument() {
  const router = useRouter();
  const { id } = router.query;
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { document, loading, mutate } = useSignatureDocument(id as string);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [selectedFieldType, setSelectedFieldType] = useState<string>("SIGNATURE");
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document?.recipients?.length && !selectedRecipient) {
      setSelectedRecipient(document.recipients[0].id);
    }
    if (document?.fields) {
      setFields(
        document.fields.map((f: any) => ({
          id: f.id,
          type: f.type,
          recipientId: f.recipientId || "",
          pageNumber: f.pageNumber,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
        }))
      );
    }
  }, [document]);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !selectedRecipient) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const fieldConfig = getFieldDimensions(selectedFieldType);

    const newField: PlacedField = {
      id: `temp-${Date.now()}`,
      type: selectedFieldType,
      recipientId: selectedRecipient,
      pageNumber: currentPage,
      x: Math.max(0, Math.min(x - fieldConfig.width / 2, 100 - fieldConfig.width)),
      y: Math.max(0, Math.min(y - fieldConfig.height / 2, 100 - fieldConfig.height)),
      width: fieldConfig.width,
      height: fieldConfig.height,
    };

    setFields([...fields, newField]);
    toast.success(`Added ${selectedFieldType.toLowerCase().replace("_", " ")} field`);
  };

  const getFieldDimensions = (type: string) => {
    switch (type) {
      case "SIGNATURE":
        return { width: 20, height: 8 };
      case "INITIALS":
        return { width: 10, height: 6 };
      case "DATE_SIGNED":
        return { width: 15, height: 4 };
      case "CHECKBOX":
        return { width: 4, height: 4 };
      default:
        return { width: 15, height: 4 };
    }
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    toast.success("Field removed");
  };

  const handleSave = async () => {
    if (!teamId || !document) return;
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}/fields`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields }),
        }
      );

      if (!response.ok) throw new Error("Failed to save fields");

      toast.success("Fields saved successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to save fields");
    } finally {
      setIsSaving(false);
    }
  };

  const getRecipientColor = (recipientId: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
    ];
    const index =
      document?.recipients?.findIndex((r: any) => r.id === recipientId) || 0;
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
          <Skeleton className="h-8 w-64" />
          <div className="mt-6 grid gap-6 lg:grid-cols-4">
            <Skeleton className="h-96 lg:col-span-3" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Document not found</h3>
            <Link href="/sign">
              <Button className="mt-4">Back to Documents</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
        <section className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/sign/${document.id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Prepare: {document.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                Click on the document to place signature fields
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Link href={`/sign/${document.id}`}>
              <Button>
                <CheckIcon className="mr-2 h-4 w-4" />
                Done
              </Button>
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <div
                  ref={containerRef}
                  onClick={handleContainerClick}
                  className="relative aspect-[8.5/11] cursor-crosshair overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                >
                  {document.fileUrl ? (
                    <iframe
                      src={document.fileUrl}
                      className="pointer-events-none h-full w-full"
                      title="Document Preview"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <p className="text-lg font-medium">Document Preview</p>
                        <p className="text-sm">
                          Unable to load document preview
                        </p>
                      </div>
                    </div>
                  )}

                  {fields
                    .filter((f) => f.pageNumber === currentPage)
                    .map((field) => (
                      <div
                        key={field.id}
                        className={`absolute flex cursor-move items-center justify-center rounded border-2 border-dashed ${getRecipientColor(
                          field.recipientId
                        )} bg-opacity-20`}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          width: `${field.width}%`,
                          height: `${field.height}%`,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <GripVerticalIcon className="h-3 w-3 text-gray-500" />
                          <span className="text-xs font-medium">
                            {field.type.replace("_", " ")}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
                            className="ml-1 rounded p-0.5 hover:bg-red-100"
                          >
                            <Trash2Icon className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Recipient</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedRecipient}
                  onValueChange={setSelectedRecipient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {document.recipients?.map((recipient: any) => (
                      <SelectItem key={recipient.id} value={recipient.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getRecipientColor(
                              recipient.id
                            )}`}
                          />
                          {recipient.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Field Types</CardTitle>
                <CardDescription className="text-xs">
                  Select a field type, then click on the document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {fieldTypes.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedFieldType(type)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors ${
                        selectedFieldType === type
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Placed Fields</CardTitle>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No fields placed yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field) => {
                      const recipient = document.recipients?.find(
                        (r: any) => r.id === field.recipientId
                      );
                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between rounded border p-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${getRecipientColor(
                                field.recipientId
                              )}`}
                            />
                            <span>{field.type.replace("_", " ")}</span>
                          </div>
                          <button
                            onClick={() => removeField(field.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
