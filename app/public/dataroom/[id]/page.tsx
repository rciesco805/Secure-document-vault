import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import PublicDataroomPageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const dataroom = await prisma.dataroom.findFirst({
    where: {
      pId: id,
    },
    select: {
      name: true,
      brand: {
        select: {
          banner: true,
          welcomeMessage: true,
        },
      },
    },
  });

  if (!dataroom) {
    return {
      title: "Not Found | BF Fund",
    };
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://dataroom.bermudafranchisegroup.com";
  const ogImage = dataroom.brand?.banner || `${baseUrl}/_static/bf-golf-ball.png`;
  const ogTitle = `${dataroom.name} | BF Fund Dataroom`;
  const ogDescription = dataroom.brand?.welcomeMessage || 
    "Secure investor document sharing platform. Request access to view confidential materials.";

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PublicDataroomPage({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const dataroom = await prisma.dataroom.findFirst({
    where: {
      pId: id,
    },
    select: {
      name: true,
      pId: true,
      brand: {
        select: {
          logo: true,
          banner: true,
          brandColor: true,
          accentColor: true,
          welcomeMessage: true,
        },
      },
    },
  });

  if (!dataroom) {
    notFound();
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://dataroom.bermudafranchisegroup.com";
  const ogImage = dataroom.brand?.banner || `${baseUrl}/_static/bf-golf-ball.png`;
  const ogTitle = `${dataroom.name} | BF Fund Dataroom`;
  const ogDescription = dataroom.brand?.welcomeMessage || 
    "Secure investor document sharing platform. Request access to view confidential materials.";

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-black">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <PublicDataroomPageClient
        dataroom={{
          name: dataroom.name,
          pId: dataroom.pId,
        }}
        brand={dataroom.brand}
        ogImage={ogImage}
        ogTitle={ogTitle}
        ogDescription={ogDescription}
      />
    </Suspense>
  );
}
