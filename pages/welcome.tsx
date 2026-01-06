import { useRouter } from "next/router";

import { useEffect, useRef } from "react";
import { useState } from "react";

import DataroomTemplates from "@/ee/features/templates/components/dataroom-templates";
import { sendGTMEvent } from "@next/third-parties/google";
import { ArrowLeft as ArrowLeftIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";

import { CustomUser } from "@/lib/types";
import { cn } from "@/lib/utils";

import { GTMComponent } from "@/components/gtm-component";
import { Button } from "@/components/ui/button";
import Dataroom from "@/components/welcome/dataroom";
import DataroomAIGenerate from "@/components/welcome/dataroom-ai-generate";
import DataroomChoice from "@/components/welcome/dataroom-choice";
import DataroomTrial from "@/components/welcome/dataroom-trial";
import DataroomUpload from "@/components/welcome/dataroom-upload";
import Intro from "@/components/welcome/intro";
import Next from "@/components/welcome/next";
import NotionForm from "@/components/welcome/notion-form";
import Select from "@/components/welcome/select";
import Upload from "@/components/welcome/upload";

export default function Welcome() {
  const router = useRouter();
  const [showSkipButtons, setShowSkipButtons] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const { data: session, status } = useSession();
  const signupEventSent = useRef(false);
  const adminCheckDone = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkipButtons(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function checkAdminStatus() {
      if (status !== "authenticated" || !session?.user || adminCheckDone.current) {
        return;
      }
      
      adminCheckDone.current = true;
      
      try {
        const res = await fetch("/api/teams");
        const data = await res.json();
        
        if (!data || data.length === 0) {
          router.replace("/viewer-portal");
          return;
        }
        
        setIsCheckingAdmin(false);
      } catch (error) {
        router.replace("/viewer-portal");
      }
    }
    
    if (status === "authenticated") {
      checkAdminStatus();
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, session, router]);

  useEffect(() => {
    const user = session?.user as CustomUser;

    if (user?.createdAt && !signupEventSent.current) {
      const isNewUser = new Date(user.createdAt).getTime() > Date.now() - 10000;

      if (isNewUser) {
        sendGTMEvent({ event: "signup" });
        signupEventSent.current = true;
      }
    }
  }, [session]);

  const isDataroomUpload = router.query.type === "dataroom-upload";
  const isDataroomChoice = router.query.type === "dataroom-choice";
  const isDataroomTemplates = router.query.type === "dataroom-templates";
  const isDataroomAIGenerate = router.query.type === "dataroom-ai-generate";

  const skipButtonText =
    isDataroomUpload || isDataroomChoice || isDataroomTemplates || isDataroomAIGenerate
      ? "Skip to dataroom"
      : "Skip to dashboard";
  const skipButtonPath =
    (isDataroomUpload || isDataroomChoice || isDataroomTemplates) &&
    router.query.dataroomId
      ? `/datarooms/${router.query.dataroomId}`
      : "/documents";

  if (isCheckingAdmin || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <GTMComponent />
      <div className="mx-auto flex h-screen max-w-3xl flex-col items-center justify-center overflow-x-hidden">
        <AnimatePresence mode="wait">
          {router.query.type ? (
            <>
              <button
                className="group absolute left-2 top-10 z-40 rounded-full p-2 transition-all hover:bg-gray-400 sm:left-10"
                onClick={() => router.back()}
              >
                <ArrowLeftIcon className="h-8 w-8 text-gray-500 group-hover:text-gray-800 group-active:scale-90" />
              </button>

              <Button
                variant={"link"}
                onClick={() => router.push(skipButtonPath)}
                className={cn(
                  "absolute right-2 top-10 z-40 p-2 text-muted-foreground sm:right-10",
                  showSkipButtons ? "block" : "hidden",
                )}
              >
                {skipButtonText}
              </Button>
            </>
          ) : (
            <Intro key="intro" />
          )}
          {router.query.type === "next" && <Next key="next" />}
          {router.query.type === "select" && <Select key="select" />}
          {router.query.type === "pitchdeck" && <Upload key="pitchdeck" />}
          {router.query.type === "document" && <Upload key="document" />}
          {router.query.type === "sales-document" && (
            <Upload key="sales-document" />
          )}
          {router.query.type === "notion" && <NotionForm key="notion" />}
          {router.query.type === "dataroom" && <Dataroom key="dataroom" />}
          {router.query.type === "dataroom-trial" && (
            <DataroomTrial key="dataroom-trial" />
          )}
          {router.query.type === "dataroom-choice" &&
            router.query.dataroomId && (
              <DataroomChoice
                key="dataroom-choice"
                dataroomId={router.query.dataroomId as string}
              />
            )}
          {router.query.type === "dataroom-templates" &&
            router.query.dataroomId && (
              <DataroomTemplates
                key="dataroom-templates"
                dataroomId={router.query.dataroomId as string}
              />
            )}
          {router.query.type === "dataroom-upload" &&
            router.query.dataroomId && (
              <DataroomUpload
                key="dataroom-upload"
                dataroomId={router.query.dataroomId as string}
              />
            )}
          {router.query.type === "dataroom-ai-generate" && (
            <DataroomAIGenerate key="dataroom-ai-generate" />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
