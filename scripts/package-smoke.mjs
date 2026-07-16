import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const artifactsDirectory = path.join(root, "artifacts");
const packageDirectory = path.join(artifactsDirectory, "package");
const consumerDirectory = path.join(artifactsDirectory, "consumer-smoke");

function run(command, args, cwd = root) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, npm_config_update_notifier: "false" },
  }).trim();
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

await rm(packageDirectory, { recursive: true, force: true });
await rm(consumerDirectory, { recursive: true, force: true });
await mkdir(packageDirectory, { recursive: true });
await mkdir(path.join(consumerDirectory, "src"), { recursive: true });

const dryRun = JSON.parse(run("npm", [
  "pack",
  "--dry-run",
  "--json",
  "--workspace",
  "packages/engine",
]));
if (!Array.isArray(dryRun) || dryRun.length !== 1) throw new Error("npm pack --dry-run returned an unexpected result");

const packed = JSON.parse(run("npm", [
  "pack",
  "--json",
  "--workspace",
  "packages/engine",
  "--pack-destination",
  packageDirectory,
]));
if (!Array.isArray(packed) || packed.length !== 1) throw new Error("npm pack returned an unexpected result");

const tarballPath = path.join(packageDirectory, packed[0].filename);
const tarEntries = run("tar", ["-tf", tarballPath]).split(/\r?\n/u).filter(Boolean);
const requiredEntries = [
  "package/package.json",
  "package/README.md",
  "package/LICENSE",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/wasm/audio_game_core.js",
  "package/dist/wasm/audio_game_core_bg.wasm",
];
for (const entry of requiredEntries) {
  if (!tarEntries.includes(entry)) throw new Error(`Tarball is missing ${entry}`);
}
for (const forbidden of ["package/demo/", "package/tests/", "package/src/"]) {
  if (tarEntries.some((entry) => entry.startsWith(forbidden))) {
    throw new Error(`Tarball contains forbidden development path ${forbidden}`);
  }
}

await writeFile(path.join(consumerDirectory, "package.json"), JSON.stringify({
  name: "aaja-clean-consumer-smoke",
  version: "0.0.0",
  private: true,
  type: "module",
  scripts: {
    typecheck: "tsc -p tsconfig.json --noEmit",
    build: "vite build",
  },
}, null, 2));

await writeFile(path.join(consumerDirectory, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "Bundler",
    strict: true,
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    noEmit: true,
  },
  include: ["src/**/*.ts"],
}, null, 2));

await writeFile(path.join(consumerDirectory, "vite.config.js"), `export default { base: "./" };\n`);
await writeFile(path.join(consumerDirectory, "index.html"), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aaja Vite consumer</title></head>
<body>
<button id="run">Run installed package</button>
<p id="status" role="status">not run</p>
<script type="module" src="/src/main.ts"></script>
</body>
</html>
`);

const consumerSource = `import { AudioGameEngine } from "@aaja/audio-game-engine";

const button = document.querySelector<HTMLButtonElement>("#run");
const status = document.querySelector<HTMLElement>("#status");
if (!button || !status) throw new Error("Consumer smoke controls are missing");

button.addEventListener("click", () => {
  void (async () => {
    const audio = await AudioGameEngine.start({ quality: "hrtf", maxVoices: 8 });
    audio.setListenerPosition([0, 0, 0]);
    audio.setListenerOrientation([0, 0, -1], [0, 1, 0]);
    audio.setRoom("small-room");
    const cue = await audio.playTone({
      durationMs: 800,
      loop: true,
      position: [0, 0, -3],
      category: "danger",
      roomAmount: 0.5,
      occlusion: 0.35,
    });
    const during = audio.getDiagnosticsSnapshot();
    await audio.stopAll(0);
    cue.dispose();
    const after = audio.getDiagnosticsSnapshot();
    const coreVersion = audio.coreVersion;
    await audio.close();
    (window as unknown as { __aajaConsumerSmoke: unknown }).__aajaConsumerSmoke = {
      coreVersion,
      during,
      after,
    };
    status.textContent = "passed";
  })().catch((error: unknown) => {
    console.error(error);
    status.textContent = error instanceof Error ? error.message : String(error);
  });
});
`;
await writeFile(path.join(consumerDirectory, "src", "main.ts"), consumerSource);

await writeFile(path.join(consumerDirectory, "direct.html"), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aaja direct ESM consumer</title></head>
<body>
<button id="run">Run installed package</button>
<p id="status" role="status">not run</p>
<script type="importmap">{"imports":{"@aaja/audio-game-engine":"./node_modules/@aaja/audio-game-engine/dist/index.js"}}</script>
<script type="module" src="./direct.js"></script>
</body>
</html>
`);
await writeFile(path.join(consumerDirectory, "direct.js"), `import { AudioGameEngine } from "@aaja/audio-game-engine";
const button = document.querySelector("#run");
const status = document.querySelector("#status");
button.addEventListener("click", () => {
  void (async () => {
    const audio = await AudioGameEngine.start({ quality: "hrtf", maxVoices: 8 });
    audio.setRoom("small-room");
    const cue = await audio.playTone({ durationMs: 800, loop: true, position: [0, 0, -3], occlusion: 0.35 });
    const during = audio.getDiagnosticsSnapshot();
    await audio.stopAll(0);
    cue.dispose();
    const after = audio.getDiagnosticsSnapshot();
    const coreVersion = audio.coreVersion;
    await audio.close();
    globalThis.__aajaConsumerSmoke = { coreVersion, during, after };
    status.textContent = "passed";
  })().catch((error) => {
    console.error(error);
    status.textContent = error instanceof Error ? error.message : String(error);
  });
});
`);

run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath], consumerDirectory);
run("npm", ["install", "--save-dev", "--ignore-scripts", "--no-audit", "--no-fund", "typescript@5.8.3", "vite@6.1.0"], consumerDirectory);
run("npm", ["run", "typecheck"], consumerDirectory);
run("npm", ["run", "build"], consumerDirectory);

const installedDirectory = path.join(consumerDirectory, "node_modules", "@aaja", "audio-game-engine");
const installedFiles = await listFiles(installedDirectory);
const builtFiles = await listFiles(path.join(consumerDirectory, "dist"));
if (!installedFiles.includes("dist/wasm/audio_game_core_bg.wasm")) {
  throw new Error("Installed tarball does not contain the WASM binary");
}
if (!installedFiles.includes("LICENSE")) {
  throw new Error("Installed tarball does not contain the MIT license text");
}
if (!builtFiles.some((file) => file.endsWith(".wasm"))) {
  throw new Error("Vite production build did not emit a WASM asset");
}
const builtJavaScript = (await Promise.all(
  builtFiles.filter((file) => file.endsWith(".js")).map((file) => readFile(path.join(consumerDirectory, "dist", file), "utf8")),
)).join("\n");
if (!builtJavaScript.includes(".wasm")) {
  throw new Error("Vite output does not reference the emitted WASM asset");
}

const report = {
  packageName: packed[0].name,
  packageVersion: packed[0].version,
  tarball: path.relative(root, tarballPath),
  tarballSize: packed[0].size,
  unpackedSize: packed[0].unpackedSize,
  dryRunFiles: dryRun[0].files.map((entry) => entry.path).sort(),
  tarEntries,
  installedFiles,
  builtFiles,
  typecheck: "passed",
  viteBuild: "passed",
};
await writeFile(path.join(packageDirectory, "package-smoke.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
