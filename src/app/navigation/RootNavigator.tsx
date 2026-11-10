import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { HistoryPage } from '@/pages/history';
import { MetronomePage } from '@/pages/metronome';
import { TunerPage } from '@/pages/tuner';
import { THEME_COLORS } from '@/shared/config/theme';
import { IconButton } from '@/shared/ui/IconButton';
import { Typography } from '@/shared/ui/Typography';
import { HistoryIcon } from '@/shared/ui/icons/HistoryIcon';
import { MetronomeIcon } from '@/shared/ui/icons/MetronomeIcon';
import { TuningForkIcon } from '@/shared/ui/icons/TuningForkIcon';

export type AppRouteTab = 'tuner' | 'metronome' | 'history';

export const RootNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppRouteTab>('tuner');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={THEME_COLORS.backgroundPrimary}
      />
      <View style={styles.header}>
        <Typography variant="title" style={styles.brandTitle}>
          STRUNA
        </Typography>
        <View style={styles.navTabs}>
          <IconButton
            compact
            icon={
              <TuningForkIcon
                size={14}
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
            compact
            icon={
              <MetronomeIcon
                size={14}
                color={
                  activeTab === 'metronome'
                    ? THEME_COLORS.accentInTune
                    : THEME_COLORS.textSecondary
                }
              />
            }
            label="TEMPO"
            active={activeTab === 'metronome'}
            onPress={() => setActiveTab('metronome')}
          />
          <IconButton
            compact
            icon={
              <HistoryIcon
                size={14}
                color={
                  activeTab === 'history'
                    ? THEME_COLORS.accentInTune
                    : THEME_COLORS.textSecondary
                }
              />
            }
            label="LOG"
            active={activeTab === 'history'}
            onPress={() => setActiveTab('history')}
          />
        </View>
      </View>

      <View style={styles.pageViewport}>
        {activeTab === 'tuner' ? (
          <TunerPage />
        ) : activeTab === 'metronome' ? (
          <MetronomePage />
        ) : (
          <HistoryPage />
        )}
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
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.borderSubtle,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
    flexShrink: 0,
  },
  navTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
    gap: 6,
  },
  pageViewport: {
    flex: 1,
  },
});
