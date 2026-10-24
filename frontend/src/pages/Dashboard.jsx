import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AdminOverview from '../components/AdminOverview';
import CustomerDashboard from '../components/customer/CustomerDashboard';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  return ['admin', 'super_admin'].includes(user?.role) ? <AdminOverview /> : <CustomerDashboard />;
}
