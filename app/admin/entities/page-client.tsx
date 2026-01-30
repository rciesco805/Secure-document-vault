"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Briefcase,
  Plus,
  Loader2,
  Users,
  Trash2,
} from "lucide-react";

interface Entity {
  id: string;
  name: string;
  description: string | null;
  mode: "FUND" | "STARTUP";
  _count: { investors: number };
  createdAt: string;
}

export default function EntitiesPageClient() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newEntity, setNewEntity] = useState({
    name: "",
    description: "",
    mode: "FUND" as "FUND" | "STARTUP",
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  async function fetchEntities() {
    try {
      const res = await fetch("/api/admin/entities");
      if (res.ok) {
        const data = await res.json();
        setEntities(data);
      }
    } catch (error) {
      console.error("Error fetching entities:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createEntity() {
    if (!newEntity.name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntity),
      });

      if (res.ok) {
        setShowDialog(false);
        setNewEntity({ name: "", description: "", mode: "FUND" });
        fetchEntities();
      }
    } catch (error) {
      console.error("Error creating entity:", error);
    } finally {
      setCreating(false);
    }
  }

  async function toggleMode(entity: Entity) {
    const newMode = entity.mode === "FUND" ? "STARTUP" : "FUND";
    try {
      const res = await fetch(`/api/admin/entities/${entity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });

      if (res.ok) {
        fetchEntities();
      }
    } catch (error) {
      console.error("Error updating entity:", error);
    }
  }

  async function deleteEntity(id: string) {
    if (!confirm("Are you sure you want to delete this entity?")) return;

    try {
      const res = await fetch(`/api/admin/entities/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchEntities();
      }
    } catch (error) {
      console.error("Error deleting entity:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Entities</h1>
            <p className="text-muted-foreground">
              Manage your funds and startups
            </p>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Entity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Entity</DialogTitle>
                <DialogDescription>
                  Add a new fund or startup entity to manage
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newEntity.name}
                    onChange={(e) =>
                      setNewEntity({ ...newEntity, name: e.target.value })
                    }
                    placeholder="Entity name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEntity.description}
                    onChange={(e) =>
                      setNewEntity({
                        ...newEntity,
                        description: e.target.value,
                      })
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Entity Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      {newEntity.mode === "FUND"
                        ? "Traditional fund with LP/GP, units, capital calls"
                        : "Startup with cap table, shares, vesting"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={newEntity.mode === "FUND" ? "font-medium" : "text-muted-foreground"}>
                      Fund
                    </span>
                    <Switch
                      checked={newEntity.mode === "STARTUP"}
                      onCheckedChange={(checked) =>
                        setNewEntity({
                          ...newEntity,
                          mode: checked ? "STARTUP" : "FUND",
                        })
                      }
                    />
                    <span className={newEntity.mode === "STARTUP" ? "font-medium" : "text-muted-foreground"}>
                      Startup
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createEntity} disabled={creating || !newEntity.name.trim()}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Entity
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {entities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No entities yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first fund or startup entity to get started
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Entity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity) => (
              <Card key={entity.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {entity.mode === "FUND" ? (
                        <Briefcase className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Building2 className="h-5 w-5 text-purple-500" />
                      )}
                      <CardTitle className="text-lg">{entity.name}</CardTitle>
                    </div>
                    <Badge variant={entity.mode === "FUND" ? "default" : "secondary"}>
                      {entity.mode}
                    </Badge>
                  </div>
                  {entity.description && (
                    <CardDescription className="mt-2">
                      {entity.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {entity._count.investors} investor{entity._count.investors !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Mode:</span>
                      <Switch
                        checked={entity.mode === "STARTUP"}
                        onCheckedChange={() => toggleMode(entity)}
                      />
                      <span className="text-sm font-medium">
                        {entity.mode === "FUND" ? "Fund" : "Startup"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEntity(entity.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link href="/admin/fund">
            <Button variant="outline">
              Back to Funds
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
