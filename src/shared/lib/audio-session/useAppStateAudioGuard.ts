import { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { nativeStrunaEngine } from '@/shared/api/jsi';
import { MicrophonePermissionStatus } from '@/shared/lib/permissions/useMicrophonePermission';

export interface AppStateAudioGuardOptions {
  readonly isPermissionGranted: boolean;
  readonly isCaptureRequested: boolean;
}

export interface AppStateAudioGuardState {
  readonly isCapturing: boolean;
  readonly appState: AppStateStatus;
}

export interface AudioLifecycleContextValue {
  readonly permissionStatus: MicrophonePermissionStatus;
  readonly isPermissionGranted: boolean;
  readonly isCapturing: boolean;
  readonly isCaptureRequested: boolean;
  readonly setCaptureRequested: (requested: boolean) => void;
  readonly requestPermission: () => Promise<boolean>;
  readonly openSystemSettings: () => Promise<void>;
}

const DEFAULT_AUDIO_LIFECYCLE_CONTEXT: AudioLifecycleContextValue = {
  permissionStatus: 'granted',
  isPermissionGranted: true,
  isCapturing: true,
  isCaptureRequested: true,
  setCaptureRequested: () => undefined,
  requestPermission: async () => true,
  openSystemSettings: async () => undefined,
};

export const AudioLifecycleContext =
  createContext<AudioLifecycleContextValue>(DEFAULT_AUDIO_LIFECYCLE_CONTEXT);

export const useAudioLifecycle = (): AudioLifecycleContextValue => {
  return useContext(AudioLifecycleContext);
};

export const useAppStateAudioGuard = ({
  isPermissionGranted,
  isCaptureRequested,
}: AppStateAudioGuardOptions): AppStateAudioGuardState => {
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        setAppState(nextState);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (appState !== 'active') {
      nativeStrunaEngine.setMetronomeActive(false);
      nativeStrunaEngine.setDemoMode?.(false);
    }

    const canCaptureNow =
      isPermissionGranted && isCaptureRequested && appState === 'active';

    if (!canCaptureNow) {
      nativeStrunaEngine.stopAudioCapture();
      setIsCapturing(false);
      return;
    }

    const started = nativeStrunaEngine.startAudioCapture();
    setIsCapturing(started);

    return () => {
      nativeStrunaEngine.stopAudioCapture();
    };
  }, [appState, isCaptureRequested, isPermissionGranted]);

  return {
    isCapturing,
    appState,
  };
};
