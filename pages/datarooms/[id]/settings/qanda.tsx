import { useTeam } from "@/context/team-context";
import { useDataroom } from "@/lib/swr/use-dataroom";
import { DataroomHeader } from "@/components/datarooms/dataroom-header";
import { DataroomNavigation } from "@/components/datarooms/dataroom-navigation";
import SettingsTabs from "@/components/datarooms/settings/settings-tabs";
import AppLayout from "@/components/layouts/app";
import { AdminQandAPanel } from "@/components/qanda/admin-qanda-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function QandASettings() {
  const { dataroom } = useDataroom();
  const teamInfo = useTeam();

  if (!dataroom) {
    return <div>Loading...</div>;
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
            <Card className="bg-transparent">
              <CardHeader>
                <CardTitle>Viewer Questions & Notes</CardTitle>
                <CardDescription>
                  View and respond to questions and notes from viewers who have
                  accessed this dataroom.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminQandAPanel dataroomId={dataroom.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
