"""
Configuration settings for CORE-SE Demo Backend
"""

from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""

    # App mode
    MODE: str = "demo"  # demo | web | desktop

    # Backend network configuration
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000

    # Database
    DATABASE_URL: Optional[str] = None  # Determined lazily if not provided

    # External services
    FDS_BASE_URL: Optional[str] = "http://localhost:4000"
    OPENAI_API_KEY: Optional[str] = None
    
    # Authentication
    DEMO_AUTH_TOKEN: str = "demo-token-123"
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Feature flags
    FEATURE_EMAIL: bool = True
    FEATURE_WINDCHILL: bool = True
    FEATURE_OUTLOOK: bool = True
    FEATURE_AI_MICROCALLS: bool = True
    FEATURE_TRACE_GRAPH: bool = True
    FEATURE_THEMES: bool = True
    
    # AI settings
    OPENAI_MODEL: str = "gpt-4o-mini"
    AI_TIMEOUT: int = 30
    MODEL: Optional[str] = None  # For backward compatibility
    VITE_MODEL: Optional[str] = None
    VITE_OPENAI_API_KEY: Optional[str] = None
    
    # Embedding settings
    EMBEDDING_MODEL: str = "text-embedding-ada-002"
    VECTOR_DIMENSIONS: int = 1536
    
    # Cache settings
    CACHE_TTL_PULSE: int = 300  # 5 minutes
    CACHE_TTL_IMPACT: int = 600  # 10 minutes

    # Frontend / CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "tauri://localhost",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields

    def resolve_database_url(self) -> str:
        """Resolve database URL based on mode and provided settings."""
        if self.DATABASE_URL:
            return self.DATABASE_URL

        if self.MODE == "desktop":
            data_dir = Path.home() / ".core_se" / "desktop"
            data_dir.mkdir(parents=True, exist_ok=True)
            return f"sqlite:///{data_dir / 'core_desktop.db'}"

        # Default for demo/web
        return "sqlite:///./core_demo.db"

    def resolve_fds_base_url(self) -> Optional[str]:
        """In desktop mode, FDS is optional; return None if not configured."""
        if self.MODE == "desktop" and not self.FDS_BASE_URL:
            return None
        return self.FDS_BASE_URL

    def resolved_settings(self) -> "Settings":
        """Return a new Settings object with derived values applied."""
        data = self.dict()
        data["DATABASE_URL"] = self.resolve_database_url()
        data["FDS_BASE_URL"] = self.resolve_fds_base_url()
        return Settings(**data)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    base_settings = Settings()
    return base_settings.resolved_settings()
