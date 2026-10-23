import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';

/**
 * ApiErrorListener — listens for the global 'api_error' CustomEvent
 * dispatched by src/services/api.js and shows a toast notification.
 * Replace GlobalToast.jsx with this component.
 */
const ApiErrorListener = () => {
  const toast = useToast();

  useEffect(() => {
    const handler = (e) => {
      toast.error('Request Failed', e.detail);
    };
    window.addEventListener('api_error', handler);
    return () => window.removeEventListener('api_error', handler);
  }, [toast]);

  return null;
};

export default ApiErrorListener;
