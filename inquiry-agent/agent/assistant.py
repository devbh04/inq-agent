"""
Shubh Voice Agent Class Definition for Eximple.
"""

import logging
from livekit.agents import Agent
from .prompts import SHUBH_SYSTEM_PROMPT

logger = logging.getLogger("shubh-assistant")


class ShubhAgent(Agent):
    """
    Shubh - Eximple's Marine Freight Voice Representative.
    """

    def __init__(self, tools: list) -> None:
        super().__init__(
            instructions=SHUBH_SYSTEM_PROMPT,
            tools=tools,
        )
        logger.info("Initialized ShubhAgent with %d tools.", len(tools))
