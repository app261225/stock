import { View, Text, StyleSheet } from 'react-native';

export default function AddProductScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Add Product</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
});
