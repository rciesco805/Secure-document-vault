"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/loading-spinner";

type PublicDataroomProps = {
  dataroom: {
    name: string;
    pId: string;
  };
  brand: {
    logo: string | null;
    banner: string | null;
    brandColor: string | null;
    accentColor: string | null;
    welcomeMessage: string | null;
  } | null;
  ogImage: string | null;
  ogTitle: string;
  ogDescription: string;
};

export default function PublicDataroomPageClient({
  dataroom,
  brand,
  ogImage,
  ogTitle,
  ogDescription,
}: PublicDataroomProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    company: "",
  });

  const formSchema = z.object({
    email: z.string().trim().email("Please enter a valid email"),
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    company: z.string().trim().min(2, "Company must be at least 2 characters"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = formSchema.safeParse(form);
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || "Please fill in all fields correctly");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/request-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        toast.success("Request sent! We'll be in touch soon.");
        setDialogOpen(false);
        setForm({ email: "", fullName: "", company: "" });
      } else {
        toast.error("Failed to send request. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const accentColor = brand?.accentColor || "#14b8a6";
  const bannerImage = brand?.banner || "/_static/bf-golf-ball.png";
  const logoImage = brand?.logo || "/_static/bfg-logo-white.png";

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-20 p-6">
        <Link href="/">
          <img
            src={logoImage}
            alt="Logo"
            className="h-10 w-auto"
          />
        </Link>
      </header>

      <div className="relative flex min-h-screen items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${bannerImage})`,
            filter: "brightness(0.4)",
          }}
        />
        
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h1 
            className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl"
            style={{ color: accentColor }}
          >
            {dataroom.name}
          </h1>
          
          {brand?.welcomeMessage ? (
            <p className="mb-8 text-lg text-gray-300 md:text-xl">
              {brand.welcomeMessage}
            </p>
          ) : (
            <p className="mb-8 text-lg text-gray-300 md:text-xl">
              Secure investor document sharing platform.<br />
              Request access to view confidential materials.
            </p>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="px-8 py-6 text-lg font-semibold"
                style={{ 
                  backgroundColor: accentColor,
                  color: "white",
                }}
              >
                Request Access
              </Button>
            </DialogTrigger>
            <DialogContent className="border-gray-700 bg-gray-900 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Request Access</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Submit your details to request access to {dataroom.name}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Smith"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-gray-300">Company</Label>
                  <Input
                    id="company"
                    placeholder="Acme Capital"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={loading}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                    style={{ backgroundColor: accentColor }}
                  >
                    {loading ? "Sending..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <p className="mt-12 text-sm text-gray-500">
            Powered by BF Fund Dataroom
          </p>
        </div>
      </div>
    </div>
  );
}
