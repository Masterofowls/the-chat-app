import { spawnSync } from "node:child_process";

const result = spawnSync(
  "render",
  [
    "services",
    "update",
    "srv-daeqlngu01pc73fl41i0",
    "--build-command=npm install --include=dev && npm run build",
    "--confirm",
    "--output=json",
  ],
  { encoding: "utf8", shell: false },
);

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}
process.exit(result.status ?? 1);
