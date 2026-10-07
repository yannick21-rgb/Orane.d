import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useColors } from '../theme';
import { radius } from '../theme/tokens';

let NativeDateTimePicker = null;
if (Platform.OS !== 'web') {
  try {
    NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {}
}

export default function CrossPlatformDatePicker({ value, mode = 'date', onChange, isDark, colors: colorsProp }) {
  const [showPicker, setShowPicker] = useState(false);
  // Sans props : on retombe sur la palette du thème courant.
  const palette = useColors();
  const colors = colorsProp || { inputBg: palette.inputBg, border: palette.border, text: palette.ink };

  if (NativeDateTimePicker && Platform.OS !== 'web') {
    if (!showPicker) {
      return (
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={[styles.trigger, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
        >
          <Text style={[styles.triggerText, { color: colors.text }]}>
            {mode === 'time'
              ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
              : value.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <NativeDateTimePicker
        value={value}
        mode={mode}
        is24Hour
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(event, selectedDate) => {
          setShowPicker(Platform.OS === 'ios');
          if (onChange) onChange(event, selectedDate || value);
        }}
      />
    );
  }

  const handleChange = (e) => {
    const raw = e.target.value;
    if (!raw) return;
    if (mode === 'time') {
      const [h, m] = raw.split(':').map(Number);
      const d = new Date(value);
      d.setHours(h, m, 0, 0);
      if (onChange) onChange({ type: 'set' }, d);
    } else {
      const d = new Date(raw + 'T00:00:00');
      if (onChange) onChange({ type: 'set' }, d);
    }
  };

  const formatValue = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    if (mode === 'time') {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return d.toISOString().split('T')[0];
  };

  return (
    <input
      type={mode === 'time' ? 'time' : 'date'}
      value={formatValue(value)}
      onChange={handleChange}
      style={{
        padding: '12px 16px',
        borderRadius: `${radius.sm}px`,
        border: `1px solid ${colors.border}`,
        background: colors.inputBg,
        color: colors.text,
        fontSize: '15px',
        fontWeight: '500',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
