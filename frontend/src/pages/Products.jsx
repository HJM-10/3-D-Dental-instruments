import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { CartContext } from '../context/CartContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useContext(CartContext);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products/');
        setProducts(response.data);
      } catch (error) {
        console.error('Failed to fetch products', error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Products</h2>
        <button className="btn btn-primary">+ Add Product</button>
      </div>
      
      <div className="grid grid-cols-3">
        {products.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No products found.</p>
        ) : (
          products.map(prod => (
            <div key={prod.id} className="card">
              <h3>{prod.name}</h3>
              <p className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 600 }}>${prod.base_price.toFixed(2)}</p>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{prod.description}</p>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => addToCart(prod.id)}>
                Add to Cart
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Products;
