"use client";

import { useRouter } from "next/navigation";

import { useDataroom } from "@/lib/swr/use-dataroom";

import { DataroomHeader } from "@/components/datarooms/dataroom-header";
import { DataroomNavigation } from "@/components/datarooms/dataroom-navigation";
import NotificationSettings from "@/components/datarooms/settings/notification-settings";
import SettingsTabs from "@/components/datarooms/settings/settings-tabs";
import AppLayout from "@/components/layouts/app";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface NotificationsPageClientProps {
  id: string;
}

export default function NotificationsPageClient({ id }: NotificationsPageClientProps) {
  const router = useRouter();
  const { dataroom } = useDataroom();

  if (!dataroom) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <header>
          <DataroomHeader
            title={dataroom.name}
            description={dataroom.pId}
            actions={[]}
          />

          <DataroomNavigation dataroomId={dataroom.id} />
        </header>

        <div className="mx-auto grid w-full gap-2">
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <div className="mx-auto grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <SettingsTabs dataroomId={dataroom.id} />
          <div className="grid gap-6">
            <NotificationSettings dataroomId={dataroom.id} />
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
