import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/test-error";

jest.mock("@/lib/rollbar", () => ({
  serverInstance: {
    error: jest.fn(),
  },
}));

describe("/api/test-error", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 405 for non-GET requests", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "POST",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: "Method not allowed" });
  });

  it("should send test error to Rollbar and return success", async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "GET",
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toBe("Test error sent to Rollbar");
    expect(data.timestamp).toBeDefined();
  });

  it("should call Rollbar serverInstance.error", async () => {
    const { serverInstance } = require("@/lib/rollbar");
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: "GET",
    });

    await handler(req, res);

    expect(serverInstance.error).toHaveBeenCalled();
    expect(serverInstance.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "test-error-route",
        timestamp: expect.any(String),
      })
    );
  });
});
