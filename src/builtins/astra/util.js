module.exports = {
  suppressErrors: (func) => (...args) => {
    try {
      func(...args);
    } catch (e) {
      console.error('Suppressed error for', label, e);
    }
  }
};