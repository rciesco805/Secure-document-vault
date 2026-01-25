import { clientConfig } from "@/lib/rollbar";

jest.mock("rollbar", () => {
  return jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }));
});

describe("Rollbar Pages Router Integration", () => {
  describe("clientConfig", () => {
    it("should have captureUncaught enabled", () => {
      expect(clientConfig.captureUncaught).toBe(true);
    });

    it("should have captureUnhandledRejections enabled", () => {
      expect(clientConfig.captureUnhandledRejections).toBe(true);
    });

    it("should have environment configured", () => {
      expect(clientConfig.environment).toBeDefined();
    });

    it("should have accessToken from environment", () => {
      expect(clientConfig.accessToken).toBe(process.env.NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN);
    });
  });

  describe("Pages Router _app.tsx", () => {
    it("should import RollbarProvider from @rollbar/react", () => {
      const fs = require("fs");
      const appContent = fs.readFileSync("pages/_app.tsx", "utf-8");
      expect(appContent).toContain("Provider as RollbarProvider");
      expect(appContent).toContain("@rollbar/react");
    });

    it("should import ErrorBoundary from @rollbar/react", () => {
      const fs = require("fs");
      const appContent = fs.readFileSync("pages/_app.tsx", "utf-8");
      expect(appContent).toContain("ErrorBoundary");
    });

    it("should wrap app with RollbarProvider", () => {
      const fs = require("fs");
      const appContent = fs.readFileSync("pages/_app.tsx", "utf-8");
      expect(appContent).toContain("<RollbarProvider config={clientConfig}>");
    });

    it("should wrap content with ErrorBoundary", () => {
      const fs = require("fs");
      const appContent = fs.readFileSync("pages/_app.tsx", "utf-8");
      expect(appContent).toContain("<ErrorBoundary>");
    });

    it("should import clientConfig from lib/rollbar", () => {
      const fs = require("fs");
      const appContent = fs.readFileSync("pages/_app.tsx", "utf-8");
      expect(appContent).toContain('import { clientConfig } from "@/lib/rollbar"');
    });
  });

  describe("App Router Error Handling", () => {
    it("should have error.tsx with Rollbar integration", () => {
      const fs = require("fs");
      const errorContent = fs.readFileSync("app/error.tsx", "utf-8");
      expect(errorContent).toContain("Rollbar");
      expect(errorContent).toContain("rollbar.error");
    });

    it("should have global-error.tsx with Rollbar integration", () => {
      const fs = require("fs");
      const globalErrorContent = fs.readFileSync("app/global-error.tsx", "utf-8");
      expect(globalErrorContent).toContain("Rollbar");
      expect(globalErrorContent).toContain("rollbar.error");
    });

    it("should have providers.tsx with Rollbar initialization", () => {
      const fs = require("fs");
      const providersContent = fs.readFileSync("app/providers.tsx", "utf-8");
      expect(providersContent).toContain("Rollbar");
      expect(providersContent).toContain("clientConfig");
    });
  });

  describe("Rollbar Configuration", () => {
    it("should have lib/rollbar.ts configuration file", () => {
      const fs = require("fs");
      expect(fs.existsSync("lib/rollbar.ts")).toBe(true);
    });

    it("should export clientConfig from lib/rollbar", () => {
      expect(clientConfig).toBeDefined();
      expect(typeof clientConfig).toBe("object");
    });

    it("should export serverInstance from lib/rollbar", () => {
      const { serverInstance } = require("@/lib/rollbar");
      expect(serverInstance).toBeDefined();
    });
  });
});
