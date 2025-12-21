import { useRouter } from "next/router";
import Image from "next/image";

export default function EntrancePreviewDemo() {
  const router = useRouter();
  const { brandColor, accentColor, brandLogo, welcomeMessage } = router.query as {
    brandColor?: string;
    accentColor?: string;
    brandLogo?: string;
    welcomeMessage?: string;
  };

  const bgColor = accentColor || "#030712";
  const textColor = brandColor || "#FFFFFF";
  const message = welcomeMessage || "Your action is requested to continue";

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center p-6"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full max-w-md text-center">
        {brandLogo && !brandLogo.startsWith("blob:") && (
          <div className="mb-8 flex justify-center">
            <Image
              src={brandLogo}
              alt="Logo"
              width={150}
              height={50}
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        <h1
          className="mb-4 text-2xl font-semibold"
          style={{ color: textColor }}
        >
          Welcome
        </h1>

        <p className="mb-8 text-gray-400">{message}</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none"
            disabled
          />

          <button
            className="w-full rounded-md px-4 py-3 font-medium transition-colors"
            style={{
              backgroundColor: textColor,
              color: bgColor,
            }}
            disabled
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
