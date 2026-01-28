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
  MapPinIcon,
  PlusIcon,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import { useSignatureTemplate } from "@/lib/swr/use-signature-templates";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  { type: "ADDRESS", label: "Address", icon: MapPinIcon },
  { type: "TEXT", label: "Text", icon: TypeIcon },
  { type: "CHECKBOX", label: "Checkbox", icon: CheckSquareIcon },
];

interface PlacedField {
  id: string;
  type: string;
  recipientIndex: number;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

interface RecipientRole {
  role: string;
  name: string;
  order: number;
}

const defaultRoles: RecipientRole[] = [
  { role: "SIGNER", name: "Signer 1", order: 1 },
];

const roleColors = [
  { bg: "bg-blue-500", border: "border-blue-500" },
  { bg: "bg-green-500", border: "border-green-500" },
  { bg: "bg-purple-500", border: "border-purple-500" },
  { bg: "bg-orange-500", border: "border-orange-500" },
  { bg: "bg-pink-500", border: "border-pink-500" },
];

export default function PrepareTemplatePage() {
  const router = useRouter();
  const { id } = router.query;
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { template, loading, mutate } = useSignatureTemplate(id as string);
  const [roles, setRoles] = useState<RecipientRole[]>(defaultRoles);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number>(0);
  const [selectedFieldType, setSelectedFieldType] = useState<string>("SIGNATURE");
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, fieldX: 0, fieldY: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  useEffect(() => {
    if (template) {
      if (template.defaultRecipients && Array.isArray(template.defaultRecipients)) {
        const parsedRoles = template.defaultRecipients as RecipientRole[];
        if (parsedRoles.length > 0) {
          setRoles(parsedRoles);
          setSelectedRoleIndex(0);
        }
      }
      if (template.fields && Array.isArray(template.fields)) {
        setFields(template.fields as PlacedField[]);
      }
      if (template.fileUrl) {
        setPdfUrl(template.fileUrl);
      } else if (template.file) {
        fetchSignedUrl(template.file);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const fetchSignedUrl = async (fileKey: string) => {
    if (!teamId) return;
    try {
      const response = await fetch(`/api/teams/${teamId}/documents/signed-url?key=${encodeURIComponent(fileKey)}`);
      if (response.ok) {
        const { url } = await response.json();
        setPdfUrl(url);
      }
    } catch (error) {
      console.error("Failed to fetch signed URL:", error);
    }
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const handlePageClick = (e: React.MouseEvent) => {
    if (!pageRef.current || resizing || dragging) return;

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
      id: `field-${Date.now()}`,
      type: selectedFieldType,
      recipientIndex: selectedRoleIndex,
      pageNumber: currentPage,
      x: Math.max(0, Math.min(x - fieldConfig.width / 2, 100 - fieldConfig.width)),
      y: Math.max(0, Math.min(y - fieldConfig.height / 2, 100 - fieldConfig.height)),
      width: fieldConfig.width,
      height: fieldConfig.height,
      label: "",
      placeholder: "",
      required: true,
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
      case "ADDRESS":
        return { width: 25, height: 6 };
      default:
        return { width: 15, height: 4 };
    }
  };

  const handleDragStart = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    setDragging(fieldId);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
    });
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

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;
      
      const field = fields.find(f => f.id === dragging);
      if (!field) return;
      
      const newX = Math.max(0, Math.min(100 - field.width, dragStart.fieldX + deltaX));
      const newY = Math.max(0, Math.min(100 - field.height, dragStart.fieldY + deltaY));
      
      setFields(fields.map(f => 
        f.id === dragging ? { ...f, x: newX, y: newY } : f
      ));
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragStart, fields]);

  const handleSave = async () => {
    if (!teamId || !template) return;
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-templates/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fields,
            defaultRecipients: roles,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save template");

      toast.success("Template saved successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const addRole = () => {
    const newRoleNumber = roles.length + 1;
    const newRole: RecipientRole = {
      role: "SIGNER",
      name: `Signer ${newRoleNumber}`,
      order: newRoleNumber,
    };
    const newRoles = [...roles, newRole];
    setRoles(newRoles);
    setSelectedRoleIndex(newRoles.length - 1);
  };

  const getRoleColor = (roleIndex: number) => {
    return roleColors[roleIndex % roleColors.length];
  };

  const selectedRole = roles[selectedRoleIndex];

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

  if (!template) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium">Template not found</h3>
            <Link href="/settings/sign">
              <Button className="mt-4">Back to Templates</Button>
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
            <Link href="/settings/sign">
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Edit Template: {template.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Click on the document to place signature fields for each recipient role
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
            <Link href="/settings/sign">
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
                      {pdfUrl ? (
                        <Document
                          file={pdfUrl}
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
                            className={`field-box absolute flex items-center justify-center rounded border-2 ${
                              selectedFieldId === field.id 
                                ? 'border-solid border-primary ring-2 ring-primary/50' 
                                : `border-dashed ${getRoleColor(field.recipientIndex).border}`
                            } ${dragging === field.id ? 'cursor-grabbing' : 'cursor-grab'} bg-white/80`}
                            style={{
                              left: `${field.x}%`,
                              top: `${field.y}%`,
                              width: `${field.width}%`,
                              height: `${field.height}%`,
                            }}
                            onClick={(e) => selectField(field.id, e)}
                            onMouseDown={(e) => handleDragStart(field.id, e)}
                          >
                            <div className="pointer-events-none flex items-center gap-1 overflow-hidden px-1">
                              <GripVerticalIcon className="h-3 w-3 flex-shrink-0 text-gray-600" />
                              <span className="truncate text-xs font-medium text-black">
                                {field.label || field.type.replace("_", " ")}
                              </span>
                              {field.required && (
                                <span className="text-red-500">*</span>
                              )}
                            </div>
                            
                            {selectedFieldId === field.id && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeField(field.id);
                                  }}
                                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <Trash2Icon className="h-3 w-3" />
                                </button>
                                <div
                                  className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm bg-primary"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleResizeStart(field.id, e);
                                  }}
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
                <CardTitle className="text-base">Recipient Roles</CardTitle>
                <CardDescription className="text-xs">
                  Define placeholder roles for signers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={String(selectedRoleIndex)}
                  onValueChange={(val) => setSelectedRoleIndex(parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role, index) => (
                      <SelectItem key={index} value={String(index)}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${getRoleColor(index).bg}`} />
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="w-full" onClick={addRole}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Signer Role
                </Button>
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
                  {fieldTypes.map((field) => (
                    <Button
                      key={field.type}
                      variant={selectedFieldType === field.type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFieldType(field.type)}
                      className="justify-start"
                    >
                      <field.icon className="mr-2 h-4 w-4" />
                      <span className="truncate text-xs">{field.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedField && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SettingsIcon className="h-4 w-4" />
                    Field Properties
                  </CardTitle>
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
                          const value = Math.max(3, Math.min(30, parseInt(e.target.value) || 3));
                          updateFieldProperty(selectedField.id, "height", value);
                        }}
                        min={3}
                        max={30}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="field-required"
                      checked={selectedField.required}
                      onCheckedChange={(checked) => 
                        updateFieldProperty(selectedField.id, "required", checked)
                      }
                    />
                    <Label htmlFor="field-required" className="text-sm">
                      Required field
                    </Label>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => removeField(selectedField.id)}
                  >
                    <Trash2Icon className="mr-2 h-4 w-4" />
                    Remove Field
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
