import { useState, useEffect } from "react";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { CheckIcon, GripVertical, PlusIcon, TrashIcon, SparklesIcon } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { fetcher } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

interface WelcomeScreenSettingsProps {
  dataroomId: string;
}

interface DataroomBrandWithWelcome {
  id: string;
  dataroomId: string;
  logo?: string | null;
  banner?: string | null;
  favicon?: string | null;
  brandColor?: string | null;
  accentColor?: string | null;
  welcomeMessage?: string | null;
  welcomeScreenEnabled?: boolean;
  welcomePersonalNote?: string | null;
  welcomeSuggestedViewing?: string | null;
  welcomeRecommendedDocs?: string[] | null;
}

interface DataroomDocumentWithDocument {
  id: string;
  documentId: string;
  document: {
    id: string;
    name: string;
  };
}

function SortableDocumentItem({ 
  id, 
  document, 
  onRemove 
}: { 
  id: string; 
  document: { id: string; name: string }; 
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border bg-background p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate text-sm">{document.name}</span>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="text-muted-foreground hover:text-destructive"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function WelcomeScreenSettings({ dataroomId }: WelcomeScreenSettingsProps) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data: brand, isLoading: brandLoading } = useSWR<DataroomBrandWithWelcome>(
    teamId && dataroomId ? `/api/teams/${teamId}/datarooms/${dataroomId}/branding` : null,
    fetcher
  );

  const { data: documentsData, isLoading: docsLoading } = useSWR<DataroomDocumentWithDocument[]>(
    teamId && dataroomId ? `/api/teams/${teamId}/datarooms/${dataroomId}/documents` : null,
    fetcher
  );

  const [enabled, setEnabled] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [suggestedViewing, setSuggestedViewing] = useState("");
  const [recommendedDocIds, setRecommendedDocIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDocToAdd, setSelectedDocToAdd] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (brand) {
      setEnabled(brand.welcomeScreenEnabled ?? false);
      setPersonalNote(brand.welcomePersonalNote ?? "");
      setSuggestedViewing(brand.welcomeSuggestedViewing ?? "");
      setRecommendedDocIds((brand.welcomeRecommendedDocs as string[]) ?? []);
    }
  }, [brand]);

  const allDocuments = documentsData ?? [];
  const availableDocs = allDocuments.filter(
    (doc) => !recommendedDocIds.includes(doc.id)
  );

  const recommendedDocs = recommendedDocIds
    .map((docId) => {
      const doc = allDocuments.find((d) => d.id === docId);
      return doc ? { id: doc.id, name: doc.document.name } : null;
    })
    .filter(Boolean) as { id: string; name: string }[];

  const handleAddDocument = () => {
    if (selectedDocToAdd && !recommendedDocIds.includes(selectedDocToAdd)) {
      setRecommendedDocIds([...recommendedDocIds, selectedDocToAdd]);
      setSelectedDocToAdd("");
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setRecommendedDocIds(recommendedDocIds.filter((id) => id !== docId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRecommendedDocIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (!teamId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/datarooms/${dataroomId}/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeScreenEnabled: enabled,
          welcomePersonalNote: personalNote || null,
          welcomeSuggestedViewing: suggestedViewing || null,
          welcomeRecommendedDocs: recommendedDocIds.length > 0 ? recommendedDocIds : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      await mutate(`/api/teams/${teamId}/datarooms/${dataroomId}/branding`);
      toast.success("Welcome screen settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (brandLoading || docsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome Screen</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5" />
          Welcome Screen
        </CardTitle>
        <CardDescription>
          Show a personalized welcome message when investors first visit your dataroom. 
          Help guide them to the most important documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="welcome-enabled">Enable Welcome Screen</Label>
            <p className="text-sm text-muted-foreground">
              Show splash screen when visitors enter the dataroom
            </p>
          </div>
          <Switch
            id="welcome-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="personal-note">Personal Note</Label>
              <Textarea
                id="personal-note"
                placeholder="Welcome to our investor dataroom! We're excited to share our story with you..."
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                A brief personal message from you to the investor
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggested-viewing">Suggested Viewing</Label>
              <Textarea
                id="suggested-viewing"
                placeholder="We recommend starting with the Executive Summary, followed by our Financial Projections..."
                value={suggestedViewing}
                onChange={(e) => setSuggestedViewing(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Guidance on how to navigate the dataroom and what to focus on
              </p>
            </div>

            <div className="space-y-3">
              <Label>Recommended Documents</Label>
              <p className="text-sm text-muted-foreground">
                Select key documents to highlight. Drag to reorder priority.
              </p>
              
              <div className="flex gap-2">
                <Select value={selectedDocToAdd} onValueChange={setSelectedDocToAdd}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a document to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDocs.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.document.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddDocument}
                  disabled={!selectedDocToAdd}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>

              {recommendedDocs.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={recommendedDocIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {recommendedDocs.map((doc, index) => (
                        <div key={doc.id} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <SortableDocumentItem
                              id={doc.id}
                              document={doc}
                              onRemove={handleRemoveDocument}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {recommendedDocs.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No recommended documents selected yet
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            "Saving..."
          ) : (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
