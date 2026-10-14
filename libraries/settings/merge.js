function merge(settings, defaults) {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      defaults[key] = merge(value, defaults[key] || {})
    } else {
      defaults[key] = value
    }
  }
  return defaults
}

module.exports = { merge }
