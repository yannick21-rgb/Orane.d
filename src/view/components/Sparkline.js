/**
 * Sparkline — courbe des 7 derniers jours.
 *
 * `react-native-svg` uniquement (aucune dépendance graphique lourde,
 * 60 fps : un seul tracé). Gère les séries vides ou plates (ligne
 * médiane) sans jamais crasher sur des données manquantes.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColors } from '../theme';

function buildPath(data, width, height, pad) {
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
    const y = pad + h - ((v - min) / span) * h;
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  const area = `${line} L${lx.toFixed(1)},${(pad + h).toFixed(1)} L${pad.toFixed(1)},${(pad + h).toFixed(1)} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

export function Sparkline({
  data,
  width = 160,
  height = 44,
  stroke,
  strokeWidth = 2,
  style,
}) {
  const colors = useColors();
  const color = stroke || colors.expense;

  const { line, area, last } = useMemo(
    () => buildPath(data && data.length ? data : [0], width, height, 4),
    [data, width, height]
  );

  return (
    <View accessible={false} importantForAccessibility="no" style={style}>
      <Svg width={width} height={height}>
        <Path d={area} fill={color} fillOpacity={0.14} />
        <Path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={last[0]} cy={last[1]} r={3} fill={color} />
      </Svg>
    </View>
  );
}

export default Sparkline;
