import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { videos } from "@/lib/db/schema";
import { TypeBadge } from "@/components/pipeline/type-badge";

export const dynamic = "force-dynamic";

export default async function VideoPage(props: PageProps<"/video/[id]">) {
  const { id } = await props.params;
  const video = db.select().from(videos).where(eq(videos.id, id)).get();
  if (!video) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6 md:p-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Pipeline
      </Link>
      <div className="flex items-center gap-2">
        <TypeBadge type={video.type} />
        <span className="text-xs text-muted-foreground capitalize">
          {video.status}
        </span>
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{video.title}</h1>
      {video.notes && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {video.notes}
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        The scripting studio ships in Phase 2.
      </p>
    </div>
  );
}
