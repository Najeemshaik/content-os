import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-9xl animate-in flex-col gap-5 p-5 duration-300 fade-in md:px-8 md:py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
        <Skeleton className="hidden h-8 w-72 rounded-lg md:block" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            key={i}
            className={i === 0 ? "rounded-2xl" : "hidden rounded-2xl md:block"}
          />
        ))}
      </div>
    </div>
  );
}
