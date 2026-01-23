"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface FundData {
  id: string;
  name: string;
  status: string;
  targetRaise: number;
  currentRaise: number;
  investorCount: number;
  aggregate: {
    thresholdEnabled: boolean;
    thresholdAmount: number | null;
    totalCommitted: number;
    totalInbound: number;
    totalOutbound: number;
  } | null;
}

export default function AdminFundDashboard() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<FundData[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [selectedFund, setSelectedFund] = useState<FundData | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchFunds();
    }
  }, [status]);

  useEffect(() => {
    if (selectedFundId && funds.length > 0) {
      const fund = funds.find((f) => f.id === selectedFundId);
      setSelectedFund(fund || null);
    }
  }, [selectedFundId, funds]);

  const fetchFunds = async () => {
    try {
      const res = await fetch("/api/admin/funds");
      if (res.ok) {
        const data = await res.json();
        setFunds(data.funds || []);
        if (data.funds?.length > 0) {
          setSelectedFundId(data.funds[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load funds:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to access this page.</p>
      </div>
    );
  }

  const aggregate = selectedFund?.aggregate;
  const thresholdEnabled = aggregate?.thresholdEnabled;
  const thresholdAmount = aggregate?.thresholdAmount || 0;
  const totalCommitted = aggregate?.totalCommitted || selectedFund?.currentRaise || 0;
  const thresholdMet = !thresholdEnabled || totalCommitted >= thresholdAmount;
  const thresholdProgress = thresholdAmount > 0 
    ? Math.min(100, Math.round((totalCommitted / thresholdAmount) * 100))
    : 100;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Fund Dashboard</h1>
          <p className="text-muted-foreground">Manage fund operations and capital calls</p>
        </div>

        {funds.length > 1 && (
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {thresholdEnabled && (
        <Card className={`mb-6 ${thresholdMet ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {thresholdMet ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                )}
                <div>
                  <p className={`font-medium ${thresholdMet ? "text-green-800" : "text-amber-800"}`}>
                    {thresholdMet ? "Capital Call Threshold Met" : "Capital Call Threshold Not Met"}
                  </p>
                  <p className={`text-sm ${thresholdMet ? "text-green-600" : "text-amber-600"}`}>
                    ${totalCommitted.toLocaleString()} / ${thresholdAmount.toLocaleString()} committed ({thresholdProgress}%)
                  </p>
                </div>
              </div>
              <Link href="/admin/settings/fund">
                <Button variant="outline" size="sm">Configure</Button>
              </Link>
            </div>

            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3 relative">
                <div
                  className={`h-3 rounded-full transition-all ${
                    thresholdMet ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${thresholdProgress}%` }}
                />
                <div
                  className="absolute top-0 w-0.5 h-3 bg-gray-800"
                  style={{ left: "100%" }}
                />
              </div>
              {!thresholdMet && (
                <p className="text-sm text-amber-700 mt-2">
                  ${(thresholdAmount - totalCommitted).toLocaleString()} more needed before capital calls can be triggered
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Committed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCommitted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Target: ${selectedFund?.targetRaise.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Capital Inbound</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(aggregate?.totalInbound || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Received from calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Distributions</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(aggregate?.totalOutbound || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Paid to investors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedFund?.investorCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active investors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Fund management operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant={thresholdMet ? "default" : "secondary"}
              disabled={!thresholdMet}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Create Capital Call
              {!thresholdMet && (
                <Badge variant="outline" className="ml-auto">Threshold Required</Badge>
              )}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingDown className="mr-2 h-4 w-4" />
              Create Distribution
            </Button>
            <Link href="/admin/settings/fund" className="block">
              <Button className="w-full justify-start" variant="outline">
                Configure Threshold Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fund Status</CardTitle>
            <CardDescription>Current fund configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Fund Status</span>
              <Badge>{selectedFund?.status || "RAISING"}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Threshold Enforcement</span>
              <Badge variant={thresholdEnabled ? "default" : "secondary"}>
                {thresholdEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            {thresholdEnabled && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Threshold Amount</span>
                  <span className="font-medium">${thresholdAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Capital Calls</span>
                  <Badge variant={thresholdMet ? "default" : "destructive"}>
                    {thresholdMet ? "Allowed" : "Blocked"}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
