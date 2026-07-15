import { test, expect } from "@playwright/test";

test("public lifecycle replaces a closed external context and preserves the WASM contract", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");

  const result = await page.evaluate(async () => {
    const { AudioGameEngine } = await import("/engine/index.js");
    const externalContext = new AudioContext();
    const first = await AudioGameEngine.start({ context: externalContext });
    const same = await AudioGameEngine.start();

    const cave = first.setRoom("cave");
    const exported = first.room.exportPreset();
    const imported = first.room.importPreset(exported);
    const source = await first.playTone({
      autoStart: false,
      position: [Number.NaN, Number.POSITIVE_INFINITY, -2],
    });
    const safePosition = [...source.position];
    source.dispose();

    let invalidQualityRejected = false;
    try {
      first.setQuality("invalid-quality");
    } catch {
      invalidQualityRejected = true;
    }

    await externalContext.close();
    const replacement = await AudioGameEngine.start();
    const replacedClosedContext = replacement !== first;
    const replacementVersion = replacement.coreVersion;
    await replacement.close();

    return {
      sameSingleton: same === first,
      cave,
      imported,
      safePosition,
      invalidQualityRejected,
      replacedClosedContext,
      replacementVersion,
    };
  });

  expect(result.sameSingleton).toBe(true);
  expect(result.cave.name).toBe("cave");
  expect(result.imported.schemaVersion).toBe(1);
  expect(result.safePosition).toEqual([0, 0, -2]);
  expect(result.invalidQualityRejected).toBe(true);
  expect(result.replacedClosedContext).toBe(true);
  expect(result.replacementVersion).toMatch(/^0\.1\./);
  expect(pageErrors).toEqual([]);
});

test("stream backend construction failure is reported without breaking the engine", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { AudioGameEngine } = await import("/engine/index.js");
    const context = new AudioContext();
    const original = context.createMediaElementSource.bind(context);
    Object.defineProperty(context, "createMediaElementSource", {
      configurable: true,
      value: () => { throw new Error("synthetic media backend failure"); },
    });
    const engine = await AudioGameEngine.start({ context });
    let message = "";
    try {
      await engine.play("/unreachable-stream.mp3", { stream: true });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    Object.defineProperty(context, "createMediaElementSource", {
      configurable: true,
      value: original,
    });
    const tone = await engine.playTone({ autoStart: false });
    const usableAfterFailure = tone.state === "stopped";
    tone.dispose();
    await engine.close();
    return { message, usableAfterFailure };
  });

  expect(result.message).toContain("Unable to create streaming source");
  expect(result.usableAfterFailure).toBe(true);
});
