import {
  DocumentContext,
  Head,
  Html,
  Main,
  NextScript,
} from "next/document";

interface DocumentProps {
  nonce: string;
}

function Document({ nonce }: DocumentProps) {
  return (
    <Html lang="en" className="bg-background" suppressHydrationWarning>
      <Head nonce={nonce}>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BF Fund" />
        <link rel="apple-touch-icon" href="/_icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="BF Fund" />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-TileImage" content="/_icons/icon-144x144.png" />
      </Head>
      <body className="">
        <Main />
        <NextScript nonce={nonce} />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext) => {
  const initialProps = await ctx.defaultGetInitialProps(ctx);
  const nonce = ctx.req?.headers?.["x-nonce"] as string || "";
  return { ...initialProps, nonce };
};

export default Document;
