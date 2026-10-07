import { useWindowDimensions, View } from 'react-native';
import React from 'react';
import { radius } from '../view/theme/tokens';

export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isWide = isTablet || isDesktop;

  const contentMaxWidth = isDesktop ? 900 : isTablet ? 680 : width;

  return {
    width,
    height,
    isTablet,
    isDesktop,
    isWide,
    contentMaxWidth,
    contentPadding: isWide ? 24 : 20,
    cardPadding: isWide ? 28 : 24,
    borderRadius: radius.lg,
    gridColumns: isDesktop ? 3 : isTablet ? 2 : 1,
    chartWidth: width - (isWide ? 48 : 40),
  };
}

export function ScreenContent({ children, style, maxWidth, align = 'center' }) {
  const { contentMaxWidth, isWide, contentPadding } = useResponsive();
  const effectiveMaxWidth = maxWidth ?? contentMaxWidth;

  return (
    <React.Fragment>
      {isWide ? (
        <View style={[styles.wideWrapper, { maxWidth: effectiveMaxWidth, alignSelf: align }]}>
          <View style={[styles.wideInner, { paddingHorizontal: contentPadding }]}>
            {children}
          </View>
        </View>
      ) : (
        <View style={[styles.narrowWrapper, { paddingHorizontal: contentPadding }]}>
          {children}
        </View>
      )}
    </React.Fragment>
  );
}

const styles = {
  wideWrapper: { width: '100%', alignSelf: 'center' },
  wideInner: { width: '100%' },
  narrowWrapper: { width: '100%' },
};

export function getResponsiveStyles({ isWide, contentPadding, cardPadding, borderRadius }) {
  return {
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: contentPadding, paddingBottom: 40 },
    card: { padding: cardPadding, borderRadius },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
    title: { fontSize: isWide ? 36 : 32, fontWeight: 'bold', marginTop: 2 },
    sectionTitle: { fontSize: isWide ? 20 : 18, fontWeight: 'bold' },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  };
}