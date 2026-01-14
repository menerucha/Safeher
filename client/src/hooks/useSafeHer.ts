// This hook is deprecated - components use direct tRPC calls instead
// Kept for reference only
export function useSafeHer() {
  return {
    deviceId: null,
    isRegistered: false,
    isLoading: false,
    error: null,
    activeSosEventId: null,
    isTracking: false,
    registerDevice: async () => null,
    triggerSos: async () => null,
    stopTracking: async () => null,
    startLocationTracking: () => null,
    syncOfflineRequests: async () => null,
  };
}
