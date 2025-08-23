// Unregister service workers for development
export const unregisterServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service worker unregistered:', registration.scope);
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }
      
      console.log('All service workers and caches cleared');
    } catch (error) {
      console.error('Failed to unregister service workers:', error);
    }
  }
};

// Auto-unregister in development
if (process.env.NODE_ENV === 'development') {
  unregisterServiceWorkers();
}