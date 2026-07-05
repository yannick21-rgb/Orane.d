import React, { forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react';
import { View, Animated, PanResponder, Dimensions } from 'react-native';

const CrossPlatformPager = forwardRef(({ children, initialPage = 0, onPageSelected, style }, ref) => {
  const screenWidth = Dimensions.get('window').width;
  const [activeIndex, setActiveIndex] = useState(initialPage);
  const scrollX = useRef(new Animated.Value(initialPage * screenWidth)).current;
  const currentIndex = useRef(initialPage);

  useImperativeHandle(ref, () => ({
    setPage: (index) => {
      currentIndex.current = index;
      setActiveIndex(index);
      if (onPageSelected) onPageSelected({ nativeEvent: { position: index } });
      Animated.spring(scrollX, {
        toValue: index * screenWidth,
        useNativeDriver: true,
        friction: 8,
      }).start();
    },
  }));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 15 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        const threshold = screenWidth * 0.2;
        if (gesture.dx < -threshold && currentIndex.current < React.Children.count(children) - 1) {
          goTo(currentIndex.current + 1);
        } else if (gesture.dx > threshold && currentIndex.current > 0) {
          goTo(currentIndex.current - 1);
        } else {
          Animated.spring(scrollX, {
            toValue: currentIndex.current * screenWidth,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const goTo = useCallback((index) => {
    currentIndex.current = index;
    setActiveIndex(index);
    if (onPageSelected) onPageSelected({ nativeEvent: { position: index } });
    Animated.spring(scrollX, {
      toValue: index * screenWidth,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [onPageSelected, screenWidth, scrollX]);

  const pages = React.Children.toArray(children);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]} {...panResponder.panHandlers}>
      <Animated.View
        style={{
          flexDirection: 'row',
          width: screenWidth * pages.length,
          transform: [{ translateX: Animated.multiply(scrollX, -1) }],
          flex: 1,
        }}
      >
        {pages.map((page, i) => (
          <View key={i} style={{ width: screenWidth, flex: 1 }}>
            {page}
          </View>
        ))}
      </Animated.View>
    </View>
  );
});

CrossPlatformPager.displayName = 'CrossPlatformPager';

export default CrossPlatformPager;
