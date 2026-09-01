// In-memory, process-lifetime request metrics. Deliberately simple and
// non-persistent (a restart resets the counters) -- this backs a
// lightweight "what is my API being hit with right now" view, not a
// durable analytics store, so it needs no database or extra dependency.
const startedAt = new Date();

const state = {
  totalRequests: 0,
  requestsByMethod: {},
  requestsByStatusClass: {},
};

function record(method, statusCode) {
  state.totalRequests += 1;
  state.requestsByMethod[method] = (state.requestsByMethod[method] || 0) + 1;

  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  state.requestsByStatusClass[statusClass] = (state.requestsByStatusClass[statusClass] || 0) + 1;
}

function snapshot() {
  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: process.uptime(),
    totalRequests: state.totalRequests,
    requestsByMethod: { ...state.requestsByMethod },
    requestsByStatusClass: { ...state.requestsByStatusClass },
  };
}

module.exports = { record, snapshot };
