import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
};

const ProfileListItem: React.FC<Props> = ({
  icon,
  label,
  detail,
  onPress,
  isSwitch,
  switchValue,
  onSwitchChange,
}) => {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={isSwitch}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color="#111" />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rightContainer}>
        {detail && <Text style={styles.detail}>{detail}</Text>}
        {isSwitch ? (
          <Switch value={switchValue} onValueChange={onSwitchChange} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#b0b0b0" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f2f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  rightContainer: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detail: {
    fontSize: 15,
    color: '#888',
  },
});

export default React.memo(ProfileListItem);