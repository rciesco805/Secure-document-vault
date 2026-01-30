"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderIcon, LandmarkIcon, Loader2 } from "lucide-react";

interface UserPermissions {
  hasDataroomAccess: boolean;
  hasFundroomAccess: boolean;
  isSuperAdmin: boolean;
  teams: {
    id: string;
    name: string;
    role: string;
    hasFundroomAccess: boolean;
  }[];
}

export default function HubPageClient() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch("/api/user/permissions");
        if (res.ok) {
          const data = await res.json();
          setPermissions(data);
        }
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPermissions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/_static/bfg-logo-black.png"
              alt="BF Fund"
              width={180}
              height={48}
              className="dark:hidden"
            />
            <Image
              src="/_static/bfg-logo-white.png"
              alt="BF Fund"
              width={180}
              height={48}
              className="hidden dark:block"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to BF Fund</h1>
          <p className="text-muted-foreground">
            Choose which area you&apos;d like to access
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {permissions?.hasDataroomAccess && (
            <Link href="/dashboard" className="block">
              <Card className="h-full hover:shadow-lg transition-all hover:border-primary cursor-pointer group">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <FolderIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">Dataroom</CardTitle>
                  <CardDescription>
                    Secure document sharing and investor communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Upload and share documents</li>
                    <li>Manage dataroom access</li>
                    <li>Track visitor analytics</li>
                    <li>E-signature management</li>
                  </ul>
                  <Button className="mt-6 w-full" variant="outline">
                    Enter Dataroom
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}

          {permissions?.hasFundroomAccess && (
            <Link href="/admin/fund" className="block">
              <Card className="h-full hover:shadow-lg transition-all hover:border-primary cursor-pointer group">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <LandmarkIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl">Fundroom</CardTitle>
                  <CardDescription>
                    Fund management and investor relations
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Fund overview and metrics</li>
                    <li>Investor management</li>
                    <li>Capital calls and distributions</li>
                    <li>Subscription tracking</li>
                  </ul>
                  <Button className="mt-6 w-full" variant="outline">
                    Enter Fundroom
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {permissions?.isSuperAdmin && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            You have super admin access to all areas.
          </p>
        )}
      </div>
    </div>
  );
}
