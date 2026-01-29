
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, onCancel, onConfirm, confirmText = "تأكيد", cancelText = "إلغاء", type = "warning" }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={styles.iconContainer}>
            <Ionicons 
                name={type === 'danger' ? "trash-bin" : "alert-circle"} 
                size={40} 
                color={type === 'danger' ? "#ff4444" : "#4a7cc7"} 
            />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.btn, styles.confirmBtn, type === 'danger' && {backgroundColor: '#ff4444'}]} 
                onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  alertBox: {
    width: Math.min(width * 0.85, 400),
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15
  },
  iconContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 50
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  message: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 15
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333'
  },
  confirmBtn: {
    backgroundColor: '#4a7cc7'
  },
  cancelText: {
    color: '#fff',
    fontWeight: '600'
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default CustomAlert;
