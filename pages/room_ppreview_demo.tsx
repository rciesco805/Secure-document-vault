import { useRouter } from "next/router";
import Image from "next/image";

export default function RoomPreviewDemo() {
  const router = useRouter();
  const { brandColor, accentColor, brandLogo, brandBanner } = router.query as {
    brandColor?: string;
    accentColor?: string;
    brandLogo?: string;
    brandBanner?: string;
  };

  const bgColor = accentColor || "#030712";
  const textColor = brandColor || "#FFFFFF";
  const showBanner = brandBanner && brandBanner !== "no-banner";

  return (
    <div
      className="min-h-screen w-full p-4"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mx-auto max-w-4xl">
        {brandLogo && !brandLogo.startsWith("blob:") && (
          <div className="mb-6 flex justify-center">
            <Image
              src={brandLogo}
              alt="Logo"
              width={120}
              height={40}
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {showBanner && !brandBanner.startsWith("blob:") && (
          <div className="mb-6 overflow-hidden rounded-lg">
            <Image
              src={brandBanner}
              alt="Banner"
              width={800}
              height={200}
              className="w-full object-cover"
              unoptimized
            />
          </div>
        )}

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h2
            className="mb-4 text-xl font-semibold"
            style={{ color: textColor }}
          >
            Dataroom Preview
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-md bg-gray-700/50 p-3">
              <div className="h-8 w-8 rounded bg-gray-600" />
              <span className="text-gray-300">Sample Document 1.pdf</span>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-gray-700/50 p-3">
              <div className="h-8 w-8 rounded bg-gray-600" />
              <span className="text-gray-300">Sample Document 2.pdf</span>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-gray-700/50 p-3">
              <div className="h-8 w-8 rounded bg-gray-600" />
              <span className="text-gray-300">Financials Folder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
