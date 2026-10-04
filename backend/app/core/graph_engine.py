import time
import uuid
from typing import Dict, List, Optional

from .models import (
    TemporalResourceGraph,
    GraphNode,
    GraphEdge,
    ResourceSnapshot,
    ResourceEvent,
    InstabilityState,
    EventType
)

class TemporalGraphEngine:
    """
    Section 7.4: Temporal Resource-Transition Graph (TRTG)
    Constructs and maintains directed, time-ordered resource transition graphs per process.
    Connects sequential states and events into directed transition walks with duration,
    delta vectors, and state transitions.
    """

    def __init__(self, max_nodes_per_process: int = 30):
        self.max_nodes = max_nodes_per_process
        # pid -> TemporalResourceGraph
        self._graphs: Dict[int, TemporalResourceGraph] = {}
        # pid -> last node ID
        self._last_node_ids: Dict[int, str] = {}

    def get_or_create_graph(self, pid: int, process_name: str) -> TemporalResourceGraph:
        if pid not in self._graphs:
            # Create root Baseline/Normal node
            root_id = f"node_{pid}_0"
            root_node = GraphNode(
                id=root_id,
                label=f"Baseline (Normal)",
                timestamp=time.time(),
                state=InstabilityState.NORMAL,
                event_type=None,
                cpu_percent=0.0,
                memory_rss_mb=0.0,
                thread_count=1,
                description="Process initialized into baseline monitoring",
                is_active=True
            )
            self._graphs[pid] = TemporalResourceGraph(
                pid=pid,
                process_name=process_name,
                nodes=[root_node],
                edges=[],
                active_path=[root_id],
                last_updated=time.time()
            )
            self._last_node_ids[pid] = root_id

        return self._graphs[pid]

    def add_transition(
        self,
        snapshot: ResourceSnapshot,
        events: List[ResourceEvent],
        current_state: InstabilityState
    ) -> TemporalResourceGraph:
        """
        Appends new state node and connecting directed edge to the process graph.
        """
        pid = snapshot.pid
        graph = self.get_or_create_graph(pid, snapshot.name)
        prev_node_id = self._last_node_ids.get(pid)

        # Find previous node
        prev_node = next((n for n in graph.nodes if n.id == prev_node_id), graph.nodes[-1] if graph.nodes else None)

        now = snapshot.timestamp
        node_id = f"node_{pid}_{len(graph.nodes)}_{int(now * 1000) % 10000}"

        # Determine primary event label
        primary_event = events[0].event_type if events else None
        if primary_event:
            label = f"{primary_event.value} ({current_state.value})"
            desc = events[0].description
        else:
            label = f"Sample ({current_state.value})"
            desc = f"CPU: {snapshot.cpu_percent}%, Mem: {snapshot.memory_rss_mb}MB, Threads: {snapshot.thread_count}"

        # Mark previous nodes as inactive
        for n in graph.nodes:
            n.is_active = False

        new_node = GraphNode(
            id=node_id,
            label=label,
            timestamp=now,
            state=current_state,
            event_type=primary_event,
            cpu_percent=snapshot.cpu_percent,
            memory_rss_mb=snapshot.memory_rss_mb,
            thread_count=snapshot.thread_count,
            description=desc,
            is_active=True
        )

        graph.nodes.append(new_node)

        # Create directed edge from prev_node -> new_node
        if prev_node:
            delta_time = max(0.01, now - prev_node.timestamp)
            delta_cpu = snapshot.cpu_percent - prev_node.cpu_percent
            delta_mem = snapshot.memory_rss_mb - prev_node.memory_rss_mb
            delta_threads = snapshot.thread_count - prev_node.thread_count

            edge_label = f"+{delta_time:.1f}s"
            if primary_event:
                edge_label += f" | {primary_event.value}"

            edge_id = f"edge_{prev_node.id}_to_{new_node.id}"
            new_edge = GraphEdge(
                id=edge_id,
                source=prev_node.id,
                target=new_node.id,
                transition_type=primary_event.value if primary_event else "TIMED_SAMPLE",
                delta_time_sec=round(delta_time, 2),
                delta_cpu=round(delta_cpu, 1),
                delta_mem_mb=round(delta_mem, 1),
                delta_threads=delta_threads,
                label=edge_label,
                weight=1.5 if primary_event else 1.0
            )
            graph.edges.append(new_edge)

        # Prune old nodes if exceeding max_nodes
        if len(graph.nodes) > self.max_nodes:
            # Retain the root node and recent nodes
            removed_node = graph.nodes.pop(1)
            graph.edges = [e for e in graph.edges if e.source != removed_node.id and e.target != removed_node.id]

        # Update active path
        graph.active_path.append(node_id)
        if len(graph.active_path) > 15:
            graph.active_path.pop(0)

        graph.last_updated = now
        self._last_node_ids[pid] = node_id

        return graph

    def get_graph(self, pid: int) -> Optional[TemporalResourceGraph]:
        return self._graphs.get(pid)

    def reset_graph(self, pid: int):
        self._graphs.pop(pid, None)
        self._last_node_ids.pop(pid, None)
