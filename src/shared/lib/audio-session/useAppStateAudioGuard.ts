import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { nativeStrunaEngine } from '@/shared/api/jsi';

export interface AppStateAudioGuardOptions {
  readonly isPermissionGranted: boolean;
  readonly isCaptureRequested: boolean;
}

export interface AppStateAudioGuardState {
  readonly isCapturing: boolean;
  readonly appState: AppStateStatus;
}

export const useAppStateAudioGuard = ({
  isPermissionGranted,
  isCaptureRequested,
}: AppStateAudioGuardOptions): AppStateAudioGuardState => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const shouldResumeRef = useRef<boolean>(false);

  useEffect(() => {
    const canCaptureNow =
      isPermissionGranted && isCaptureRequested && appState === 'active';

    if (canCaptureNow) {
      const started = nativeStrunaEngine.startAudioCapture();
      setIsCapturing(started);
      shouldResumeRef.current = started;
    } else {
      nativeStrunaEngine.stopAudioCapture();
      setIsCapturing(false);
    }

    return () => {
      nativeStrunaEngine.stopAudioCapture();
    };
  }, [appState, isCaptureRequested, isPermissionGranted]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        setAppState(nextState);
        if (nextState !== 'active') {
          nativeStrunaEngine.stopAudioCapture();
          setIsCapturing(false);
        } else if (
          isPermissionGranted &&
          isCaptureRequested &&
          shouldResumeRef.current
        ) {
          const restarted = nativeStrunaEngine.startAudioCapture();
          setIsCapturing(restarted);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isCaptureRequested, isPermissionGranted]);

  return {
    isCapturing,
    appState,
  };
};
