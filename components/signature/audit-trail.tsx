import { useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MonitorIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { SignatureRecipient, SignatureDocument } from "@/lib/swr/use-signature-documents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AuditEvent {
  id: string;
  type: "created" | "sent" | "viewed" | "signed" | "declined" | "completed" | "voided";
  title: string;
  description?: string;
  timestamp: Date;
  actor?: string;
  details?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    reason?: string | null;
  };
}

function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  
  let browser = "Unknown browser";
  let os = "Unknown OS";
  
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";
  
  return `${browser} on ${os}`;
}

function getEventIcon(type: AuditEvent["type"]) {
  switch (type) {
    case "created":
      return <FileTextIcon className="h-4 w-4 text-gray-500" />;
    case "sent":
      return <SendIcon className="h-4 w-4 text-blue-500" />;
    case "viewed":
      return <EyeIcon className="h-4 w-4 text-yellow-500" />;
    case "signed":
      return <CheckCircle2Icon className="h-4 w-4 text-green-500" />;
    case "declined":
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    case "completed":
      return <CheckCircle2Icon className="h-4 w-4 text-green-600" />;
    case "voided":
      return <XCircleIcon className="h-4 w-4 text-gray-500" />;
    default:
      return <ClockIcon className="h-4 w-4 text-gray-500" />;
  }
}

function getEventBgColor(type: AuditEvent["type"]) {
  switch (type) {
    case "created":
      return "bg-gray-100 dark:bg-gray-800";
    case "sent":
      return "bg-blue-100 dark:bg-blue-900";
    case "viewed":
      return "bg-yellow-100 dark:bg-yellow-900";
    case "signed":
      return "bg-green-100 dark:bg-green-900";
    case "declined":
      return "bg-red-100 dark:bg-red-900";
    case "completed":
      return "bg-green-100 dark:bg-green-900";
    case "voided":
      return "bg-gray-100 dark:bg-gray-800";
    default:
      return "bg-gray-100 dark:bg-gray-800";
  }
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AuditTrailProps {
  document: SignatureDocument;
}

export default function AuditTrail({ document }: AuditTrailProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const events: AuditEvent[] = [];

  events.push({
    id: "created",
    type: "created",
    title: "Document created",
    timestamp: new Date(document.createdAt),
  });

  if (document.sentAt) {
    events.push({
      id: "sent",
      type: "sent",
      title: "Sent for signature",
      description: `Sent to ${document.recipients.length} recipient(s)`,
      timestamp: new Date(document.sentAt),
    });
  }

  document.recipients.forEach((recipient) => {
    if (recipient.viewedAt) {
      events.push({
        id: `viewed-${recipient.id}`,
        type: "viewed",
        title: `${recipient.name} viewed the document`,
        actor: recipient.email,
        timestamp: new Date(recipient.viewedAt),
        details: {
          ipAddress: recipient.ipAddress,
          userAgent: recipient.userAgent,
        },
      });
    }

    if (recipient.signedAt && recipient.status === "SIGNED") {
      events.push({
        id: `signed-${recipient.id}`,
        type: "signed",
        title: `${recipient.name} signed the document`,
        actor: recipient.email,
        timestamp: new Date(recipient.signedAt),
        details: {
          ipAddress: recipient.ipAddress,
          userAgent: recipient.userAgent,
        },
      });
    }

    if (recipient.declinedAt && recipient.status === "DECLINED") {
      events.push({
        id: `declined-${recipient.id}`,
        type: "declined",
        title: `${recipient.name} declined to sign`,
        actor: recipient.email,
        timestamp: new Date(recipient.declinedAt),
        details: {
          ipAddress: recipient.ipAddress,
          userAgent: recipient.userAgent,
          reason: recipient.declinedReason,
        },
      });
    }
  });

  if (document.completedAt) {
    events.push({
      id: "completed",
      type: "completed",
      title: "All signatures collected",
      description: "Document is now legally binding",
      timestamp: new Date(document.completedAt),
    });
  }

  if (document.voidedAt) {
    events.push({
      id: "voided",
      type: "voided",
      title: "Document voided",
      timestamp: new Date(document.voidedAt),
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {events.map((event) => {
            const hasDetails = event.details?.ipAddress || event.details?.userAgent || event.details?.reason;
            const isExpanded = expandedEvents.has(event.id);

            return (
              <div key={event.id} className="relative">
                <Collapsible open={isExpanded} onOpenChange={() => hasDetails && toggleEvent(event.id)}>
                  <div
                    className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                      hasDetails ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : ""
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getEventBgColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        {hasDetails && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? (
                                <ChevronUpIcon className="h-4 w-4" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(event.timestamp)}
                      </p>
                    </div>
                  </div>

                  {hasDetails && (
                    <CollapsibleContent>
                      <div className="ml-11 space-y-2 rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800">
                        {event.details?.ipAddress && (
                          <div className="flex items-center gap-2">
                            <GlobeIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">IP Address:</span>
                            <span className="font-mono">{event.details.ipAddress}</span>
                          </div>
                        )}
                        {event.details?.userAgent && (
                          <div className="flex items-center gap-2">
                            <MonitorIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Device:</span>
                            <span>{parseUserAgent(event.details.userAgent)}</span>
                          </div>
                        )}
                        {event.details?.reason && (
                          <div className="flex items-start gap-2">
                            <MailIcon className="mt-0.5 h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Reason:</span>
                            <span>{event.details.reason}</span>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
