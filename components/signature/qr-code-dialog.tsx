import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCodeIcon, DownloadIcon, CopyIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";

interface Recipient {
  id: string;
  name: string;
  email: string;
  signingUrl: string | null;
  status: string;
}

interface QRCodeDialogProps {
  recipients: Recipient[];
  documentTitle: string;
}

export function QRCodeDialog({ recipients, documentTitle }: QRCodeDialogProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const eligibleRecipients = recipients.filter(
    (r) => r.signingUrl && r.status !== "SIGNED" && r.status !== "DECLINED"
  );

  const selectedRecipient = eligibleRecipients.find(
    (r) => r.id === selectedRecipientId
  );

  const handleCopyUrl = async () => {
    if (!selectedRecipient?.signingUrl) return;
    
    await navigator.clipboard.writeText(selectedRecipient.signingUrl);
    setCopied(true);
    toast.success("Signing link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!selectedRecipient) return;
    
    const svg = document.getElementById("signing-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx?.fillRect(0, 0, 400, 400);
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 400, 400);
      }
      ctx?.drawImage(img, 0, 0, 400, 400);
      
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `signing-qr-${selectedRecipient.name.replace(/\s+/g, "-")}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (eligibleRecipients.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCodeIcon className="mr-2 h-4 w-4" />
          In-Person Signing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>In-Person Signing</DialogTitle>
          <DialogDescription>
            Generate a QR code for recipients to sign on their phone while
            meeting in person.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Select Recipient
            </label>
            <Select
              value={selectedRecipientId}
              onValueChange={setSelectedRecipientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose who will sign..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleRecipients.map((recipient) => (
                  <SelectItem key={recipient.id} value={recipient.id}>
                    {recipient.name} ({recipient.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecipient && selectedRecipient.signingUrl && (
            <>
              <div className="flex justify-center rounded-lg border bg-white p-6">
                <QRCodeSVG
                  id="signing-qr-code"
                  value={selectedRecipient.signingUrl}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="text-center">
                <p className="text-sm font-medium">{selectedRecipient.name}</p>
                <p className="text-xs text-muted-foreground">
                  Scan to sign: {documentTitle}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <CheckIcon className="mr-2 h-4 w-4" />
                  ) : (
                    <CopyIcon className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadQR}
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Download QR
                </Button>
              </div>
            </>
          )}

          {!selectedRecipientId && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <QrCodeIcon className="mb-2 h-12 w-12 opacity-50" />
              <p>Select a recipient to generate their QR code</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
