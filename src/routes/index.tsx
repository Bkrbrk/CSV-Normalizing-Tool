import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/datapilot/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DataPilot — Clean & analyze CSV files locally" },
      {
        name: "description",
        content:
          "DataPilot profiles, cleans and charts CSV data entirely in your browser: missing values, duplicates, undoable steps and safe export.",
      },
      { property: "og:title", content: "DataPilot — Clean & analyze CSV files locally" },
      {
        property: "og:description",
        content: "A private, in-browser workspace for CSV cleaning, profiling and charts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});
