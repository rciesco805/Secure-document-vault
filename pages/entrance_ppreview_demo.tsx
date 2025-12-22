import { useRouter } from "next/router";

import { determineTextColor } from "@/lib/utils/determine-text-color";

export default function EntrancePreviewDemo() {
  const router = useRouter();
  const { brandColor, accentColor, brandLogo, welcomeMessage } = router.query as {
    brandColor?: string;
    accentColor?: string;
    brandLogo?: string;
    welcomeMessage?: string;
  };

  const bgColor = accentColor || "#030712";
  const textColor = determineTextColor(bgColor);
  const buttonBgColor = textColor;
  const buttonTextColor = bgColor;
  const message = welcomeMessage || "Your action is requested to continue";

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center p-6"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full max-w-md text-center">
        {brandLogo && (
          <div className="mb-8 flex justify-center">
            <img
              src={brandLogo}
              alt="Logo"
              className="h-12 max-w-[150px] object-contain"
            />
          </div>
        )}

        <h1
          className="mb-4 text-2xl font-semibold"
          style={{ color: textColor }}
        >
          Welcome
        </h1>

        <p className="mb-8" style={{ color: textColor, opacity: 0.7 }}>
          {message}
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-md border px-4 py-3 focus:outline-none"
            style={{
              backgroundColor: bgColor,
              borderColor: `${textColor}40`,
              color: textColor,
            }}
            disabled
          />

          <button
            className="w-full rounded-md px-4 py-3 font-medium transition-colors"
            style={{
              backgroundColor: buttonBgColor,
              color: buttonTextColor,
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
