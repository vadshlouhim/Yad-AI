"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "easycom-demo-state-v1";

export type DemoEvent = {
  title: string;
  date: string;
  location: string;
};

export type DemoState = {
  version: 1;
  event: DemoEvent | null;
  contentGenerated: boolean;
  visualSelected: boolean;
  adaptedChannels: string[];
  publicationScheduled: boolean;
  connectedChannels: string[];
  completedActions: string[];
};

const INITIAL_STATE: DemoState = {
  version: 1,
  event: null,
  contentGenerated: false,
  visualSelected: false,
  adaptedChannels: [],
  publicationScheduled: false,
  connectedChannels: ["Instagram", "Facebook", "Telegram", "Email"],
  completedActions: [],
};

type DemoContextValue = {
  state: DemoState;
  hydrated: boolean;
  createEvent: (event: DemoEvent) => void;
  generateContent: () => void;
  selectVisual: () => void;
  adaptChannels: (channels: string[]) => void;
  schedulePublication: () => void;
  toggleChannel: (channel: string) => void;
  completeAction: (action: string) => void;
  reset: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function normalizeState(value: unknown): DemoState {
  if (!value || typeof value !== "object") return INITIAL_STATE;
  const candidate = value as Partial<DemoState>;
  if (candidate.version !== 1) return INITIAL_STATE;
  return {
    ...INITIAL_STATE,
    ...candidate,
    adaptedChannels: Array.isArray(candidate.adaptedChannels) ? candidate.adaptedChannels : [],
    connectedChannels: Array.isArray(candidate.connectedChannels) ? candidate.connectedChannels : INITIAL_STATE.connectedChannels,
    completedActions: Array.isArray(candidate.completedActions) ? candidate.completedActions : [],
  };
}

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setState(normalizeState(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const createEvent = useCallback((event: DemoEvent) => {
    setState((current) => ({ ...current, event }));
  }, []);
  const generateContent = useCallback(() => {
    setState((current) => ({ ...current, contentGenerated: true }));
  }, []);
  const selectVisual = useCallback(() => {
    setState((current) => ({ ...current, visualSelected: true }));
  }, []);
  const adaptChannels = useCallback((channels: string[]) => {
    setState((current) => ({ ...current, adaptedChannels: channels }));
  }, []);
  const schedulePublication = useCallback(() => {
    setState((current) => ({ ...current, publicationScheduled: true }));
  }, []);
  const toggleChannel = useCallback((channel: string) => {
    setState((current) => ({
      ...current,
      connectedChannels: current.connectedChannels.includes(channel)
        ? current.connectedChannels.filter((item) => item !== channel)
        : [...current.connectedChannels, channel],
    }));
  }, []);
  const completeAction = useCallback((action: string) => {
    setState((current) => current.completedActions.includes(action)
      ? current
      : { ...current, completedActions: [...current.completedActions, action] });
  }, []);
  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
  }, []);

  const value = useMemo(() => ({
    state,
    hydrated,
    createEvent,
    generateContent,
    selectVisual,
    adaptChannels,
    schedulePublication,
    toggleChannel,
    completeAction,
    reset,
  }), [adaptChannels, completeAction, createEvent, generateContent, hydrated, reset, schedulePublication, selectVisual, state, toggleChannel]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoState() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemoState must be used inside DemoStateProvider");
  return context;
}
