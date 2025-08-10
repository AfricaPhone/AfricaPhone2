import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useStore } from '../store/StoreContext';
import { getProductById } from '../data/products';

const CartScreen: React.FC = () => {
  const { cartItems, setQty, removeFromCart, total, clearCart } = useStore();

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>My cart</Text>

      <FlatList
        data={cartItems}
        keyExtractor={(i) => i.productId}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
              <Text style={styles.price}>${item.price.toFixed(2)}</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => setQty(item.productId, Math.max(0, item.qty - 1))} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                <Text style={styles.qty}>{item.qty}</Text>
                <TouchableOpacity onPress={() => setQty(item.productId, item.qty + 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromCart(item.productId)} style={styles.removeBtn}><Text>Remove</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>
        <TouchableOpacity
          onPress={() => {
            if (cartItems.length === 0) return;
            Alert.alert('Checkout', 'Demo checkout — implement Stripe plus tard.');
            clearCart();
          }}
          style={[styles.checkout, { opacity: cartItems.length ? 1 : 0.5 }]}
          disabled={cartItems.length === 0}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  empty: { textAlign: 'center', color: '#777', marginTop: 40 },
  item: { flexDirection: 'row', gap: 12, marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: '#fafafa' },
  image: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  title: { fontWeight: '600' },
  price: { marginTop: 6, fontWeight: '700' },
  qtyRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#eaeaea', alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 24, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 8 },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12 },
  total: { fontSize: 18, fontWeight: '800', flex: 1 },
  checkout: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
});

export default CartScreen;
