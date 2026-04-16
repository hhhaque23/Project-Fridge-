// Reusable animation components - lightweight using RN Animated API + haptics
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View, Text, ViewStyle, TextStyle, Platform } from 'react-native';

// Lazy load haptics so it doesn't break web SSR
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch {}
}

function lightHaptic() {
  if (Haptics) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  } else if (typeof window !== 'undefined' && (window as any).navigator?.vibrate) {
    // Web vibration API for Android Chrome
    try { (window as any).navigator.vibrate(8); } catch {}
  }
}

// ─── FadeInView ──────────────────────────────────────────
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: ViewStyle | ViewStyle[];
}

export function FadeInView({
  children,
  delay = 0,
  duration = 400,
  translateY = 12,
  style,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: translate }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── PressableScale ──────────────────────────────────────
// Real button feel: scale + shadow press + haptic + brightness shift
interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  haptic?: boolean;
  style?: ViewStyle | ViewStyle[] | any;
  hitSlop?: { top?: number; left?: number; right?: number; bottom?: number };
}

export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  scaleTo = 0.94,
  haptic = true,
  style,
  hitSlop,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }),
      Animated.timing(opacity, {
        toValue: 0.8,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (haptic && !disabled) lightHaptic();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={hitSlop}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
            opacity: disabled ? 0.4 : opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── CountUp ─────────────────────────────────────────────
interface CountUpProps {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle | TextStyle[];
}

export function CountUp({ to, duration = 1000, decimals = 0, prefix = '', suffix = '', style }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayValue(value);
    });

    Animated.timing(animatedValue, {
      toValue: to,
      duration,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    return () => animatedValue.removeListener(listenerId);
  }, [to]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();
  return <Text style={style}>{prefix}{formatted}{suffix}</Text>;
}

// ─── PulseView ───────────────────────────────────────────
interface PulseViewProps {
  children: React.ReactNode;
  active?: boolean;
  style?: ViewStyle | ViewStyle[];
  color?: string;
}

export function PulseView({ children, active = true, style, color = '#4CAF50' }: PulseViewProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={[{ position: 'relative' }, style]}>
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 999,
            backgroundColor: color,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
      )}
      {children}
    </View>
  );
}

// ─── StaggeredList ──────────────────────────────────────
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerMs?: number;
  initialDelay?: number;
}

export function StaggeredList({ children, staggerMs = 60, initialDelay = 0 }: StaggeredListProps) {
  const arr = React.Children.toArray(children);
  return (
    <>
      {arr.map((child, idx) => (
        <FadeInView key={idx} delay={initialDelay + idx * staggerMs}>
          {child}
        </FadeInView>
      ))}
    </>
  );
}

// ─── BouncyBadge ─────────────────────────────────────────
interface BouncyBadgeProps {
  children: React.ReactNode;
  triggerKey: any;
  style?: ViewStyle | ViewStyle[];
}

export function BouncyBadge({ children, triggerKey, style }: BouncyBadgeProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  }, [triggerKey]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

// ─── Skeleton ────────────────────────────────────────────
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── CheckmarkAnimation ──────────────────────────────────
interface CheckmarkAnimationProps {
  size?: number;
  color?: string;
  visible: boolean;
}

export function CheckmarkAnimation({ size = 24, color = '#4CAF50', visible }: CheckmarkAnimationProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 40 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: [{ scale }],
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.6, fontWeight: '700' }}>✓</Text>
    </Animated.View>
  );
}
