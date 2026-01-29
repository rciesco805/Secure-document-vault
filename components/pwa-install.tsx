import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(isIOSDevice);

      const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      if (!isStandalone && !sessionStorage.getItem("pwa-prompt-dismissed")) {
        const timer = setTimeout(() => {
          if (deferredPrompt || isIOSDevice) {
            setShowPrompt(true);
          }
        }, 30000);
        return () => clearTimeout(timer);
      }
    }
  }, [deferredPrompt]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const swUrl = `/sw.js?v=${Date.now()}`;
      
      navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' }).then((registration) => {
        registration.update();
        
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("New version available, activating immediately...");
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      }).catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
          <Smartphone className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install BF Fund App</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isIOS
              ? "Tap the share button and select 'Add to Home Screen' for quick access."
              : "Install our app for faster access and offline support."}
          </p>
          {!isIOS && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return { isInstalled, isOnline };
}
