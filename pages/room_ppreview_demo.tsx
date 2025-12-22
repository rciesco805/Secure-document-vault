import { useRouter } from "next/router";

import { determineTextColor } from "@/lib/utils/determine-text-color";

export default function RoomPreviewDemo() {
  const router = useRouter();
  const { brandColor, accentColor, brandLogo, brandBanner } = router.query as {
    brandColor?: string;
    accentColor?: string;
    brandLogo?: string;
    brandBanner?: string;
  };

  const bgColor = accentColor || "#030712";
  const textColor = determineTextColor(bgColor);
  const showBanner = brandBanner && brandBanner !== "no-banner";

  return (
    <div
      className="min-h-screen w-full p-4"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mx-auto max-w-4xl">
        {brandLogo && (
          <div className="mb-6 flex justify-center">
            <img
              src={brandLogo}
              alt="Logo"
              className="h-10 max-w-[120px] object-contain"
            />
          </div>
        )}

        {showBanner && (
          <div className="mb-6 overflow-hidden rounded-lg">
            <img
              src={brandBanner}
              alt="Banner"
              className="h-auto w-full object-cover"
              style={{ maxHeight: "200px" }}
            />
          </div>
        )}

        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: `${textColor}10`,
            borderColor: `${textColor}20`,
            borderWidth: "1px",
          }}
        >
          <h2
            className="mb-4 text-xl font-semibold"
            style={{ color: textColor }}
          >
            Dataroom Preview
          </h2>

          <div className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-md p-3"
              style={{ backgroundColor: `${textColor}10` }}
            >
              <div
                className="h-8 w-8 rounded"
                style={{ backgroundColor: `${textColor}20` }}
              />
              <span style={{ color: textColor, opacity: 0.8 }}>
                Sample Document 1.pdf
              </span>
            </div>
            <div
              className="flex items-center gap-3 rounded-md p-3"
              style={{ backgroundColor: `${textColor}10` }}
            >
              <div
                className="h-8 w-8 rounded"
                style={{ backgroundColor: `${textColor}20` }}
              />
              <span style={{ color: textColor, opacity: 0.8 }}>
                Sample Document 2.pdf
              </span>
            </div>
            <div
              className="flex items-center gap-3 rounded-md p-3"
              style={{ backgroundColor: `${textColor}10` }}
            >
              <div
                className="h-8 w-8 rounded"
                style={{ backgroundColor: `${textColor}20` }}
              />
              <span style={{ color: textColor, opacity: 0.8 }}>
                Financials Folder
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
