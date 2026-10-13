// CrossPlatformDatePicker.js — un seul déclencheur, deux plateformes.
//
// Le composant lit désormais la palette lui-même (`useColors`) au lieu de
// recevoir un objet `colors` partiel des quatre écrans appelants. Ces objets
// partiels portaient trois clés et rien d'autre ; le composant gardait un
// `|| '#hex'` derrière chacune, qui ne se déclenchait jamais — jusqu'au premier
// appelant oubliant une clé, auquel cas le champ serait revenu à la palette
// d'avant la refonte, en dur, sans bruit. Une seule source, complète,
// supprime la classe de bug entière.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useColors } from '../theme';

let NativeDateTimePicker = null;
if (Platform.OS !== 'web') {
  try {
    NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {}
}

export default function CrossPlatformDatePicker({ value, mode = 'date', onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const colors = useColors();

  if (NativeDateTimePicker && Platform.OS !== 'web') {
    if (!showPicker) {
      return (
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={[styles.trigger, { backgroundColor: colors.sunken, borderColor: colors.rule }]}
        >
          <Text style={[styles.triggerText, { color: colors.ink }]}>
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

  // Natif sans `@react-native-community/datetimepicker` : on dégrade en
  // déclencheur inerte plutôt que de rendre un `<input>` HTML, invalide sur
  // iOS/Android (le rendu web de secours ne s'applique pas au natif).
  if (Platform.OS !== 'web') {
    return (
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.sunken, borderColor: colors.rule }]}
      >
        <Text style={[styles.triggerText, { color: colors.ink }]}>
          {mode === 'time'
            ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
            : value.toLocaleDateString()}
        </Text>
      </TouchableOpacity>
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
    // Formatage LOCAL : `toISOString()` passe en UTC et affichait le jour
    // précédent pour tout fuseau positif (UTC+1 …), alors que la valeur lue
    // par `handleChange` est reconstruite en heure locale.
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  // Sur le web c'est un `<input>` natif : ces propriétés sont du CSS, pas des
  // styles RN. Le rayon suit l'échelle de `tokens.radius` — pas une valeur
  // isolée écrite ici, qui divergerait du reste de l'application.
  return (
    <input
      type={mode === 'time' ? 'time' : 'date'}
      value={formatValue(value)}
      onChange={handleChange}
      style={{
        padding: '12px 16px',
        borderRadius: '12px',
        border: `1px solid ${colors.rule}`,
        background: colors.sunken,
        color: colors.ink,
        fontSize: '15px',
        fontWeight: '500',
        width: '100%',
        boxSizing: 'border-box',
        // Un champ natif garde son ombre interne et son ombre de focus
        // navigateur ; « le carnet » les supprime partout ailleurs.
        outlineOffset: '2px',
      }}
    />
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '600',
  },
});