import React, { useMemo, useState } from 'react';
import {
  AudioLifecycleContext,
  AudioLifecycleContextValue,
  useAppStateAudioGuard,
  useAudioLifecycle,
} from '@/shared/lib/audio-session/useAppStateAudioGuard';
import { useMicrophonePermission } from '@/shared/lib/permissions/useMicrophonePermission';

export type { AudioLifecycleContextValue };
export { useAudioLifecycle };

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
