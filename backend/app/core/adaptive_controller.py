import time
from typing import Dict, List, Optional

from .models import (
    InstabilityState,
    AdaptiveMonitoringStatus,
    PathAnalysisResult,
    ResourceSnapshot
)

class AdaptiveMonitoringController:
    """
    Section 7.7 & 7.8: Adaptive Monitoring Controller (Closed-Loop Preventive Monitoring)
    Dynamically adjusts sampling frequency based on detected process instability transitions.
    Re-observes processes at higher frequency (Accelerated / Burst) to confirm sustained instability
    or reject temporary transient spikes, then restores standard monitoring upon recovery.
    """

    def __init__(
        self,
        base_interval_sec: float = 3.0,
        accelerated_interval_sec: float = 1.0,
        burst_interval_sec: float = 0.25,
        reobservation_window: int = 5
    ):
        self.base_interval = base_interval_sec
        self.accelerated_interval = accelerated_interval_sec
        self.burst_interval = burst_interval_sec
        self.reobservation_window = reobservation_window

        # pid -> AdaptiveMonitoringStatus
        self._statuses: Dict[int, AdaptiveMonitoringStatus] = {}

    def get_or_create_status(self, pid: int, process_name: str) -> AdaptiveMonitoringStatus:
        if pid not in self._statuses:
            self._statuses[pid] = AdaptiveMonitoringStatus(
                pid=pid,
                process_name=process_name,
                base_interval_sec=self.base_interval,
                current_interval_sec=self.base_interval,
                accelerated_interval_sec=self.accelerated_interval,
                burst_interval_sec=self.burst_interval,
                sampling_mode="STANDARD",
                reobservation_window=self.reobservation_window,
                reobservation_count=0,
                confirmation_status="NORMAL",
                trigger_reason="Baseline continuous monitoring"
            )
        return self._statuses[pid]

    def update_adaptive_state(
        self,
        snapshot: ResourceSnapshot,
        analysis: PathAnalysisResult
    ) -> AdaptiveMonitoringStatus:
        """
        Closed-loop controller update step.
        Adjusts polling rate and updates re-observation verification counters.
        """
        pid = snapshot.pid
        status = self.get_or_create_status(pid, snapshot.name)

        current_state = analysis.state

        if current_state == InstabilityState.NORMAL:
            status.current_interval_sec = self.base_interval
            status.sampling_mode = "STANDARD"
            status.confirmation_status = "NORMAL"
            status.reobservation_count = 0
            status.trigger_reason = "Nominal operating envelope"

        elif current_state == InstabilityState.SUSPICIOUS:
            status.current_interval_sec = self.accelerated_interval
            status.sampling_mode = "ACCELERATED"
            status.trigger_reason = f"Suspicious transition detected ({analysis.matched_pattern}) -> Ramping to 1.0s sampling"
            status.confirmation_status = "VERIFYING"
            status.reobservation_count += 1

        elif current_state == InstabilityState.DEVELOPING:
            status.current_interval_sec = self.burst_interval
            status.sampling_mode = "BURST"
            status.trigger_reason = "Developing cross-resource escalation -> Engaging 250ms High-Frequency Burst"
            status.confirmation_status = "VERIFYING"
            status.reobservation_count += 1

        elif current_state == InstabilityState.CONFIRMED:
            status.current_interval_sec = self.burst_interval
            status.sampling_mode = "BURST"
            status.confirmation_status = "CONFIRMED"
            status.trigger_reason = "Instability confirmed via sustained re-observation path"

        elif current_state == InstabilityState.RECOVERED:
            # Rejection / Recovery: Throttle back down to standard rate
            status.current_interval_sec = self.base_interval
            status.sampling_mode = "STANDARD"
            status.confirmation_status = "REJECTED_TRANSIENT" if analysis.is_temporary else "RECOVERED"
            status.reobservation_count = 0
            status.trigger_reason = "Resource metrics returned to nominal baseline -> Restoring standard rate"

        return status

    def reset_process(self, pid: int):
        self._statuses.pop(pid, None)
