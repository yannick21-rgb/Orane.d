/**
 * QuickAddContext — état partagé de la saisie rapide.
 *
 * Le bouton « + » (TabBar) et les actions rapides (accueil) ouvrent la
 * même `TransactionSheet`. C'est un état de présentation pur : aucune
 * logique métier ne transite ici, seuls `visible` et le type initial.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const QuickAddContext = createContext({
  visible: false,
  initialType: 'expense',
  open: () => {},
  close: () => {},
});

export function QuickAddProvider({ children }) {
  const [state, setState] = useState({ visible: false, initialType: 'expense' });

  const open = useCallback((type = 'expense') => {
    setState({ visible: true, initialType: type });
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const value = useMemo(
    () => ({ visible: state.visible, initialType: state.initialType, open, close }),
    [state.visible, state.initialType, open, close]
  );

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>;
}

export function useQuickAdd() {
  return useContext(QuickAddContext);
}

export default QuickAddContext;
