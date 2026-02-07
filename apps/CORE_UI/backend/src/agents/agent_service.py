"""
Agent Service - Manages agent provider and provides unified interface

This service acts as the single point of access for agent operations,
allowing easy switching between different providers via configuration.
"""

from typing import Dict, Any, Optional
import logging

from .types import AgentProvider
from .providers.mock_provider import MockAgentProvider

logger = logging.getLogger(__name__)


class AgentService:
    """
    Singleton service for managing agents.
    
    This service wraps the configured agent provider and provides
    a consistent interface regardless of the underlying implementation.
    """
    
    _instance: Optional['AgentService'] = None
    _provider: Optional[AgentProvider] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    async def initialize(cls, provider_type: str = "mock", config: Dict[str, Any] = None) -> 'AgentService':
        """
        Initialize the agent service with a specific provider.
        
        Args:
            provider_type: Type of provider ("mock", "openclaw", "langgraph", etc.)
            config: Provider-specific configuration
            
        Returns:
            Initialized AgentService instance
        """
        instance = cls()
        
        if instance._provider is not None:
            logger.warning("Agent service already initialized, shutting down existing provider")
            await instance._provider.shutdown()
        
        config = config or {}
        
        # Factory pattern for provider creation
        if provider_type == "mock":
            instance._provider = MockAgentProvider(config)
        elif provider_type == "openclaw":
            from .providers.openclaw_provider import OpenClawProvider
            instance._provider = OpenClawProvider(config)
        elif provider_type == "langgraph":
            # Placeholder for LangGraph integration
            # from .providers.langgraph_provider import LangGraphProvider
            # instance._provider = LangGraphProvider(config)
            raise NotImplementedError("LangGraph provider not yet implemented")
        elif provider_type == "crewai":
            # Placeholder for CrewAI integration
            # from .providers.crewai_provider import CrewAIProvider
            # instance._provider = CrewAIProvider(config)
            raise NotImplementedError("CrewAI provider not yet implemented")
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        await instance._provider.initialize()
        logger.info(f"Agent service initialized with provider: {provider_type}")
        
        return instance
    
    @classmethod
    def get_instance(cls) -> 'AgentService':
        """Get the singleton instance (must be initialized first)"""
        if cls._instance is None or cls._instance._provider is None:
            raise RuntimeError("AgentService not initialized. Call initialize() first.")
        return cls._instance
    
    @property
    def provider(self) -> AgentProvider:
        """Get the underlying provider"""
        if self._provider is None:
            raise RuntimeError("AgentService not initialized")
        return self._provider
    
    async def shutdown(self):
        """Shutdown the service and cleanup resources"""
        if self._provider:
            await self._provider.shutdown()
            self._provider = None
        logger.info("Agent service shut down")


# Convenience singleton getter
def get_agent_service() -> AgentService:
    """Get the initialized agent service instance"""
    return AgentService.get_instance()
