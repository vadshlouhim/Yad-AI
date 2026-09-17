import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getImageProps } from "next/image";
import {
  TOOL_DEMO_CONFIG,
  ToolDemoScreen,
} from "../src/components/home/tool-demo-screens";
import {
  HomeDemoScreen,
  PosterDemoScreen,
  PublishDemoScreen,
  NewsletterDemoScreen,
  SummaryDemoScreen,
} from "../src/components/home/platform-demo-screens";
import {
  MODULE_COLORS,
  MOBILE_HOME_HEADER_CLASS,
  POSTER_HEADER_CLASS,
  NEWSLETTER_HEADER_CLASS,
} from "../src/components/presentation/platform-style";
import {
  PUBLIC_TOOLS,
  PUBLIC_SERVICES,
  getPublicToolDestination,
  getToolOnboardingPath,
} from "../src/lib/public-tools";
import {
  buildAuthCallbackUrl,
  getAuthToolDestination,
  getPostAuthDestination,
  normalizeAuthNextPath,
} from "../src/lib/supabase/auth-redirect";

const ids = new Set<string>();
for (const item of [...PUBLIC_TOOLS, ...PUBLIC_SERVICES]) {
  assert.ok(!ids.has(item.id));
  ids.add(item.id);
  assert.ok(
    existsSync(`src/app${item.destination}/page.tsx`),
    item.destination,
  );
  assert.equal(getPublicToolDestination(item.destination), item.destination);
  const onboarding = getToolOnboardingPath(item.destination);
  assert.equal(
    new URL(onboarding, "https://local.test").searchParams.get("callbackUrl"),
    item.destination,
  );
  for (const next of [item.destination, onboarding]) {
    assert.equal(getAuthToolDestination(next), item.destination);
    assert.equal(getPostAuthDestination(next, false), onboarding);
    assert.equal(getPostAuthDestination(next, true), item.destination);
    const emailOrGoogle = buildAuthCallbackUrl("https://local.test", next);
    assert.equal(new URL(emailOrGoogle).searchParams.get("next"), next);
  }
}
assert.equal(PUBLIC_TOOLS.filter((tool) => tool.featured).length, 3);
for (const tool of PUBLIC_TOOLS) {
  assert.equal(tool.scenes.length, 3);
  assert.equal(tool.benefits.length, 3);
  assert.ok(existsSync(`public${tool.portrait}`), tool.id);
  assert.ok(!tool.portrait.includes("Shlomi"));
}
assert.equal(MODULE_COLORS.publish, "bg-[#2962ff]");
assert.equal(MODULE_COLORS.newsletter, "bg-[#7b61ff]");
assert.equal(MODULE_COLORS.posters, "bg-[#e84393]");
assert.ok(
  MOBILE_HOME_HEADER_CLASS.includes("#6822b5_0%,#421388_38%,#210763_100%"),
);
assert.ok(POSTER_HEADER_CLASS.includes("#8037ce_0%,#421388_48%,#210763_100%"));
assert.ok(
  NEWSLETTER_HEADER_CLASS.includes("#36506d_0%,#17253f_48%,#0f1c2e_100%"),
);
assert.equal(Object.keys(TOOL_DEMO_CONFIG).length, PUBLIC_TOOLS.length - 3);
const primaryScreens = {
  posters: PosterDemoScreen,
  publish: PublishDemoScreen,
  newsletter: NewsletterDemoScreen,
};
for (const tool of PUBLIC_TOOLS) {
  const Screen =
    primaryScreens[tool.id as keyof typeof primaryScreens] ?? ToolDemoScreen;
  for (const phase of [0, 1, 2]) {
    for (const progress of [0, 0.7, 1]) {
      const html = renderToStaticMarkup(
        createElement(Screen, { tool, phase, progress }),
      );
      assert.ok(html.length > 300, `${tool.id} ${phase}`);
      assert.ok(
        !/<button|<input|<form|<textarea|<iframe|<video/.test(html),
        `Presentation must be read-only: ${tool.id}`,
      );
      assert.ok(
        !/Test770|Yest|Montrouge|Henri Ginoux|16:37|19:39|20:58/.test(html),
      );
    }
  }
}
const homeScreen = renderToStaticMarkup(
  createElement(HomeDemoScreen, { progress: 1 }),
);
assert.ok(
  homeScreen.includes("Vos agents IA") &&
    homeScreen.includes("Que souhaitez-vous faire"),
);
assert.ok(
  renderToStaticMarkup(createElement(SummaryDemoScreen)).includes(
    "Trois résultats",
  ),
);
assert.ok(existsSync("public/presentation/chabbat-demo.png"));
const { props: posterImage } = getImageProps({
  src: "/presentation/chabbat-demo.png",
  width: 424,
  height: 600,
  alt: "Exemple",
  sizes: "320px",
});
assert.ok(posterImage.src.startsWith("/_next/image?"));
assert.equal(posterImage.loading, "lazy");
for (const invalid of [
  undefined,
  "",
  "https://evil.test",
  "//evil.test",
  "/\\evil.test",
  "/%2f%2fevil.test",
  "/%5cevil.test",
  "/bad%",
  "/\nevil.test",
]) {
  assert.equal(normalizeAuthNextPath(invalid), "/dashboard");
  assert.equal(getPublicToolDestination(invalid), null);
  assert.equal(getAuthToolDestination(invalid), null);
}
for (const invalid of [
  "/admin",
  "/dashboard/unknown",
  "/dashboard/templates?next=https://evil.test",
  "/onboarding?callbackUrl=https://evil.test",
]) {
  assert.equal(getPublicToolDestination(invalid), null);
  assert.equal(getAuthToolDestination(invalid), null);
}
assert.equal(getPostAuthDestination("/dashboard", false), "/onboarding");
assert.equal(getPostAuthDestination("/dashboard", true), "/dashboard");
assert.equal(getPostAuthDestination("/onboarding", true), "/onboarding");
assert.equal(getToolOnboardingPath(undefined), "/onboarding");

// Deterministic hook harness: exercise the real clock/cleanup code without a browser.
function playbackHarness(
  reduce = false,
  duration = 20000,
  steps = [0, 3000, 8000, 13000, 18000],
) {
  const source = readFileSync(
    "src/components/home/use-preview-playback.ts",
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  type Cleanup = void | (() => void);
  const states: unknown[] = [];
  const effects: Array<{ dependencies: unknown[]; cleanup: Cleanup }> = [];
  let index = 0;
  let dirty = true;
  let time = 0;
  let blocked = false;
  let pending: Array<() => void> = [];
  let intersection:
    | ((entries: Array<{ isIntersecting: boolean }>) => void)
    | undefined;
  let visibility: (() => void) | undefined;
  let mediaChange: (() => void) | undefined;
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const media = {
    matches: reduce,
    addEventListener: (_name: string, fn: () => void) => {
      mediaChange = fn;
    },
    removeEventListener: () => {
      mediaChange = undefined;
    },
  };
  const document = {
    visibilityState: "visible",
    addEventListener: (_name: string, fn: () => void) => {
      visibility = fn;
    },
    removeEventListener: () => {
      visibility = undefined;
    },
  };
  const exports: {
    usePreviewPlayback?: (
      blocked: boolean,
      ref: { current: object },
      duration: number,
      steps: number[],
    ) => {
      elapsed: number;
      stage: number;
      running: boolean;
      finished: boolean;
      toggle: () => void;
      replay: () => void;
      select: (stage: number) => void;
    };
  } = {};
  runInNewContext(compiled, {
    exports,
    performance: { now: () => time },
    document,
    window: {
      matchMedia: () => media,
      setInterval: (fn: () => void) => {
        timers.set(++timerId, fn);
        return timerId;
      },
      clearInterval: (id: number) => timers.delete(id),
    },
    IntersectionObserver: class {
      constructor(fn: typeof intersection) {
        intersection = fn;
      }
      observe() {}
      disconnect() {
        intersection = undefined;
      }
    },
    require: () => ({
      useState(initial: unknown) {
        const position = index++;
        if (!(position in states)) states[position] = initial;
        return [
          states[position],
          (value: unknown) => {
            const next =
              typeof value === "function" ? value(states[position]) : value;
            if (!Object.is(states[position], next)) {
              states[position] = next;
              dirty = true;
            }
          },
        ];
      },
      useEffect(fn: () => Cleanup, dependencies: unknown[]) {
        const position = index++;
        const previous = effects[position];
        if (
          !previous ||
          dependencies.some(
            (value, i) => !Object.is(previous.dependencies[i], value),
          )
        ) {
          pending.push(() => {
            if (typeof previous?.cleanup === "function") previous.cleanup();
            effects[position] = { dependencies, cleanup: fn() };
          });
        }
      },
    }),
  });
  assert.ok(exports.usePreviewPlayback);
  const ref = { current: {} };
  let result!: ReturnType<NonNullable<typeof exports.usePreviewPlayback>>;
  function flush() {
    let iterations = 0;
    while (dirty) {
      assert.ok(iterations++ < 20);
      dirty = false;
      index = 0;
      result = exports.usePreviewPlayback!(blocked, ref, duration, steps);
      const jobs = pending;
      pending = [];
      jobs.forEach((fn) => fn());
    }
    return result;
  }
  flush();
  return {
    read: flush,
    inView(value: boolean) {
      intersection?.([{ isIntersecting: value }]);
      flush();
    },
    hide(value: boolean) {
      document.visibilityState = value ? "hidden" : "visible";
      visibility?.();
      flush();
    },
    block(value: boolean) {
      blocked = value;
      dirty = true;
      flush();
    },
    reduce(value: boolean) {
      media.matches = value;
      mediaChange?.();
      flush();
    },
    advance(ms: number) {
      for (let remaining = ms; remaining > 0; remaining -= 150) {
        time += Math.min(remaining, 150);
        [...timers.values()].forEach((fn) => fn());
        flush();
      }
    },
    timerCount: () => timers.size,
    unmount() {
      effects.forEach((effect) => {
        if (typeof effect?.cleanup === "function") effect.cleanup();
      });
    },
  };
}
const player = playbackHarness();
assert.equal(player.timerCount(), 0);
player.inView(true);
player.advance(2000);
const beforePause = player.read().elapsed;
player.read().toggle();
player.read();
player.advance(1000);
assert.equal(player.read().elapsed, beforePause);
player.read().toggle();
player.read();
for (const setPaused of [
  () => player.inView(false),
  () => player.hide(true),
  () => player.block(true),
]) {
  setPaused();
  const elapsed = player.read().elapsed;
  player.advance(1000);
  assert.equal(player.read().elapsed, elapsed);
  player.inView(true);
  player.hide(false);
  player.block(false);
}
player.advance(25000);
assert.equal(player.read().elapsed, 20000);
assert.equal(player.read().finished, true);
assert.equal(player.timerCount(), 0);
player.read().replay();
player.read();
assert.equal(player.read().stage, 0);
player.read().select(1);
player.read();
assert.equal(player.read().stage, 1);
assert.equal(player.timerCount(), 0);
player.unmount();
assert.equal(player.timerCount(), 0);
const reduced = playbackHarness(true);
reduced.inView(true);
reduced.advance(2000);
assert.equal(reduced.timerCount(), 0);
assert.equal(reduced.read().stage, 4);
reduced.read().replay();
reduced.read();
reduced.advance(1000);
assert.ok(reduced.read().elapsed > 0);
reduced.unmount();
assert.equal(reduced.timerCount(), 0);
const toolPlayer = playbackHarness(false, 10000, [0, 3000, 7000]);
toolPlayer.inView(true);
toolPlayer.advance(3500);
assert.equal(toolPlayer.read().stage, 1);
toolPlayer.read().select(2);
toolPlayer.read();
assert.equal(toolPlayer.read().elapsed, 7000);
toolPlayer.read().toggle();
toolPlayer.read();
toolPlayer.advance(4000);
assert.equal(toolPlayer.read().elapsed, 10000);
assert.equal(toolPlayer.read().finished, true);
toolPlayer.unmount();

// Presentation modules must not acquire data or call business APIs.
for (const file of [
  "public-tool-discovery.tsx",
  "animated-tool-preview.tsx",
  "tool-preview-dialog.tsx",
  "use-preview-playback.ts",
  "platform-demo-screens.tsx",
  "tool-demo-screens.tsx",
  "use-demo-camera.ts",
]) {
  const source = readFileSync(`src/components/home/${file}`, "utf8");
  assert.ok(!/\bfetch\s*\(|supabase|requireAuth|\/api\//.test(source), file);
  assert.ok(!/from ["'].*-client["']/.test(source), file);
}
assert.ok(
  !readFileSync(
    "src/components/home/animated-tool-preview.tsx",
    "utf8",
  ).includes('"./tool-demo-screens"'),
  "Secondary presentation code stays in the deferred dialog",
);
const discovery = readFileSync(
  "src/components/home/public-tool-discovery.tsx",
  "utf8",
);
assert.ok(
  /dynamic\(\s*\(\) => import\("\.\/tool-preview-dialog"\)/.test(discovery),
);
assert.ok(discovery.includes("selected &&"));
assert.ok(
  !readFileSync("src/app/page.tsx", "utf8").includes("InstallAppGuide"),
);
async function testAuthCallback() {
  const source = readFileSync("src/app/auth/callback/route.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  let hasCommunity = false;
  let authError = false;
  const exports: { GET?: (request: NextRequest) => Promise<NextResponse> } = {};
  runInNewContext(compiled, {
    exports,
    URL,
    process: { env: { NODE_ENV: "development" } },
    require(name: string) {
      if (name === "next/server") return { NextResponse };
      if (name === "next/headers")
        return { cookies: async () => ({ getAll: () => [] }) };
      if (name === "@/lib/supabase/auth-redirect")
        return {
          DEFAULT_POST_LOGIN_PATH: "/dashboard",
          normalizeAuthNextPath,
          getPostAuthDestination,
        };
      if (name === "@supabase/ssr")
        return {
          createServerClient: (
            _url: string,
            _key: string,
            options: { cookies: { setAll: (cookies: unknown[]) => void } },
          ) => ({
            auth: {
              exchangeCodeForSession: async () => {
                if (authError)
                  return { data: {}, error: new Error("simulated auth error") };
                options.cookies.setAll([
                  {
                    name: "sb-session",
                    value: "refreshed",
                    options: { path: "/", httpOnly: true, secure: true },
                  },
                ]);
                return {
                  data: {
                    user: {
                      id: "test-user",
                      email: "fictitious@example.test",
                      user_metadata: {},
                    },
                  },
                  error: null,
                };
              },
            },
          }),
        };
      if (name === "@/lib/supabase/admin")
        return {
          createAdminClient: () => ({
            from: () => ({
              upsert: async () => ({}),
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: { communityId: hasCommunity ? "community" : null },
                  }),
                }),
              }),
            }),
          }),
        };
      throw new Error(`Unexpected callback import: ${name}`);
    },
  });
  assert.ok(exports.GET);
  for (const item of [...PUBLIC_TOOLS, ...PUBLIC_SERVICES]) {
    for (const next of [
      item.destination,
      getToolOnboardingPath(item.destination),
    ]) {
      for (const complete of [false, true]) {
        hasCommunity = complete;
        const response = await exports.GET(
          new NextRequest(
            `https://local.test/auth/callback?code=fake&next=${encodeURIComponent(next)}`,
          ),
        );
        assert.equal(
          response.headers.get("location"),
          `https://local.test${getPostAuthDestination(next, complete)}`,
        );
        assert.equal(response.cookies.get("sb-session")?.value, "refreshed");
        assert.equal(response.cookies.get("sb-session")?.httpOnly, true);
      }
    }
  }
  authError = true;
  const error = await exports.GET(
    new NextRequest("https://local.test/auth/callback?code=fake"),
  );
  assert.equal(new URL(error.headers.get("location")!).pathname, "/auth/error");
}
testAuthCallback()
  .then(() => {
    console.log(
      `Public discovery tests passed (${PUBLIC_TOOLS.length} tools, catalogue return paths, real callback with mocked email/Google exchange, session cookies, unsafe destinations, playback pause/replay/reduced motion, no business calls, deferred modal).`,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
