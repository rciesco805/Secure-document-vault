import { useRouter } from "next/router";

import { useState } from "react";

import { toast } from "sonner";
import { mutate } from "swr";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DuplicateDataroom({
  dataroomId,
  teamId,
}: {
  dataroomId: string;
  teamId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const handleDuplicateDataroom = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!teamId) {
      return;
    }

    setLoading(true);

    try {
      toast.promise(
        fetch(`/api/teams/${teamId}/datarooms/${dataroomId}/duplicate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "An error occurred while copying dataroom.",
            );
          }
          return response.json();
        }),
        {
          loading: "Copying dataroom...",
          success: (dataroom) => {
            mutate(`/api/teams/${teamId}/datarooms`);
            router.push(`/datarooms/${dataroom.id}/documents`);
            return "Dataroom copied successfully.";
          },
          error: (error) => {
            return error.message;
          },
        },
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const ButtonList = () => {
    // Self-hosted: always allow duplicate (no plan restrictions)
    return (
      <Button onClick={(e) => handleDuplicateDataroom(e)} loading={loading}>
        Duplicate Dataroom
      </Button>
    );
  };

  return (
    <div className="rounded-lg">
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle>Duplicate Dataroom</CardTitle>
          <CardDescription>
            Create a new data room with the same content (folders and files) as
            this data room.
          </CardDescription>
        </CardHeader>
        <CardContent></CardContent>
        <CardFooter className="flex items-center justify-end rounded-b-lg border-t px-6 py-3">
          <div className="shrink-0">{ButtonList()}</div>
        </CardFooter>
      </Card>
    </div>
  );
}
