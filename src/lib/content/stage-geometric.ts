/**
 * Bridge from the TypeScript generator to the geometric stager in
 * `scripts/stage_geometric.py`.
 *
 * WHY A SUBPROCESS AND NOT A PORT
 * -------------------------------
 * The staging pipeline needs a metric depth model, a semantic segmentation
 * model and an ArcFace identity check. All three are PyTorch/ONNX, all three
 * run on the GPU, and none has a usable JS equivalent. Reimplementing them in
 * Node would mean reimplementing the parts that make the output trustworthy,
 * so the Python owns the pixels and Node owns the post.
 *
 * ONE spawn per listing, not per photo: loading three models costs far more
 * than any single frame, so the batch interface pays that once and streams a
 * JSON line back per job. Progress goes to stderr; stdout stays parseable.
 */
import { spawn } from "child_process";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

export interface StageJob {
  /** Public URL of the ORIGINAL listing photo. */
  photoUrl: string;
  /** Index in the listing's media array, for logging and captions. */
  index: number;
}

export interface StageResult {
  index: number;
  ok: boolean;
  /** Final 4:5 PNG. Absent when the frame was rejected. */
  png?: Buffer;
  /** What the photo reader decided this room is. */
  room?: string;
  /** The one thing the room is selling. */
  feature?: string;
  /** What he is doing (action tier) or reacting with (reaction tier). */
  action?: string;
  tier?: "action" | "reaction";
  error?: string;
}

const PY = process.env.PYTHON_BIN || "python";

async function fetchTo(url: string, dest: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status} ${url.slice(0, 70)}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

export async function stageGeometric(
  jobs: StageJob[],
  opts: { onProgress?: (line: string) => void; timeoutMs?: number } = {}
): Promise<StageResult[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "stage-"));
  try {
    const spec = [];
    for (const j of jobs) {
      const src = path.join(dir, `p${j.index}.jpg`);
      await fetchTo(j.photoUrl, src);
      spec.push({ src, out: `s${j.index}.png`, index: j.index });
    }
    const specPath = path.join(dir, "jobs.json");
    await writeFile(specPath, JSON.stringify(spec));

    const raw = await new Promise<string>((resolve, reject) => {
      const cp = spawn(PY, ["scripts/stage_geometric.py", "--batch", specPath], {
        cwd: process.cwd(),
        env: process.env,
      });
      let out = "";
      let errTail = "";
      cp.stdout.on("data", (d) => (out += d.toString()));
      cp.stderr.on("data", (d) => {
        const t = d.toString();
        errTail = (errTail + t).slice(-4000);
        for (const line of t.split(/\r?\n/)) {
          if (line.trim()) opts.onProgress?.(line.trimEnd());
        }
      });
      const timer = setTimeout(() => {
        cp.kill("SIGKILL");
        reject(new Error(`stage_geometric timed out`));
      }, opts.timeoutMs ?? 25 * 60 * 1000);
      cp.on("error", (e) => { clearTimeout(timer); reject(e); });
      cp.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(`stage_geometric exit ${code}: ${errTail.slice(-400)}`));
        resolve(out);
      });
    });

    // The script prints exactly one JSON array on stdout; be defensive anyway
    // so a stray print never takes down a whole listing.
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("stage_geometric produced no JSON");
    const rows: any[] = JSON.parse(m[0]);

    const results: StageResult[] = [];
    for (const row of rows) {
      const spec1 = spec.find((s) => s.src === row.src);
      const index = spec1?.index ?? -1;
      if (!row.ok) {
        results.push({ index, ok: false, error: row.error || "all takes rejected" });
        continue;
      }
      let png: Buffer | undefined;
      try {
        png = await readFile(path.join(dir, row.out));
      } catch {
        results.push({ index, ok: false, error: "output missing on disk" });
        continue;
      }
      results.push({
        index, ok: true, png,
        room: row.room, feature: row.feature, action: row.action, tier: row.tier,
      });
    }
    return results;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
