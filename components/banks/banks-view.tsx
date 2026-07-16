"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  FilePlus2,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteOutlier } from "@/lib/actions/outliers";
import {
  deleteStructure,
  createVideoFromStructure,
} from "@/lib/actions/structures";
import type { Outlier, Structure } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/app-shell/page-header";
import { OutlierFormDialog } from "./outlier-form";
import { StructureFormDialog, type StructureFormState } from "./structure-form";

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

export function BanksView({
  outliers,
  structures,
}: {
  outliers: Outlier[];
  structures: Structure[];
}) {
  const router = useRouter();
  const [outlierForm, setOutlierForm] = React.useState<{
    open: boolean;
    outlier: Outlier | null;
  }>({ open: false, outlier: null });
  const [structureForm, setStructureForm] =
    React.useState<StructureFormState | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<
    { kind: "outlier"; item: Outlier } | { kind: "structure"; item: Structure } | null
  >(null);
  const [nicheFilter, setNicheFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const niches = React.useMemo(
    () =>
      [...new Set(outliers.map((o) => o.niche).filter((n): n is string => !!n))].sort(),
    [outliers],
  );

  const visibleOutliers = outliers.filter(
    (o) =>
      (nicheFilter === "all" || o.niche === nicheFilter) &&
      (statusFilter === "all" || o.status === statusFilter),
  );

  function copyHook(text: string | null, label: string) {
    if (!text) {
      toast.error(`No ${label} hook saved on this outlier`);
      return;
    }
    void navigator.clipboard.writeText(text);
    toast.success(`${label} hook copied`);
  }

  async function confirmDeletion() {
    if (!confirmDelete) return;
    const { kind, item } = confirmDelete;
    setConfirmDelete(null);
    try {
      const result =
        kind === "outlier"
          ? await deleteOutlier({ id: item.id })
          : await deleteStructure({ id: item.id });
      if (!result.ok) throw new Error(result.error);
      toast.success(kind === "outlier" ? "Outlier deleted" : "Structure deleted");
      router.refresh();
    } catch (error) {
      toast.error(
        `Couldn't delete — ${error instanceof Error ? error.message : "try again"}`,
      );
    }
  }

  async function createFromStructure(structure: Structure) {
    try {
      const result = await createVideoFromStructure({ id: structure.id });
      if (!result.ok) throw new Error(result.error);
      toast.success("Idea created with the template pre-inserted");
      if (result.data) router.push(`/video/${result.data.id}`);
    } catch (error) {
      toast.error(
        `Couldn't create — ${error instanceof Error ? error.message : "try again"}`,
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-5 p-5 md:px-8 md:py-6">
      <Tabs defaultValue="outliers" className="gap-5">
        <PageHeader
          title="Banks"
          description="Research that feeds the machine — viral outliers and the structures farmed from them."
          actions={<TabsList>
            <TabsTrigger value="outliers">
              Outliers
              <span className="ml-1 tabular-nums text-muted-foreground">
                {outliers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="structures">
              Structures
              <span className="ml-1 tabular-nums text-muted-foreground">
                {structures.length}
              </span>
            </TabsTrigger>
          </TabsList>}
        />

        {/* ── Outliers ────────────────────────────────────────── */}
        <TabsContent value="outliers" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              value={[statusFilter]}
              onValueChange={(values: unknown[]) =>
                setStatusFilter((values[0] as string | undefined) ?? "all")
              }
              variant="outline"
              size="sm"
              aria-label="Status filter"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="unprocessed">Unprocessed</ToggleGroupItem>
              <ToggleGroupItem value="templatized">Templatized</ToggleGroupItem>
            </ToggleGroup>
            {niches.length > 0 && (
              <Select
                value={nicheFilter}
                onValueChange={(v) => setNicheFilter(v ?? "all")}
              >
                <SelectTrigger size="sm" aria-label="Niche filter">
                  {nicheFilter === "all" ? "All niches" : nicheFilter}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All niches</SelectItem>
                  {niches.map((niche) => (
                    <SelectItem key={niche} value={niche}>
                      {niche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              className="ms-auto gap-1.5"
              onClick={() => setOutlierForm({ open: true, outlier: null })}
            >
              <Plus className="size-3.5" aria-hidden />
              Add outlier
            </Button>
          </div>

          {visibleOutliers.length === 0 ? (
            <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
              {outliers.length === 0
                ? "Save your first outlier — a video doing ≥5× its creator's followers."
                : "Nothing matches these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Niche</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOutliers.map((outlier) => (
                    <TableRow key={outlier.id}>
                      <TableCell className="max-w-48">
                        <a
                          href={outlier.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1 font-medium hover:underline"
                        >
                          <span className="truncate">
                            {outlier.creator || outlier.url}
                          </span>
                          <ExternalLink
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        </a>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {outlier.niche ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {outlier.creatorFollowers != null
                          ? compactNumber.format(outlier.creatorFollowers)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {outlier.views != null
                          ? compactNumber.format(outlier.views)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {outlier.multiplier != null ? (
                          <span className="font-semibold tabular-nums text-flag">
                            {outlier.multiplier.toFixed(1)}×
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                            outlier.status === "templatized"
                              ? "border-teach/20 bg-teach/8 text-teach"
                              : "border-border bg-muted/60 text-muted-foreground",
                          )}
                        >
                          {outlier.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Copy hook"
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Copy hook</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => copyHook(outlier.hookVerbal, "Verbal")}
                              >
                                Verbal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyHook(outlier.hookWritten, "Written")}
                              >
                                Written
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyHook(outlier.hookVisual, "Visual")}
                              >
                                Visual
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Templatize"
                            title="Templatize"
                            onClick={() =>
                              setStructureForm({ mode: "templatize", outlier })
                            }
                          >
                            <Wand2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            onClick={() => setOutlierForm({ open: true, outlier })}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete"
                            className="hover:text-destructive"
                            onClick={() =>
                              setConfirmDelete({ kind: "outlier", item: outlier })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Structures ──────────────────────────────────────── */}
        <TabsContent value="structures" className="flex flex-col gap-4">
          <div className="flex items-center">
            <Button
              size="sm"
              className="ms-auto gap-1.5"
              onClick={() => setStructureForm({ mode: "create" })}
            >
              <Plus className="size-3.5" aria-hidden />
              New structure
            </Button>
          </div>
          {structures.length === 0 ? (
            <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
              Templatize an outlier or create a structure from scratch.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {structures.map((structure) => (
                <article
                  key={structure.id}
                  className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight">
                        {structure.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                        {structure.category} · used {structure.timesUsed}×
                        {structure.sourceCreator && ` · from ${structure.sourceCreator}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit structure"
                        onClick={() =>
                          setStructureForm({ mode: "edit", structure })
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete structure"
                        className="hover:text-destructive"
                        onClick={() =>
                          setConfirmDelete({ kind: "structure", item: structure })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <pre className="line-clamp-5 flex-1 rounded-lg bg-muted/50 p-3 font-sans text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
                    {structure.template}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => createFromStructure(structure)}
                  >
                    <FilePlus2 className="size-3.5" aria-hidden />
                    Use in new video
                  </Button>
                </article>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OutlierFormDialog
        outlier={outlierForm.outlier}
        open={outlierForm.open}
        onOpenChange={(open) => setOutlierForm((f) => ({ ...f, open }))}
      />
      <StructureFormDialog
        state={structureForm}
        onOpenChange={(open) => !open && setStructureForm(null)}
      />
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete this {confirmDelete?.kind ?? "item"}?
            </DialogTitle>
            <DialogDescription>
              {confirmDelete?.kind === "structure"
                ? "Videos that used it keep their scripts; links are detached."
                : "This removes it from the research bank permanently."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletion}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
