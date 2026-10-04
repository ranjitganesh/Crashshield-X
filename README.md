# CrashShield X
### Resource-Transition Graph Based Adaptive Process Instability Detection and Closed-Loop Preventive Monitoring System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

## 1. System Overview & Patent Inventions

**CrashShield X** implements a process monitoring and closed-loop preventive diagnostic architecture. Rather than treating isolated metric spikes as failures, the system converts continuous changes in CPU usage, memory usage, and thread activity into semantic events, maps them into a **Temporal Resource-Transition Graph (TRTG)**, and uses the detected transition walk to adaptively control monitoring rates, confirm real instability, or reject transient spikes.

```
       +-----------------------------------------------------------+
       |                  Host OS / psutil Sampler                 |
       +-----------------------------+-----------------------------+
                                     | (ResourceSnapshots)
                                     v
       +-----------------------------------------------------------+
       |             7.3 Resource Event Engine                     |
       |  - CPU/Mem/Thread Increase, Spikes, Persistence, Recovery |
       +-----------------------------+-----------------------------+
                                     | (ResourceEvents)
                                     v
       +-----------------------------------------------------------+
       |         7.4 Temporal Resource-Transition Graph            |
       |  - Directed time-ordered multi-graph G_p = (V, E)         |
       +-----------------------------+-----------------------------+
                                     | (Graph Walk)
                                     v
       +-----------------------------------------------------------+
       |            7.5 / 7.6 Instability Path Analyzer            |
       |  - State: Normal -> Suspicious -> Developing -> Confirmed |
       |  - Health Index (0-100%) & Risk Level (Low/Med/High/Crit)  |
       +-----------------------------+-----------------------------+
                                     | (Feedback Signal)
                                     v
       +-----------------------------------------------------------+
       |          7.7 / 7.8 Adaptive Monitoring Controller         |
       |  - Closed-Loop Sampling: Standard (3s) <-> Burst (250ms)  |
       |  - Re-observation Confirmation & Transient Rejection      |
       +-----------------------------------------------------------+
```

---

## 2. Core Patent Architecture (Sections 7.1 – 7.14)

1. **7.1 & 7.11 Process Monitor & Main Dashboard**:
   - Real-time sampling of running OS processes (PID, Name, CPU %, Memory MB/%, Threads, Handles, I/O rates) via `psutil`.
   - Search, multi-state filtering (`Normal`, `Suspicious`, `Developing`, `Confirmed`, `Recovered`), and instant drill-down.
2. **7.2 Process Resource Monitoring**:
   - Time-series sliding window baseline evaluation for CPU, memory, and thread counts.
3. **7.3 Resource Event Engine**:
   - Translates cross-metric deltas into discrete events: `CPU_INCREASE`, `CPU_SPIKE`, `CPU_NORMAL`, `MEM_INCREASE`, `MEM_LEAK_TREND`, `MEM_NORMAL`, `THREAD_INCREASE`, `THREAD_BURST`, `THREAD_NORMAL`, `PERSISTENCE`, `RECOVERY`.
4. **7.4 Temporal Resource-Transition Graph (TRTG)**:
   - Directed chronological graph $G_p = (V, E)$ per monitored process.
   - Interactive SVG canvas with active path highlight, directed transition arrows with $\Delta t$ delta duration badges, and node inspectors.
5. **7.5 & 7.6 Instability Path Analyzer & Process State Identification**:
   - Pattern classification engine distinguishing transient single-resource spikes from developing multi-resource degradation cascades and persistent runaways.
6. **7.7 & 7.8 Adaptive Monitoring Controller (Closed-Loop Preventive Monitoring)**:
   - Dynamic frequency shifting: **Standard** (3.0s / 0.33Hz) $\leftrightarrow$ **Accelerated** (1.0s / 1.0Hz) $\leftrightarrow$ **High-Frequency Burst** (0.25s / 4.0Hz).
   - Re-observation verification window ($k / N$) ensuring confirmed persistence before preventive isolation or transient rejection upon recovery.
7. **7.9 Health & Risk Information**:
   - Real-time Health Index (0-100%) and Risk Level assessment (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
8. **7.10 & 7.13 Diagnostic and Event Logging / System History Archive**:
   - Filterable audit logs, event archives, and 1-click **CSV** and **JSON** diagnostic report exporters.
9. **7.12 Real-Time Resource Telemetry & Performance Analysis**:
   - Multi-metric time-series area charts for CPU %, Memory MB, and Threads.

---

## 3. Section 8 Patent Experimental Validation Testbed

The system includes an interactive testbed for all 4 patent experimental conditions:

| Test Condition | CPU Usage | Memory Usage | Thread Count | Monitoring Rate | Result | Status |
|---|---|---|---|---|---|---|
| **1. Temporary CPU Increase** | 4.5% - 84.0% | 48.0 MB | 4 threads | 0.33 Hz (Standard) | **Temporary / Recovered** | PASSED |
| **2. Developing Abnormal Behaviour** | 6.0% - 58.0% | 310.0 MB | 36 threads | 4.00 Hz (Burst) | **Developing** | PASSED |
| **3. Recovery Condition** | 5.0% - 65.0% | 160.0 MB | 22 threads | 1.00 Hz (Accelerated) | **Recovered** | PASSED |
| **4. Continuing Abnormal Behaviour** | 8.0% - 96.0% | 690.0 MB | 95 threads | 4.00 Hz (Burst) | **Confirmed** | PASSED |

---

## 4. Quick Start & Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Installation & Launch

#### Option A: Windows 1-Click Launcher
Simply double-click `start.bat` in the project root directory.

#### Option B: Manual Terminal Launch

**1. Start the FastAPI Backend**:
```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```
*Backend runs on `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).*

**2. Start the React Frontend**:
```bash
cd frontend
npm install
npm run dev
```
*Frontend dashboard opens at `http://localhost:5173`.*

---

## 5. Running Automated Backend Tests

```bash
python backend/test_runner.py
```
Output:
```
Running CrashShield X Test Suite...
  [PASS] test_event_engine_cpu_spike
  [PASS] test_event_engine_memory_leak_and_recovery
  [PASS] test_temporal_graph_construction
  [PASS] test_closed_loop_adaptive_controller
  [PASS] test_all_patent_section_8_scenarios (All 4 Patent Scenarios Verified!)

ALL 5 CORE TEST SUITES PASSED SUCCESSFULLY (100% SUCCESS)!
```

---

## 6. REST & WebSocket API Endpoints

- `GET /api/system/metrics` - Real-time system-wide CPU, memory, and state counts.
- `GET /api/processes` - List of running processes with current health & risk telemetry.
- `GET /api/processes/{pid}` - Full process details, recent events, and historical telemetry.
- `GET /api/processes/{pid}/graph` - Node-link Temporal Resource-Transition Graph.
- `GET /api/processes/{pid}/analysis` - Instability Path Analyzer state and diagnostic recommendations.
- `POST /api/scenarios/run/{scenario_id}` - Execute Patent Section 8 scenario.
- `GET /api/scenarios/results` - Retrieve validation comparison matrix.
- `POST /api/workload/inject` - Inject custom stress / anomaly workload.
- `GET /api/events/export/csv` - Download event archive in CSV format.
- `GET /api/events/export/json` - Download forensic diagnostic report in JSON format.
- `WS /ws` - Full-duplex WebSocket streaming real-time telemetry at dynamic rates.
