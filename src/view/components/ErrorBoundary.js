import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../theme';

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    const handler = (error) => {
      setHasError(true);
      setErrorMsg(error?.message || 'Erreur inconnue');
    };
    global.ErrorUtils?.setGlobalHandler?.(handler);
    return () => {
      if (global.ErrorUtils?.setGlobalHandler) {
        global.ErrorUtils.setGlobalHandler(null);
      }
    };
  }, []);

  // Hook TOUJOURS appelé au même rang (règle des hooks) : un appel après le
  // branchement `if (hasError)` ferait varier le nombre de hooks entre deux
  // rendus et React lèverait une nouvelle erreur dans le composant censé
  // afficher l'écran de secours.
  const colors = useColors();

  if (hasError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Text style={[styles.emoji, { color: colors.text }]}>⚠️</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Une erreur est survenue
        </Text>
        <Text style={[styles.msg, { color: colors.subText }]}>
          {errorMsg}
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={() => setHasError(false)}
        >
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  msg: { fontSize: 14, textAlign: 'center', marginBottom: 24, maxWidth: 400 },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
