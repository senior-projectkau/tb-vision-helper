import { useEffect } from 'react';

export const useCustomScript = () => {
  useEffect(() => {
    // Put your JavaScript logic here
    console.log('Custom script functionality loaded');
    
    // Example: Add event listeners, initialize libraries, etc.
    const handleCustomEvent = () => {
      console.log('Custom event triggered');
    };

    // Add your custom functionality here
    document.addEventListener('customEvent', handleCustomEvent);

    // Cleanup
    return () => {
      document.removeEventListener('customEvent', handleCustomEvent);
    };
  }, []);

  // Return any functions you want to use in components
  const customFunction = () => {
    console.log('Custom function called');
  };

  return { customFunction };
};