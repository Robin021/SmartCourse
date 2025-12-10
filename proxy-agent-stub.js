/**
 * Minimal stub for proxy-agent to satisfy ali-oss/urllib dependency in environments
 * where proxy-agent is not installed or needed.
 */
class DummyProxyAgent {
  constructor(proxy) {
    this.proxy = proxy;
  }
}

function createProxyAgent(proxy) {
  return new DummyProxyAgent(proxy);
}

module.exports = createProxyAgent;
module.exports.default = createProxyAgent;
module.exports.DummyProxyAgent = DummyProxyAgent;
