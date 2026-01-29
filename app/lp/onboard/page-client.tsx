"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Building2, Mail, User, CheckCircle2 } from "lucide-react";

export default function LPOnboardClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    entityName: "",
  });
  const [error, setError] = useState("");
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    setError("");
    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/lp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Registration failed");
      }

      const result = await signIn("email", {
        email: formData.email,
        redirect: false,
        callbackUrl: "/lp/dashboard",
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      isSubmittingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Your Info" },
    { number: 2, title: "Entity" },
    { number: 3, title: "Verify" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-white">BF Fund</h1>
          </Link>
          <p className="text-gray-400 mt-2">Investor Portal</p>
        </div>

        <div className="flex justify-center mb-8">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.number
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {step > s.number ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  s.number
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 ${
                    step > s.number ? "bg-emerald-600" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && "Welcome, Investor"}
              {step === 2 && "Entity Information"}
              {step === 3 && "Check Your Email"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {step === 1 && "Enter your name and email to get started"}
              {step === 2 && "Tell us about your investing entity"}
              {step === 3 && "We sent you a magic link to verify your email"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 3 ? (
              <div className="text-center py-8">
                <Mail className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-300 mb-2">
                  We sent a verification link to:
                </p>
                <p className="text-white font-medium mb-6">{formData.email}</p>
                <p className="text-gray-400 text-sm">
                  Click the link in your email to access your investor dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); setStep(2); }}>
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-300">
                        Full Name
                      </Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Smith"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                          className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-300">
                        Email Address
                      </Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                          className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="entityName" className="text-gray-300">
                        Entity Name (Optional)
                      </Label>
                      <div className="relative mt-1">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          id="entityName"
                          type="text"
                          placeholder="Smith Family Trust, LLC, etc."
                          value={formData.entityName}
                          onChange={(e) =>
                            setFormData({ ...formData, entityName: e.target.value })
                          }
                          className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        Leave blank if investing as an individual
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-red-400 text-sm mt-4">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isLoading || (step === 1 && (!formData.name || !formData.email))}
                >
                  {isLoading ? (
                    "Processing..."
                  ) : step === 1 ? (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                {step === 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full mt-2 text-gray-400 hover:text-white"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
