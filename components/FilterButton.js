import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function FilterButton({ label, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.button, isActive && styles.buttonActive]}
      onPress={onPress}
    >
      <Text style={[styles.text, isActive && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#f2f2f2',
  },
  buttonActive: {
    borderColor: '#31e57a',
    backgroundColor: '#31e57a',
  },
  text: {
    color: '#1c1c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  textActive: {
    color: '#0f1a12',
  },
});
