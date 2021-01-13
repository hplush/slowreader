let base = require('../jest.config')

module.exports = {
  ...base,
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      statements: 100
    }
  }
}
