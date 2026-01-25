import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }
  // Animation values
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current; // Start from slightly below

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    
    // Reset animations
    opacityAnim.setValue(0);
    translateYAnim.setValue(50);

    // Animation In (Spring for bounce effect)
    Animated.parallel([
      Animated.timing(opacityAnim, { 
        toValue: 1, 
        duration: 300, 
        useNativeDriver: true 
      }),
      Animated.spring(translateYAnim, { 
        toValue: 0, 
        friction: 6,
        tension: 50,
        useNativeDriver: true 
      })
    ]).start();

    // Hide after 3 seconds
    setTimeout(hideToast, 3000);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, { 
        toValue: 0, 
        duration: 300, 
        useNativeDriver: true 
      }),
      Animated.timing(translateYAnim, { 
        toValue: 50, 
        duration: 300, 
        useNativeDriver: true 
      })
    ]).start(() => setToast(null));
  };

  // Get color based on type
  const getColors = () => {
      if (!toast) return { bg: '#333', icon: '#fff', accent: '#fff' };
      switch (toast.type) {
          case 'error': return { bg: '#2a1212', icon: '#ff4444', accent: '#ff4444' }; // Dark Red bg
          case 'info': return { bg: '#121a2a', icon: '#4a7cc7', accent: '#4a7cc7' }; // Dark Blue bg
          default: return { bg: '#122a1a', icon: '#4ade80', accent: '#4ade80' }; // Dark Green bg (Success)
      }
  };

  const colors = getColors();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View style={styles.pointerContainer} pointerEvents="box-none">
            <Animated.View 
                style={[
                    styles.toastContainer, 
                    { 
                        opacity: opacityAnim, 
                        transform: [{ translateY: translateYAnim }],
                        backgroundColor: '#1A1A1A', // Base dark color
                        borderLeftColor: colors.accent 
                    }
                ]}
            >
                <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                    <Ionicons 
                        name={toast.type === 'error' ? "alert-circle" : toast.type === 'info' ? "information-circle" : "checkmark-circle"} 
                        size={24} 
                        color={colors.accent} 
                    />
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {toast.type === 'error' ? 'تنبيه' : toast.type === 'info' ? 'معلومة' : 'نجاح'}
                    </Text>
                    <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
                </View>

                {/* Close Button (Optional UX improvement) */}
                <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
                    <Ionicons name="close" size={18} color="#666" />
                </TouchableOpacity>
            </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  // This container covers the screen but allows touches to pass through empty areas
  pointerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 50, // Positioned at bottom (above tabs usually)
    zIndex: 9999,
    justifyContent: 'flex-end', // Align toast to bottom
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  toastContainer: {
    flexDirection: 'row-reverse', // RTL Layout
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 16,
    borderLeftWidth: 4, // Accent line on the right (since RTL, left is visually right or handled by direction)
    // Actually for RTL borderLeftWidth appears on Left. Let's force direction.
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    
    borderWidth: 1,
    borderColor: '#333',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-end', // Align text to right
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
    marginBottom: 2
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right'
  },
  closeBtn: {
      padding: 5,
      marginRight: 5
  }
});
