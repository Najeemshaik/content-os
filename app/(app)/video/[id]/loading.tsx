import { Skeleton } from "@/components/ui/skeleton";

export default function VideoLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl animate-in flex-col gap-6 p-5 duration-300 fade-in md:px-8 md:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4 max-w-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-[55svh] rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
