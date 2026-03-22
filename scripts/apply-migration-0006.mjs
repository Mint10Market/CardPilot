#!/usr/bin/env node
/**
 * @deprecated Use `npm run db:apply` — applies every pending migration via Drizzle (including 0006).
 * This file is kept so `npm run apply:0006` still works and forwards to the real migrator.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const script = join(dir, "apply-migrations.mjs");
const r = spawnSync(process.execPath, [script], { stdio: "inherit", cwd: join(dir, "..") });
process.exit(r.status ?? 1);
