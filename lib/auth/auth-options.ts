import { PrismaAdapter } from "@auth/prisma-adapter";
import PasskeyProvider from "@teamhanko/passkeys-next-auth-provider";
import { type NextAuthOptions } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import { Provider } from "next-auth/providers/index";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

import { identifyUser, trackAnalytics } from "@/lib/analytics";
import { sendVerificationRequestEmail } from "@/lib/emails/send-verification-request";
import { sendWelcomeEmail } from "@/lib/emails/send-welcome";
import hanko from "@/lib/hanko";
import prisma from "@/lib/prisma";
import { CreateUserEmailProps, CustomUser } from "@/lib/types";
import { subscribe } from "@/lib/unsend";

function getMainDomainUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXTAUTH_URL || "http://localhost:3000";
  }
  return process.env.NEXTAUTH_URL || "https://dataroom.bermudafranchisegroup.com";
}

const providers: Provider[] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    allowDangerousEmailAccountLinking: true,
  }),
  LinkedInProvider({
    clientId: process.env.LINKEDIN_CLIENT_ID as string,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
    authorization: {
      params: { scope: "openid profile email" },
    },
    issuer: "https://www.linkedin.com/oauth",
    jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
    profile(profile, tokens) {
      const defaultImage =
        "https://cdn-icons-png.flaticon.com/512/174/174857.png";
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture ?? defaultImage,
      };
    },
    allowDangerousEmailAccountLinking: true,
  }),
  EmailProvider({
    maxAge: 20 * 60,
    async sendVerificationRequest({ identifier, url }) {
      const hasValidNextAuthUrl = !!process.env.NEXTAUTH_URL;
      let finalUrl = url;

      if (!hasValidNextAuthUrl) {
        const mainDomainUrl = getMainDomainUrl();
        const urlObj = new URL(url);
        const mainDomainObj = new URL(mainDomainUrl);
        urlObj.hostname = mainDomainObj.hostname;
        urlObj.protocol = mainDomainObj.protocol;
        urlObj.port = mainDomainObj.port || "";

        finalUrl = urlObj.toString();
      }

      await sendVerificationRequestEmail({
        url: finalUrl,
        email: identifier,
      });
    },
  }),
];

if (hanko) {
  providers.push(
    PasskeyProvider({
      tenant: hanko,
      async authorize({ userId }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;
        return user;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  pages: {
    error: "/login",
  },
  providers,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { 
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none" as const,
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "none" as const,
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none" as const,
        path: "/",
        secure: true,
      },
    },
  },
  debug: process.env.NODE_ENV === 'development' && process.env.AUTH_DEBUG === 'true',
  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      if (url === baseUrl || url === `${baseUrl}/` || url.includes('/login')) {
        return `${baseUrl}/viewer-redirect`;
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/viewer-redirect`;
    },
    session: async ({ session, user, token }) => {
      // With database sessions, user comes directly from the database
      // Fetch the latest role and session portal from the database
      const [dbUser, dbSession] = await prisma.$transaction([
        prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, name: true, email: true, image: true, role: true },
        }),
        prisma.session.findFirst({
          where: { userId: user.id },
          orderBy: { expires: 'desc' },
        }),
      ]);
      
      if (!dbUser) {
        return session;
      }

      (session.user as CustomUser).id = dbUser.id;
      (session.user as CustomUser).name = dbUser.name;
      (session.user as CustomUser).email = dbUser.email;
      (session.user as CustomUser).image = dbUser.image;
      (session.user as CustomUser).role = dbUser.role || "LP";
      (session as any).loginPortal = (dbSession as any)?.loginPortal || "VISITOR";
      return session;
    },
  },
  events: {
    async createUser(message) {
      console.log("[AUTH] createUser event triggered for:", message.user.email);
      
      const params: CreateUserEmailProps = {
        user: {
          name: message.user.name,
          email: message.user.email,
        },
      };

      await identifyUser(message.user.email ?? message.user.id);
      await trackAnalytics({
        event: "User Signed Up",
        email: message.user.email,
        userId: message.user.id,
      });

      console.log("[AUTH] Sending welcome email to:", message.user.email);
      await sendWelcomeEmail(params);
      console.log("[AUTH] Welcome email sent successfully");

      if (message.user.email) {
        await subscribe(message.user.email);
      }
    },
  },
};
