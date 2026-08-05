// /admin/agent-feedback — merged into the Loop Console (2026-08-05).
//
// This page's toggle, report markdown, and status controls all live on
// /admin/loop now. The redirect stays because the judge's docs, older
// resolution notes, and muscle memory all point here — a 404 at a documented
// unstick path is worse than a stub file.
import { redirect } from "next/navigation";

export default function AgentFeedbackRedirect() {
  redirect("/admin/loop");
}
