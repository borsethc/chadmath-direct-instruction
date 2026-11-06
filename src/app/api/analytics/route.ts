import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  AnalyticsStoreData,
  AnalyticsEventPayload,
  applyAnalyticsEvent,
  buildAppAnalyticsReport,
  createEmptyAnalyticsStore,
  reconcileHistoricalStudentProgress,
  verifyOwnerAnalyticsAccess,
} from "@/lib/analytics";
import type { AnalyticsDateRange, StudentProfile } from "@/lib/types";

const SERVER_STORE_PATH = path.join("/tmp", "chadmath-di-analytics-store-v1.json");

let memoryStore: AnalyticsStoreData | null = null;
let memoryProfilesMap: Map<string, StudentProfile> = new Map();

function loadServerAnalyticsStore(): AnalyticsStoreData {
  if (memoryStore) {
    return memoryStore;
  }
  try {
    if (fs.existsSync(SERVER_STORE_PATH)) {
      const raw = fs.readFileSync(SERVER_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as AnalyticsStoreData;
      if (parsed && typeof parsed.sessions === "object") {
        memoryStore = {
          sessions: parsed.sessions || {},
          processedEventIds: Array.isArray(parsed.processedEventIds)
            ? parsed.processedEventIds
            : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        return memoryStore;
      }
    }
  } catch {
    // Fallback to memory store
  }
  memoryStore = createEmptyAnalyticsStore();
  return memoryStore;
}

function saveServerAnalyticsStore(store: AnalyticsStoreData): void {
  memoryStore = store;
  try {
    if (store.processedEventIds.length > 5000) {
      store.processedEventIds = store.processedEventIds.slice(-5000);
    }
    fs.writeFileSync(SERVER_STORE_PATH, JSON.stringify(store), "utf-8");
  } catch {
    // Ignore filesystem errors in read-only environments; memoryStore remains updated
  }
}

function mergeClientStoreIntoServer(
  serverStore: AnalyticsStoreData,
  clientStore?: AnalyticsStoreData,
  clientProfiles?: StudentProfile[]
): void {
  if (Array.isArray(clientProfiles)) {
    for (const p of clientProfiles) {
      if (p && p.id) {
        memoryProfilesMap.set(p.id, p);
      }
    }
    reconcileHistoricalStudentProgress(
      serverStore,
      Array.from(memoryProfilesMap.values())
    );
  }

  if (clientStore && clientStore.sessions) {
    for (const [sessionId, clientSession] of Object.entries(clientStore.sessions)) {
      const existing = serverStore.sessions[sessionId];
      if (!existing) {
        serverStore.sessions[sessionId] = clientSession;
      } else {
        // Idempotent merge without inflating active time or completions
        if (clientSession.lastUpdatedAt > existing.lastUpdatedAt) {
          existing.lastUpdatedAt = clientSession.lastUpdatedAt;
          existing.lastStage = clientSession.completed ? "complete" : clientSession.lastStage;
        }
        if (clientSession.completed) {
          existing.completed = true;
          existing.lastStage = "complete";
          existing.completedAt = existing.completedAt || clientSession.completedAt;
        }
        if (clientSession.checkoutPassed) {
          existing.checkoutPassed = true;
        }
        if (typeof clientSession.activeDurationSeconds === "number") {
          existing.activeDurationSeconds = Math.max(
            existing.activeDurationSeconds ?? 0,
            clientSession.activeDurationSeconds
          );
        }
        if (Array.isArray(clientSession.stageHistory)) {
          for (const sh of clientSession.stageHistory) {
            if (!existing.stageHistory.some((e) => e.stage === sh.stage)) {
              existing.stageHistory.push(sh);
            }
          }
        }
        if (Array.isArray(clientSession.attempts)) {
          existing.attemptsTracked = existing.attemptsTracked || clientSession.attemptsTracked;
          for (const att of clientSession.attempts) {
            if (!existing.attempts.some((a) => a.eventId === att.eventId)) {
              existing.attempts.push(att);
            }
          }
        }
      }
    }
  }

  saveServerAnalyticsStore(serverStore);
}

export async function GET(request: NextRequest) {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("x-chadmath-pin") ||
    request.headers.get("x-chadmath-token");

  const authCheck = verifyOwnerAnalyticsAccess(authHeader);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  const rangeParam = request.nextUrl.searchParams.get("range") || "all";
  const range: AnalyticsDateRange =
    rangeParam === "7d" || rangeParam === "30d" ? rangeParam : "all";

  const store = loadServerAnalyticsStore();
  const profiles = Array.from(memoryProfilesMap.values());
  const report = buildAppAnalyticsReport(store, profiles, range);

  return NextResponse.json({ ok: true, report }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Case 1: Owner querying the analytics report (with client-side sync payload)
    if (body && body.action === "query_report") {
      const authHeader =
        request.headers.get("authorization") ||
        request.headers.get("x-chadmath-pin") ||
        request.headers.get("x-chadmath-token") ||
        body.token;

      const authCheck = verifyOwnerAnalyticsAccess(authHeader);
      if (!authCheck.authorized) {
        return NextResponse.json(
          { error: authCheck.error },
          { status: authCheck.status }
        );
      }

      const range: AnalyticsDateRange =
        body.range === "7d" || body.range === "30d" ? body.range : "all";

      const store = loadServerAnalyticsStore();
      mergeClientStoreIntoServer(store, body.clientStore, body.clientProfiles);
      const profiles = Array.from(memoryProfilesMap.values());
      const report = buildAppAnalyticsReport(store, profiles, range);

      return NextResponse.json({ ok: true, report }, { status: 200 });
    }

    // Case 2: Learner telemetry event ingestion (registered learner or anonymous guest)
    if (body && body.event) {
      const event = body.event as AnalyticsEventPayload;
      const store = loadServerAnalyticsStore();
      applyAnalyticsEvent(store, event);
      saveServerAnalyticsStore(store);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid analytics request payload" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Malformed request body" },
      { status: 400 }
    );
  }
}

