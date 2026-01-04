import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  CheckCircle2Icon,
  FileTextIcon,
  PenIcon,
  XIcon,
  Loader2Icon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  TypeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ImageIcon,
  ListIcon,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface DocumentInfo {
  id: string;
  title: string;
  description: string | null;
  numPages: number | null;
  teamName: string;
  fileUrl: string | null;
}

interface FieldInfo {
  id: string;
  type: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  placeholder: string | null;
  value: string | null;
}

export default function SignDocument() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const [typedSignature, setTypedSignature] = useState("");

  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
    setPdfLoading(false);
  }, []);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(pdfNumPages, prev + 1));
  }, [pdfNumPages]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(2.0, prev + 0.1));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, prev - 0.1));
  }, []);

  useEffect(() => {
    if (token) {
      fetchDocument();
    }
  }, [token]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/sign/${token}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.alreadySigned) {
          setAlreadySigned(true);
        }
        if (response.status === 410 || data.message?.includes("expired")) {
          setIsExpired(true);
        }
        setError(data.message || "Failed to load document");
        return;
      }

      setRecipient(data.recipient);
      setDocument(data.document);
      setFields(data.fields);

      const initialValues: Record<string, string> = {};
      data.fields.forEach((field: FieldInfo) => {
        if (field.type === "NAME") {
          initialValues[field.id] = data.recipient.name;
        } else if (field.type === "EMAIL") {
          initialValues[field.id] = data.recipient.email;
        } else if (field.type === "DATE_SIGNED") {
          initialValues[field.id] = new Date().toLocaleDateString();
        } else if (field.value) {
          initialValues[field.id] = field.value;
        }
      });
      setFieldValues(initialValues);
    } catch (err) {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureData(null);
    setTypedSignature("");
  };

  const generateTypedSignatureImage = (text: string): string | null => {
    const canvas = typedCanvasRef.current;
    if (!canvas || !text.trim()) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.font = "italic 32px 'Brush Script MT', cursive, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  };

  useEffect(() => {
    if (signatureMode === "type" && typedSignature) {
      const imageData = generateTypedSignatureImage(typedSignature);
      setSignatureData(imageData);
    }
  }, [typedSignature, signatureMode]);

  const handleSubmit = async () => {
    const signatureFields = fields.filter((f) => f.type === "SIGNATURE");
    if (signatureFields.length > 0 && !signatureData) {
      if (signatureMode === "type") {
        toast.error("Please type your name to create a signature");
      } else {
        toast.error("Please draw your signature before submitting");
      }
      return;
    }

    const requiredFields = fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (field.type !== "SIGNATURE" && field.type !== "CHECKBOX") {
        if (!fieldValues[field.id]) {
          toast.error(`Please fill in all required fields`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const fieldData = fields.map((f) => ({
        id: f.id,
        value:
          f.type === "SIGNATURE"
            ? signatureData
            : fieldValues[f.id] || null,
      }));

      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: fieldData,
          signatureImage: signatureData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit signature");
      }

      setShowSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declined: true,
          declinedReason: declineReason || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to decline document");
      }

      setShowDeclineDialog(false);
      setError("You have declined to sign this document");
    } catch (err) {
      toast.error("Failed to decline document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">BF Fund Sign</h2>
          <p className="text-xs text-gray-500">Secure Document Signing</p>
        </div>
        <div className="text-center">
          <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">BF Fund Sign</h2>
          <p className="text-xs text-gray-500">Secure Document Signing</p>
        </div>
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          {alreadySigned ? (
            <>
              <CheckCircle2Icon className="mx-auto h-12 w-12 text-green-500" />
              <h1 className="mt-4 text-xl font-semibold">Already Signed</h1>
              <p className="mt-2 text-gray-600">{error}</p>
            </>
          ) : isExpired ? (
            <>
              <ClockIcon className="mx-auto h-12 w-12 text-orange-500" />
              <h1 className="mt-4 text-xl font-semibold">Document Expired</h1>
              <p className="mt-2 text-gray-600">{error}</p>
              <p className="mt-4 text-sm text-gray-500">
                Please contact the sender to request a new signing link.
              </p>
            </>
          ) : (
            <>
              <AlertTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
              <h1 className="mt-4 text-xl font-semibold">Cannot Sign Document</h1>
              <p className="mt-2 text-gray-600">{error}</p>
            </>
          )}
        </div>
        <p className="mt-8 text-xs text-gray-400">
          Powered by BF Fund Dataroom
        </p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">BF Fund Sign</h2>
          <p className="text-xs text-gray-500">Secure Document Signing</p>
        </div>
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <CheckCircle2Icon className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-semibold">
            Document Signed Successfully!
          </h1>
          <p className="mt-2 text-gray-600">
            Thank you for signing. A copy of the signed document will be sent to
            your email.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Securely signed and recorded</span>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            You can close this window now.
          </p>
        </div>
        <p className="mt-8 text-xs text-gray-400">
          Powered by BF Fund Dataroom
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign: {document?.title || "Document"} | BF Fund Sign</title>
      </Head>

      <div className="min-h-screen bg-gray-100">
        <header className="border-b bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6 text-primary" />
                <span className="font-bold text-gray-900">BF Fund Sign</span>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-lg font-semibold">{document?.title}</h1>
                <p className="text-sm text-gray-500">
                  From: {document?.teamName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeclineDialog(true)}
              >
                <XIcon className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Signing..." : "Complete Signing"}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg bg-white shadow">
                <div className="flex items-center justify-between border-b bg-gray-800 px-4 py-2 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowThumbnails(!showThumbnails)}
                      className="rounded p-1 text-gray-300 hover:bg-gray-700"
                      title="Toggle thumbnails"
                    >
                      <ListIcon className="h-4 w-4" />
                    </button>
                    <button className="rounded p-1 text-gray-300 hover:bg-gray-700">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-300 truncate max-w-xs" title={document?.title}>
                    {document?.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-gray-300">
                      <span className="text-sm">{currentPage}</span>
                      <span className="text-sm">/</span>
                      <span className="text-sm">{pdfNumPages}</span>
                    </div>
                    <button onClick={zoomOut} className="rounded p-1 text-gray-300 hover:bg-gray-700">
                      <ZoomOutIcon className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-300">{Math.round(scale * 100)}%</span>
                    <button onClick={zoomIn} className="rounded p-1 text-gray-300 hover:bg-gray-700">
                      <ZoomInIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex">
                  {showThumbnails && (
                    <div className="w-24 border-r bg-gray-900">
                      <ScrollArea className="h-[600px]">
                        <div className="p-2 space-y-2">
                          {document?.fileUrl && Array.from({ length: pdfNumPages }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`w-full rounded border-2 transition-colors ${
                                currentPage === i + 1
                                  ? "border-blue-500"
                                  : "border-transparent hover:border-gray-600"
                              }`}
                            >
                              <Document file={document.fileUrl} loading={null}>
                                <Page
                                  pageNumber={i + 1}
                                  width={72}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              </Document>
                              <span className="block text-xs text-gray-400 mt-1">{i + 1}</span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  <div className="flex-1 bg-gray-200 overflow-auto" style={{ height: "600px" }}>
                    {document?.fileUrl ? (
                      <div className="flex flex-col items-center p-4">
                        {pdfLoading && (
                          <div className="flex items-center justify-center h-96">
                            <Loader2Icon className="h-8 w-8 animate-spin text-gray-500" />
                          </div>
                        )}
                        <Document
                          file={document.fileUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={null}
                          className="flex flex-col items-center"
                        >
                          <Page
                            pageNumber={currentPage}
                            scale={scale}
                            className="shadow-lg"
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                          />
                        </Document>
                        
                        {pdfNumPages > 1 && (
                          <div className="flex items-center gap-4 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToPrevPage}
                              disabled={currentPage <= 1}
                            >
                              <ChevronLeftIcon className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToNextPage}
                              disabled={currentPage >= pdfNumPages}
                            >
                              Next
                              <ChevronRightIcon className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-500">
                        Document preview not available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
                  <PenIcon className="h-5 w-5" />
                  Your Signature
                </h2>
                
                <Tabs
                  value={signatureMode}
                  onValueChange={(v) => {
                    setSignatureMode(v as "type" | "draw");
                    if (v === "type" && typedSignature) {
                      const imageData = generateTypedSignatureImage(typedSignature);
                      setSignatureData(imageData);
                    } else if (v === "draw") {
                      const canvas = canvasRef.current;
                      if (canvas) {
                        setSignatureData(canvas.toDataURL("image/png"));
                      }
                    }
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="type" className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4" />
                      Type
                    </TabsTrigger>
                    <TabsTrigger value="draw" className="flex items-center gap-2">
                      <PenIcon className="h-4 w-4" />
                      Draw
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="type" className="mt-4">
                    <p className="mb-3 text-sm text-gray-600">
                      Type your name to create a signature
                    </p>
                    <Input
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type your full name"
                      className="mb-3"
                    />
                    {typedSignature && (
                      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-4">
                        <p
                          className="text-center text-3xl text-black"
                          style={{ fontFamily: "'Brush Script MT', cursive, serif", fontStyle: "italic" }}
                        >
                          {typedSignature}
                        </p>
                      </div>
                    )}
                    <canvas
                      ref={typedCanvasRef}
                      width={280}
                      height={120}
                      className="hidden"
                    />
                  </TabsContent>
                  
                  <TabsContent value="draw" className="mt-4">
                    <p className="mb-3 text-sm text-gray-600">
                      Draw your signature using your mouse or finger
                    </p>
                    <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white">
                      <canvas
                        ref={canvasRef}
                        width={280}
                        height={120}
                        className="cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                      {signatureMode === "draw" && !signatureData && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400">
                          Sign here
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  className="mt-2"
                >
                  Clear Signature
                </Button>
              </div>

              {fields.filter(
                (f) =>
                  f.type !== "SIGNATURE" &&
                  f.type !== "DATE_SIGNED" &&
                  f.type !== "NAME" &&
                  f.type !== "EMAIL"
              ).length > 0 && (
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="mb-4 text-lg font-medium">Additional Fields</h2>
                  <div className="space-y-4">
                    {fields
                      .filter(
                        (f) =>
                          f.type !== "SIGNATURE" &&
                          f.type !== "DATE_SIGNED" &&
                          f.type !== "NAME" &&
                          f.type !== "EMAIL"
                      )
                      .map((field) => (
                        <div key={field.id}>
                          <label className="mb-1 block text-sm font-medium">
                            {field.type.replace("_", " ")}
                            {field.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          {field.type === "CHECKBOX" ? (
                            <input
                              type="checkbox"
                              checked={fieldValues[field.id] === "true"}
                              onChange={(e) =>
                                setFieldValues({
                                  ...fieldValues,
                                  [field.id]: e.target.checked ? "true" : "",
                                })
                              }
                              className="h-5 w-5 rounded border-gray-300"
                            />
                          ) : (
                            <input
                              type="text"
                              value={fieldValues[field.id] || ""}
                              onChange={(e) =>
                                setFieldValues({
                                  ...fieldValues,
                                  [field.id]: e.target.value,
                                })
                              }
                              placeholder={field.placeholder || ""}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Signing as:</strong> {recipient?.name} (
                  {recipient?.email})
                </p>
              </div>
            </div>
          </div>
        </main>
        
        <footer className="border-t bg-white py-4">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <p className="text-xs text-gray-400">
              Powered by BF Fund Dataroom | Secure Document Signing
            </p>
          </div>
        </footer>
      </div>

      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline to Sign?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline signing this document? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium">
              Reason (optional)
            </label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Please provide a reason for declining..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Declining..." : "Decline to Sign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
