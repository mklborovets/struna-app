import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  MicrophonePermissionStatus,
  useMicrophonePermission,
} from '@/shared/lib/permissions/useMicrophonePermission';
import { useAppStateAudioGuard } from '@/shared/lib/audio-session/useAppStateAudioGuard';

export interface AudioLifecycleContextValue {
  readonly permissionStatus: MicrophonePermissionStatus;
  readonly isPermissionGranted: boolean;
  readonly isCapturing: boolean;
  readonly isCaptureRequested: boolean;
  readonly setCaptureRequested: (requested: boolean) => void;
  readonly requestPermission: () => Promise<boolean>;
  readonly openSystemSettings: () => Promise<void>;
}

const AudioLifecycleContext = createContext<AudioLifecycleContextValue | null>(
  null
);

export interface AudioLifecycleProviderProps {
  readonly children: React.ReactNode;
}

export const AudioLifecycleProvider: React.FC<AudioLifecycleProviderProps> = ({
  children,
}) => {
  const [isCaptureRequested, setCaptureRequested] = useState<boolean>(true);
  const { status, isGranted, requestPermission, openSystemSettings } =
    useMicrophonePermission();

  const { isCapturing } = useAppStateAudioGuard({
    isPermissionGranted: isGranted,
    isCaptureRequested,
  });

  const contextValue = useMemo<AudioLifecycleContextValue>(
    () => ({
      permissionStatus: status,
      isPermissionGranted: isGranted,
      isCapturing,
      isCaptureRequested,
      setCaptureRequested,
      requestPermission,
      openSystemSettings,
    }),
    [
      isCaptureRequested,
      isCapturing,
      isGranted,
      openSystemSettings,
      requestPermission,
      status,
    ]
  );

  return (
    <AudioLifecycleContext.Provider value={contextValue}>
      {children}
    </AudioLifecycleContext.Provider>
  );
};

export const useAudioLifecycle = (): AudioLifecycleContextValue => {
  const context = useContext(AudioLifecycleContext);
  if (!context) {
    throw new Error(
      'useAudioLifecycle must be used within an AudioLifecycleProvider'
    );
  }
  return context;
};
