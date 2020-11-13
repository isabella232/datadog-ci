const NodeEnvironment = require('jest-environment-node')
const getEnvironment = require('dd-trace/packages/datadog-plugin-jest/src/index')

module.exports = getEnvironment(NodeEnvironment)
