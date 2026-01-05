import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  SettingsIcon,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import { useSignatureDocument } from "@/lib/swr/use-signature-documents";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  label?: string;
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
  const [numPages, setNumPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const selectedField = fields.find(f => f.id === selectedFieldId);

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
          label: f.label || "",
        }))
      );
    }
  }, [document]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const handlePageClick = (e: React.MouseEvent) => {
    if (!pageRef.current || !selectedRecipient || resizing) return;

    const target = e.target as HTMLElement;
    if (target.closest('.field-box')) {
      return;
    }

    setSelectedFieldId(null);

    const rect = pageRef.current.getBoundingClientRect();
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
      label: "",
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
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
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    toast.success("Field removed");
  };

  const selectField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFieldId(fieldId);
  };

  const updateFieldProperty = (fieldId: string, property: keyof PlacedField, value: any) => {
    setFields(fields.map(f => 
      f.id === fieldId ? { ...f, [property]: value } : f
    ));
  };

  const handleResizeStart = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setResizing(fieldId);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: field.width,
      height: field.height,
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;
      
      const newWidth = Math.max(5, Math.min(50, resizeStart.width + deltaX));
      const newHeight = Math.max(3, Math.min(30, resizeStart.height + deltaY));
      
      setFields(fields.map(f => 
        f.id === resizing ? { ...f, width: newWidth, height: newHeight } : f
      ));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, resizeStart, fields]);

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

  const getRecipientBorderColor = (recipientId: string) => {
    const colors = [
      "border-blue-500",
      "border-green-500",
      "border-purple-500",
      "border-orange-500",
      "border-pink-500",
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
                <div className="flex items-center justify-between border-b bg-gray-100 px-4 py-2 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {numPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                      disabled={currentPage >= numPages}
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                    >
                      <ZoomOutIcon className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">{Math.round(scale * 100)}%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setScale(Math.min(2, scale + 0.25))}
                    >
                      <ZoomInIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div 
                  ref={containerRef}
                  className="max-h-[70vh] overflow-auto bg-gray-200 p-4 dark:bg-gray-700"
                >
                  <div className="flex justify-center">
                    <div 
                      ref={pageRef}
                      onClick={handlePageClick}
                      className="relative cursor-crosshair shadow-lg"
                    >
                      {document.fileUrl ? (
                        <Document
                          file={document.fileUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={
                            <div className="flex h-96 w-full items-center justify-center bg-white">
                              <p>Loading PDF...</p>
                            </div>
                          }
                        >
                          <Page
                            pageNumber={currentPage}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </Document>
                      ) : (
                        <div className="flex h-96 w-full items-center justify-center bg-white text-muted-foreground">
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
                            className={`field-box absolute flex cursor-pointer items-center justify-center rounded border-2 ${
                              selectedFieldId === field.id 
                                ? 'border-solid border-primary ring-2 ring-primary/50' 
                                : `border-dashed ${getRecipientBorderColor(field.recipientId)}`
                            } bg-white/80`}
                            style={{
                              left: `${field.x}%`,
                              top: `${field.y}%`,
                              width: `${field.width}%`,
                              height: `${field.height}%`,
                            }}
                            onClick={(e) => selectField(field.id, e)}
                          >
                            <div className="flex items-center gap-1 overflow-hidden px-1">
                              <GripVerticalIcon className="h-3 w-3 flex-shrink-0 text-gray-600" />
                              <span className="truncate text-xs font-medium text-black">
                                {field.label || field.type.replace("_", " ")}
                              </span>
                            </div>
                            
                            {selectedFieldId === field.id && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeField(field.id);
                                  }}
                                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
                                >
                                  <Trash2Icon className="h-3 w-3" />
                                </button>
                                <div
                                  className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm bg-primary"
                                  onMouseDown={(e) => handleResizeStart(field.id, e)}
                                />
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
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

            {selectedField ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SettingsIcon className="h-4 w-4" />
                    Field Properties
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Edit the selected field
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Field Type</Label>
                    <p className="text-sm font-medium">{selectedField.type.replace("_", " ")}</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="field-label" className="text-xs">Label / Placeholder</Label>
                    <Input
                      id="field-label"
                      value={selectedField.label || ""}
                      onChange={(e) => updateFieldProperty(selectedField.id, "label", e.target.value)}
                      placeholder={selectedField.type.replace("_", " ")}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="field-width" className="text-xs">Width %</Label>
                      <Input
                        id="field-width"
                        type="number"
                        value={Math.round(selectedField.width)}
                        onChange={(e) => {
                          const value = Math.max(5, Math.min(50, parseInt(e.target.value) || 5));
                          updateFieldProperty(selectedField.id, "width", value);
                        }}
                        min={5}
                        max={50}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field-height" className="text-xs">Height %</Label>
                      <Input
                        id="field-height"
                        type="number"
                        value={Math.round(selectedField.height)}
                        onChange={(e) => {
                          const value = Math.max(2, Math.min(20, parseInt(e.target.value) || 2));
                          updateFieldProperty(selectedField.id, "height", value);
                        }}
                        min={2}
                        max={20}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => removeField(selectedField.id)}
                  >
                    <Trash2Icon className="mr-2 h-4 w-4" />
                    Delete Field
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Placed Fields</CardTitle>
                <CardDescription className="text-xs">
                  Click a field to edit its properties
                </CardDescription>
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
                          onClick={() => {
                            setSelectedFieldId(field.id);
                            setCurrentPage(field.pageNumber);
                          }}
                          className={`flex cursor-pointer items-center justify-between rounded border p-2 text-sm transition-colors ${
                            selectedFieldId === field.id
                              ? "border-primary bg-primary/10"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${getRecipientColor(
                                field.recipientId
                              )}`}
                            />
                            <span className="truncate">
                              {field.label || field.type.replace("_", " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (p.{field.pageNumber})
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
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
