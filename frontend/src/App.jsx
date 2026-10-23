import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import ProductDetails from './pages/ProductDetails';
import Settings from './pages/Settings';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import OrderTracking from './pages/OrderTracking';
import CustomCursor from './components/CustomCursor';
import ApiErrorListener from './components/ApiErrorListener';
import ProductCustomizer3D from './components/ProductCustomizer3D';

function NotFound() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 900, opacity: 0.15 }}>404</h1>
      <h2>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>The page you're looking for doesn't exist.</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <CustomCursor />
          <ApiErrorListener />
          <BrowserRouter>
            <Routes>
              {/* Public — login only */}
              <Route path="/login" element={<Login />} />

              {/* All authenticated routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/categories"   element={<Categories />} />
                <Route path="/products/:id" element={<ProductDetails />} />
                <Route path="/cart"         element={<Cart />} />
                <Route path="/orders"       element={<Orders />} />
                <Route path="/orders/:id"   element={<OrderTracking />} />
                <Route path="/settings"     element={<Settings />} />
                {/* /customize always requires a product ID — bare path redirects to catalog */}
                <Route path="/customize" element={<Navigate to="/categories" replace />} />
                <Route path="/customize/:id" element={<ProductCustomizer3D />} />
                <Route path="*"             element={<NotFound />} />
              </Route>

              {/* Admin-only */}
              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route path="/analytics" element={<Analytics />} />
              </Route>

              {/* Super admin-only */}
              <Route element={<ProtectedRoute superAdminOnly={true} />}>
                <Route path="/users" element={<Users />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
