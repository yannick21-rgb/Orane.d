import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import NativePagerView from 'react-native-pager-view';

const CrossPlatformPager = forwardRef(({ children, initialPage = 0, onPageSelected, style }, ref) => {
  return (
    <NativePagerView
      ref={ref}
      style={style}
      initialPage={initialPage}
      onPageSelected={onPageSelected}
    >
      {children}
    </NativePagerView>
  );
});

CrossPlatformPager.displayName = 'CrossPlatformPager';

export default CrossPlatformPager;
