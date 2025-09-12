// src/components/ContestCountdown.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  endDate: Date;
}

const ContestCountdown: React.FC<Props> = ({ endDate }) => {
  // CORRECTION: La syntaxe de la fonction est corrigée ici
  const calculateTimeLeft = () => {
    const difference = +endDate - +new Date();
    let timeLeft: { [key: string]: number } = {};

    if (difference > 0) {
      timeLeft = {
        jours: Math.floor(difference / (1000 * 60 * 60 * 24)),
        heures: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        secondes: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
    if (value < 0) {
      return null;
    }

    return (
      <View key={interval} style={styles.timeBlock}>
        <Text style={styles.timeValue}>{String(value).padStart(2, '0')}</Text>
        <Text style={styles.timeLabel}>{interval}</Text>
      </View>
    );
  });

  return (
    <View style={styles.container}>
      {timerComponents.length ? timerComponents : <Text style={styles.endedText}>Concours terminé !</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 12,
  },
  timeBlock: {
    backgroundColor: '#111',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 55,
    alignItems: 'center',
  },
  timeValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  timeLabel: {
    color: '#e5e7eb',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  endedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});

export default ContestCountdown;
