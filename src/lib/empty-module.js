// Empty module to replace problematic dependencies
module.exports = {}
module.exports.default = {}

// Export as ES module as well
export default {}

// Handle various require patterns
if (typeof global !== 'undefined') {
  global.mockAws = {}
  global.nock = () => ({})
  global.AWS = {}
}