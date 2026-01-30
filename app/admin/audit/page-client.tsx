"use client";

import Link from "next/link";
import { AuditDashboard } from "@/components/admin/audit-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

interface AuditPageClientProps {
  teamId: string;
  teamName: string;
}

export default function AuditPageClient({ teamId, teamName }: AuditPageClientProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Compliance Audit
                </h1>
                <p className="text-sm text-muted-foreground">{teamName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuditDashboard teamId={teamId} />
      </main>
    </div>
  );
}
