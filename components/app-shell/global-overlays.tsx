"use client";

import * as React from "react";
import { CaptureDialog } from "@/components/capture/capture-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";

/** App-wide overlays + their global shortcuts: ⌘K capture, ? shortcuts. */
export function GlobalOverlays() {
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  React.useEffect(() => {
    const onCaptureRequest = () => setCaptureOpen(true);
    window.addEventListener("content-os:capture", onCaptureRequest);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCaptureOpen((prev) => !prev);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog']",
        )
      )
        return;
      if (event.key === "?" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("content-os:capture", onCaptureRequest);
    };
  }, []);

  return (
    <>
      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
