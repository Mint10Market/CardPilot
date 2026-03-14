import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Required: set TRIGGER_PROJECT_REF in env, or replace the placeholder with your project ref from trigger.dev dashboard
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_your_project_ref",
  dirs: ["./trigger"],
  maxDuration: 300, // 5 min max per task (required by Trigger.dev)
});
