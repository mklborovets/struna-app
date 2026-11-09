import React from 'react';
import { RootNavigator } from './navigation/RootNavigator';
import { AudioLifecycleProvider } from './providers/AudioLifecycleProvider';
import { DatabaseProvider } from './providers/DatabaseProvider';

export const App: React.FC = () => {
  return (
    <DatabaseProvider>
      <AudioLifecycleProvider>
        <RootNavigator />
      </AudioLifecycleProvider>
    </DatabaseProvider>
  );
};
