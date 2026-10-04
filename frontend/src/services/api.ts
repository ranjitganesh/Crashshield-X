async function requestApi(endpoint: string, options: RequestInit = {}) {
  const urls = [
    `/api${endpoint}`,
    `http://localhost:8000/api${endpoint}`,
    `http://127.0.0.1:8000/api${endpoint}`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // try next fallback url
    }
  }
  return null;
}

export async function fetchSystemMetrics() {
  return await requestApi("/system/metrics");
}

export async function fetchProcesses(limit = 40) {
  const data = await requestApi(`/processes?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchProcessDetail(pid: number) {
  return await requestApi(`/processes/${pid}`);
}

export async function fetchProcessGraph(pid: number) {
  return await requestApi(`/processes/${pid}/graph`);
}

export async function fetchEvents(pid?: number, limit = 100) {
  const query = pid ? `?pid=${pid}&limit=${limit}` : `?limit=${limit}`;
  const data = await requestApi(`/events${query}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchAuditLogs(limit = 100) {
  const data = await requestApi(`/audit-logs?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchScenarios() {
  const data = await requestApi("/scenarios");
  return Array.isArray(data) ? data : [];
}

export async function fetchScenarioResults() {
  const data = await requestApi("/scenarios/results");
  return Array.isArray(data) ? data : [];
}

export async function runScenario(scenarioId: string) {
  return await requestApi(`/scenarios/run/${scenarioId}`, {
    method: "POST",
  });
}

export async function injectWorkload(req: {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_rss_mb: number;
  thread_count: number;
}) {
  return await requestApi("/workload/inject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function selectProcessFocus(pid: number) {
  return await requestApi(`/processes/${pid}/select`, {
    method: "POST",
  });
}

export async function resetProcess(pid: number) {
  return await requestApi(`/processes/${pid}/reset`, {
    method: "POST",
  });
}
