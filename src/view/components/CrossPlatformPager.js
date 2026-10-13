import React, { forwardRef, useImperativeHandle, useState, useRef, useCallback, useEffect } from 'react';
import { View, Animated, PanResponder, useWindowDimensions } from 'react-native';

/**
 * Pager web : largeur réactive (`useWindowDimensions`) et PanResponder
 * recréé à chaque rendu. La version précédente lisait `Dimensions.get` au
 * premier rendu et figeait le PanResponder dans un `useRef` — après un
 * redimensionnement, `translateX` et le seuil de swipe restaient calés sur
 * l'ancienne largeur : page active décalée, swipe qui snappait ailleurs.
 */
const CrossPlatformPager = forwardRef(({ children, initialPage = 0, onPageSelected, style }, ref) => {
  const { width: screenWidth } = useWindowDimensions();
  const [, setActiveIndex] = useState(initialPage);
  const scrollX = useRef(new Animated.Value(initialPage * screenWidth)).current;
  const currentIndex = useRef(initialPage);
  const pageCount = React.Children.count(children);

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

  useImperativeHandle(ref, () => ({
    setPage: (index) => goTo(index),
  }));

  // Redimensionnement / rotation : on recale instantanément la page active
  // sur la nouvelle largeur (sinon elle reste affichée à moitié).
  useEffect(() => {
    scrollX.setValue(currentIndex.current * screenWidth);
  }, [screenWidth, scrollX]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 15 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      const threshold = screenWidth * 0.2;
      if (gesture.dx < -threshold && currentIndex.current < pageCount - 1) {
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
  });

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
