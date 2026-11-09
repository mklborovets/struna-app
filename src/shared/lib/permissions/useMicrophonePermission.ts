import { useCallback, useEffect, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

export type MicrophonePermissionStatus =
  | 'checking'
  | 'granted'
  | 'denied'
  | 'blocked';

export interface MicrophonePermissionControl {
  readonly status: MicrophonePermissionStatus;
  readonly isGranted: boolean;
  readonly requestPermission: () => Promise<boolean>;
  readonly openSystemSettings: () => Promise<void>;
}

export const useMicrophonePermission = (): MicrophonePermissionControl => {
  const [status, setStatus] = useState<MicrophonePermissionStatus>('checking');

  const checkCurrentPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setStatus('granted');
      return true;
    }

    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    if (!permission) {
      setStatus('denied');
      return false;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(permission);
      if (alreadyGranted) {
        setStatus('granted');
        return true;
      }
      setStatus('denied');
      return false;
    } catch {
      setStatus('denied');
      return false;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setStatus('granted');
      return true;
    }

    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    if (!permission) {
      setStatus('denied');
      return false;
    }

    try {
      const result = await PermissionsAndroid.request(permission, {
        title: 'Microphone Permission Required',
        message:
          'STRUNA needs access to your microphone to detect guitar string pitch in real time.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('granted');
        return true;
      }

      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        setStatus('blocked');
        return false;
      }

      setStatus('denied');
      return false;
    } catch {
      setStatus('denied');
      return false;
    }
  }, []);

  const openSystemSettings = useCallback(async (): Promise<void> => {
    await Linking.openSettings();
  }, []);

  useEffect(() => {
    void checkCurrentPermission().then((granted) => {
      if (!granted) {
        void requestPermission();
      }
    });
  }, [checkCurrentPermission, requestPermission]);

  return {
    status,
    isGranted: status === 'granted',
    requestPermission,
    openSystemSettings,
  };
};
