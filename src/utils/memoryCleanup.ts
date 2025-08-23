/**
 * Memory Cleanup Utilities
 * Emergency functions to stop memory leaks and clean up resources
 */

import { businessMetricsService } from '../services/BusinessMetricsService';
import { credentialHealthMonitor } from '../services/credentialHealthMonitor';
import { autoHealing } from '../services/autoHealing';

/**
 * Emergency cleanup function to stop all known memory leaks
 */
export function emergencyMemoryCleanup(): {
  clearedServices: string[];
  timestamp: string;
  memoryBefore?: any;
  memoryAfter?: any;
} {
  console.log('🚨 EMERGENCY MEMORY CLEANUP STARTED');
  
  const clearedServices: string[] = [];
  let memoryBefore: any;
  let memoryAfter: any;

  // Capture memory before cleanup
  if (typeof performance !== 'undefined' && performance.memory) {
    memoryBefore = {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    };
    console.log('📊 Memory before cleanup:', memoryBefore);
  }

  try {
    // 1. Clean up BusinessMetricsService
    if (businessMetricsService && typeof businessMetricsService.destroy === 'function') {
      businessMetricsService.destroy();
      clearedServices.push('BusinessMetricsService');
    }
  } catch (error) {
    console.warn('Failed to cleanup BusinessMetricsService:', error);
  }

  try {
    // 2. Clean up CredentialHealthMonitor
    if (credentialHealthMonitor && typeof credentialHealthMonitor.dispose === 'function') {
      credentialHealthMonitor.dispose();
      clearedServices.push('CredentialHealthMonitor');
    }
  } catch (error) {
    console.warn('Failed to cleanup CredentialHealthMonitor:', error);
  }

  try {
    // 3. Clean up AutoHealingService
    if (autoHealing && typeof autoHealing.destroy === 'function') {
      autoHealing.destroy();
      clearedServices.push('AutoHealingService');
    }
  } catch (error) {
    console.warn('Failed to cleanup AutoHealingService:', error);
  }

  // 4. Clear any global intervals that might be leaked
  try {
    // Note: This is a bit aggressive but necessary for emergency cleanup
    const highestIntervalId = setTimeout(() => {}, 0);
    for (let i = 1; i < highestIntervalId; i++) {
      clearInterval(i);
    }
    clearTimeout(highestIntervalId);
    console.log(`🧹 Cleared potential leaked intervals up to ID ${highestIntervalId}`);
  } catch (error) {
    console.warn('Failed to clear global intervals:', error);
  }

  // 5. Force garbage collection if available
  try {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      clearedServices.push('GarbageCollection');
      console.log('🗑️ Forced garbage collection');
    }
  } catch (error) {
    console.warn('Failed to force garbage collection:', error);
  }

  // 6. Clear large localStorage items that might be consuming memory
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value && value.length > 50000) { // More than 50KB
            console.log(`⚠️ Large localStorage item: ${key} (${Math.round(value.length / 1024)}KB)`);
            // Don't auto-remove, just report for now
            // localStorage.removeItem(key);
            // keysToRemove.push(key);
          }
        }
      }
      if (keysToRemove.length > 0) {
        clearedServices.push(`LocalStorage(${keysToRemove.length})`);
      }
    }
  } catch (error) {
    console.warn('Failed to check localStorage:', error);
  }

  // Capture memory after cleanup
  if (typeof performance !== 'undefined' && performance.memory) {
    memoryAfter = {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    };
    console.log('📊 Memory after cleanup:', memoryAfter);
    
    if (memoryBefore) {
      const savedMB = memoryBefore.used - memoryAfter.used;
      console.log(`💾 Memory saved: ${savedMB}MB`);
    }
  }

  const result = {
    clearedServices,
    timestamp: new Date().toISOString(),
    memoryBefore,
    memoryAfter
  };

  console.log('✅ EMERGENCY CLEANUP COMPLETE:', result);
  return result;
}

/**
 * Monitor memory usage and automatically cleanup if it gets too high
 */
export function startMemoryMonitoring(
  threshold: number = 85, // Percentage
  interval: number = 10000 // 10 seconds
): () => void {
  const monitoringInterval = setInterval(() => {
    if (typeof performance !== 'undefined' && performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      const percentage = (used / limit) * 100;
      
      if (percentage > threshold) {
        console.error(`🚨 HIGH MEMORY USAGE: ${percentage.toFixed(1)}% (${Math.round(used/1024/1024)}MB)`);
        console.log('🧹 Triggering emergency cleanup...');
        emergencyMemoryCleanup();
      } else if (percentage > threshold * 0.8) {
        console.warn(`⚠️ ELEVATED MEMORY: ${percentage.toFixed(1)}% (${Math.round(used/1024/1024)}MB)`);
      }
    }
  }, interval);

  console.log(`🛡️ Memory monitoring started (threshold: ${threshold}%, interval: ${interval}ms)`);

  // Return cleanup function
  return () => {
    clearInterval(monitoringInterval);
    console.log('🛡️ Memory monitoring stopped');
  };
}

/**
 * Get current memory usage information
 */
export function getMemoryInfo(): any {
  if (typeof performance !== 'undefined' && performance.memory) {
    const memory = performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      timestamp: new Date().toISOString()
    };
  }
  return { error: 'Performance memory API not available' };
}

// Make functions available globally for emergency use
if (typeof window !== 'undefined') {
  (window as any).emergencyMemoryCleanup = emergencyMemoryCleanup;
  (window as any).getMemoryInfo = getMemoryInfo;
  (window as any).startMemoryMonitoring = startMemoryMonitoring;
}