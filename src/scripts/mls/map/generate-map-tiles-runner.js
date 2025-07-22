// scripts/mls/map/generate-map-tiles-runner.js src\scripts\mls\map\generate-map-tiles-runner.js
require("ts-node").register({
  transpileOnly: true,
  project: "./tsconfig.json",
});
require("./generate-map-tiles.ts");
