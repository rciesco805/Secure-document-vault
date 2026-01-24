import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <Skeleton className="h-4 w-24 bg-gray-700" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <Skeleton className="h-8 w-32 bg-gray-700 mb-2" />
              <Skeleton className="h-3 w-20 bg-gray-700/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="bg-gray-800/40 border-gray-700/50">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg bg-gray-700" />
              <div>
                <Skeleton className="h-6 w-16 bg-gray-700 mb-1" />
                <Skeleton className="h-3 w-20 bg-gray-700/50" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FundCardSkeleton() {
  return (
    <Card className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700 overflow-hidden">
      <CardHeader className="pb-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-40 bg-gray-700 mb-2" />
            <Skeleton className="h-4 w-28 bg-gray-700/50" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full bg-gray-700" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-3 bg-gray-700/30 rounded-lg">
              <Skeleton className="h-3 w-24 bg-gray-600 mb-2" />
              <Skeleton className="h-6 w-28 bg-gray-600/70" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <Skeleton className="h-4 w-32 bg-gray-700" />
              <Skeleton className="h-4 w-10 bg-gray-700" />
            </div>
            <Skeleton className="h-2 w-full rounded-full bg-gray-700" />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <Skeleton className="h-4 w-28 bg-gray-700" />
              <Skeleton className="h-4 w-10 bg-gray-700" />
            </div>
            <Skeleton className="h-2 w-full rounded-full bg-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityTimelineSkeleton() {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-36 bg-gray-700 mb-2" />
            <Skeleton className="h-4 w-48 bg-gray-700/50" />
          </div>
          <Skeleton className="h-9 w-48 bg-gray-700 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-lg bg-gray-700 flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 bg-gray-700 mb-2" />
                <Skeleton className="h-3 w-32 bg-gray-700/50 mb-1" />
                <Skeleton className="h-3 w-20 bg-gray-700/30" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
