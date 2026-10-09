"""
Shanaya Voice Agent Class Definition for Eximple.
"""

import logging
from livekit.agents import Agent
from .prompts import SHANAYA_SYSTEM_PROMPT, SHUBH_SYSTEM_PROMPT

logger = logging.getLogger("shanaya-assistant")


class ShanayaAgent(Agent):
    """
    Shanaya - Eximple's Marine Freight Voice Representative.
    Warm, approachable, and friendly phone sales specialist.
    """

    def __init__(self, tools: list) -> None:
        super().__init__(
            instructions=SHANAYA_SYSTEM_PROMPT,
            tools=tools,
        )
        logger.info("Initialized ShanayaAgent with %d tools.", len(tools))


# Backwards compatibility alias
ShubhAgent = ShanayaAgent
