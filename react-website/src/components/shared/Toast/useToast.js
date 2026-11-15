import { useCallback, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'warning' });

  const setToastMessage = useCallback((message, type = 'warning') => {
    setToast({ message, type: type === 'success' ? 'success' : 'warning' });
  }, []);

  return { toast, setToastMessage };
}
