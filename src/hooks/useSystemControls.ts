/**
 * useSystemControls
 *
 * JS bridge over WeftControlModule (Kotlin). Provides typed async functions
 * for every system control used by ControlCenterScreen, plus a hook that
 * reads the initial state of all controls on mount.
 *
 * Architecture:
 *   - All reads happen once on mount via Promise.allSettled so a single
 *     failing read (e.g. Bluetooth permission denied) doesn't block others.
 *   - All writes return a typed result so the UI can react accordingly:
 *       { success: true }           — worked, update local state
 *       { openedSettings: true }    — opened a settings panel, no direct change
 *       { permissionRequired: true }— opened permission screen, no direct change
 *       {}                          — silent failure, keep local state unchanged
 *   - The hook is NOT responsible for real-time polling. System state changes
 *     made outside the launcher (e.g. user turns BT off from system UI) will
 *     not be reflected until the control center reopens.
 */

import { NativeModules } from 'react-native';

// ---------------------------------------------------------------------------
// Native module reference
// ---------------------------------------------------------------------------

const { WeftControl } = NativeModules as {
  WeftControl: {
    getBrightness(): Promise<{ value: number }>;
    setBrightness(value: number): Promise<{ success?: boolean; permissionRequired?: boolean }>;
    getVolume(): Promise<{ value: number }>;
    setVolume(value: number): Promise<{ success?: boolean }>;
    getWifiEnabled(): Promise<{ value: boolean }>;
    setWifi(enabled: boolean): Promise<{ success?: boolean; openedSettings?: boolean }>;
    getBluetoothEnabled(): Promise<{ value: boolean }>;
    setBluetooth(enabled: boolean): Promise<{ success?: boolean; openedSettings?: boolean }>;
    getDndEnabled(): Promise<{ value: boolean }>;
    setDnd(enabled: boolean): Promise<{ success?: boolean; permissionRequired?: boolean }>;
    getFlashlightOn(): Promise<{ value: boolean }>;
    setFlashlight(on: boolean): Promise<{ success?: boolean }>;
    getAirplaneModeOn(): Promise<{ value: boolean }>;
    setAirplaneMode(enabled: boolean): Promise<{ openedSettings?: boolean }>;
  } | undefined;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SystemControlState = {
  brightness: number;   // 0.0–1.0
  volume: number;       // 0.0–1.0
  wifi: boolean;
  bluetooth: boolean;
  dnd: boolean;
  flashlight: boolean;
  airplane: boolean;
};

export type WriteResult =
  | { success: true }
  | { openedSettings: true }
  | { permissionRequired: true }
  | { noop: true };   // module not available (dev / simulator)

// ---------------------------------------------------------------------------
// Default state (shown before real values load)
// ---------------------------------------------------------------------------

export const DEFAULT_CONTROL_STATE: SystemControlState = {
  brightness: 0.5,
  volume: 0.4,
  wifi: false,
  bluetooth: false,
  dnd: false,
  flashlight: false,
  airplane: false,
};

// ---------------------------------------------------------------------------
// Read helpers — each returns the value or the default on any failure
// ---------------------------------------------------------------------------

async function safeBool(
  fn: () => Promise<{ value: boolean }>,
  fallback: boolean,
): Promise<boolean> {
  try {
    const r = await fn();
    return r?.value ?? fallback;
  } catch {
    return fallback;
  }
}

async function safeFloat(
  fn: () => Promise<{ value: number }>,
  fallback: number,
): Promise<number> {
  try {
    const r = await fn();
    return typeof r?.value === 'number' ? r.value : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// readAllControls — fetches initial state of every control in parallel
// ---------------------------------------------------------------------------

export async function readAllControls(): Promise<SystemControlState> {
  if (!WeftControl) {
    return DEFAULT_CONTROL_STATE;
  }

  const [brightness, volume, wifi, bluetooth, dnd, flashlight, airplane] =
    await Promise.all([
      safeFloat(() => WeftControl.getBrightness(), DEFAULT_CONTROL_STATE.brightness),
      safeFloat(() => WeftControl.getVolume(),     DEFAULT_CONTROL_STATE.volume),
      safeBool(()  => WeftControl.getWifiEnabled(),      DEFAULT_CONTROL_STATE.wifi),
      safeBool(()  => WeftControl.getBluetoothEnabled(), DEFAULT_CONTROL_STATE.bluetooth),
      safeBool(()  => WeftControl.getDndEnabled(),       DEFAULT_CONTROL_STATE.dnd),
      safeBool(()  => WeftControl.getFlashlightOn(),     DEFAULT_CONTROL_STATE.flashlight),
      safeBool(()  => WeftControl.getAirplaneModeOn(),   DEFAULT_CONTROL_STATE.airplane),
    ]);

  return { brightness, volume, wifi, bluetooth, dnd, flashlight, airplane };
}

// ---------------------------------------------------------------------------
// Write helpers — each wraps the native call into a typed WriteResult
// ---------------------------------------------------------------------------

async function callWrite(
  fn: () => Promise<Record<string, boolean | undefined>>,
): Promise<WriteResult> {
  if (!WeftControl) return { noop: true };
  try {
    const r = await fn();
    if (r?.success)            return { success: true };
    if (r?.openedSettings)     return { openedSettings: true };
    if (r?.permissionRequired) return { permissionRequired: true };
    return { noop: true };
  } catch {
    return { noop: true };
  }
}

export const SystemControls = {
  setBrightness: (v: number) =>
    callWrite(() => WeftControl!.setBrightness(v)),

  setVolume: (v: number) =>
    callWrite(() => WeftControl!.setVolume(v)),

  setWifi: (enabled: boolean) =>
    callWrite(() => WeftControl!.setWifi(enabled)),

  setBluetooth: (enabled: boolean) =>
    callWrite(() => WeftControl!.setBluetooth(enabled)),

  setDnd: (enabled: boolean) =>
    callWrite(() => WeftControl!.setDnd(enabled)),

  setFlashlight: (on: boolean) =>
    callWrite(() => WeftControl!.setFlashlight(on)),

  setAirplaneMode: (enabled: boolean) =>
    callWrite(() => WeftControl!.setAirplaneMode(enabled)),
} as const;
