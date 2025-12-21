import { useRouter } from "next/router";

import { determineTextColor } from "@/lib/utils/determine-text-color";

export default function NavPreviewDemo() {
  const router = useRouter();
  const { brandColor, accentColor, brandLogo } = router.query as {
    brandColor?: string;
    accentColor?: string;
    brandLogo?: string;
  };

  const bgColor = brandColor || "#000000";
  const textColor = determineTextColor(bgColor);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <nav
        className="sticky top-0 z-50 p-3"
        style={{ backgroundColor: bgColor }}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div className="flex items-center space-x-3">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt="Brand Logo"
                className="h-8 w-auto object-contain"
                style={{ maxHeight: "32px" }}
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: accentColor || "#ffffff" }}
              />
            )}
            <span className="text-sm font-medium" style={{ color: textColor }}>
              Document Preview
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div
              className="h-3 w-16 rounded"
              style={{ backgroundColor: `${textColor}40` }}
            />
            <div
              className="h-3 w-20 rounded"
              style={{ backgroundColor: `${textColor}40` }}
            />
          </div>
        </div>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-start p-8">
        <div className="w-full max-w-2xl">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <div
              className="mb-4 h-4 w-3/4 rounded"
              style={{ backgroundColor: "#e5e7eb" }}
            />
            <div
              className="mb-2 h-3 w-full rounded"
              style={{ backgroundColor: "#f3f4f6" }}
            />
            <div
              className="mb-2 h-3 w-5/6 rounded"
              style={{ backgroundColor: "#f3f4f6" }}
            />
            <div
              className="h-3 w-2/3 rounded"
              style={{ backgroundColor: "#f3f4f6" }}
            />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div
              className="mb-4 h-48 w-full rounded"
              style={{ backgroundColor: "#f9fafb" }}
            />
            <div
              className="mb-2 h-3 w-full rounded"
              style={{ backgroundColor: "#f3f4f6" }}
            />
            <div
              className="h-3 w-4/5 rounded"
              style={{ backgroundColor: "#f3f4f6" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
