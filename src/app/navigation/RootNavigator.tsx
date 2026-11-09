import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { HistoryPage } from '@/pages/history';
import { TunerPage } from '@/pages/tuner';
import { THEME_COLORS } from '@/shared/config/theme';
import { IconButton } from '@/shared/ui/IconButton';
import { Typography } from '@/shared/ui/Typography';
import { HistoryIcon } from '@/shared/ui/icons/HistoryIcon';
import { TuningForkIcon } from '@/shared/ui/icons/TuningForkIcon';

export type AppRouteTab = 'tuner' | 'history';

export const RootNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppRouteTab>('tuner');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLORS.backgroundPrimary} />
      <View style={styles.header}>
        <Typography variant="title">STRUNA</Typography>
        <View style={styles.navTabs}>
          <IconButton
            icon={
              <TuningForkIcon
                size={16}
                color={
                  activeTab === 'tuner'
                    ? THEME_COLORS.accentInTune
                    : THEME_COLORS.textSecondary
                }
              />
            }
            label="TUNER"
            active={activeTab === 'tuner'}
            onPress={() => setActiveTab('tuner')}
          />
          <IconButton
            icon={
              <HistoryIcon
                size={16}
                color={
                  activeTab === 'history'
                    ? THEME_COLORS.accentInTune
                    : THEME_COLORS.textSecondary
                }
              />
            }
            label="HISTORY"
            active={activeTab === 'history'}
            onPress={() => setActiveTab('history')}
          />
        </View>
      </View>

      <View style={styles.pageViewport}>
        {activeTab === 'tuner' ? <TunerPage /> : <HistoryPage />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.borderSubtle,
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageViewport: {
    flex: 1,
  },
});
