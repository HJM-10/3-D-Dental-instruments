import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const { user } = useContext(AuthContext);

  const fetchCart = async () => {
    if (!user) {
      setCart(null);
      return;
    }
    try {
      const response = await api.get('/cart/');
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId, quantity = 1, configuration = null) => {
    try {
      await api.post('/cart/add', { product_id: productId, quantity, configuration });
      await fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await api.delete(`/cart/remove/${itemId}`);
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = () => setCart(null);

  return (
    <CartContext.Provider value={{ cart, fetchCart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
