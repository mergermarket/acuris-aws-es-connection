module.exports = {
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/src'],
  moduleDirectories: ['node_modules'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testRunner: 'jest-circus/runner'
}
