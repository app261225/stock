// Global Event Bus untuk trigger update cross-screen
// Non-Node.js EventEmitter, compatible dengan React Native

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    };
  }

  emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[EventBus] Error in listener:', error);
        }
      });
    }
  }

  off(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }
  }

  clear(eventName) {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }
}

// Export singleton instance
export default new EventBus();
