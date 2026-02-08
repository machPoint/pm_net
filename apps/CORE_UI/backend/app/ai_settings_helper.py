"""
Helper functions for accessing user AI settings
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import UserSettingsDB
from typing import Optional, Dict, List


async def get_user_ai_settings(user_id: str, db: AsyncSession) -> Dict:
    """
    Get user's AI prompt settings for use in AI operations.
    Returns a dict with domain focus, prompts, and style preferences.
    """
    result = await db.execute(
        select(UserSettingsDB).where(UserSettingsDB.user_id == user_id)
    )
    settings_db = result.scalar_one_or_none()
    
    if not settings_db:
        # Return defaults
        return {
            "domain_focus": ["interfaces", "electrical"],
            "response_style": "detailed",
            "analysis_depth": "standard",
            "custom_system_prompt": "",
            "relationship_prompt": "",
            "impact_prompt": ""
        }
    
    return {
        "domain_focus": settings_db.domain_focus or ["interfaces", "electrical"],
        "response_style": settings_db.response_style,
        "analysis_depth": settings_db.analysis_depth,
        "custom_system_prompt": settings_db.custom_system_prompt or "",
        "relationship_prompt": settings_db.relationship_prompt or "",
        "impact_prompt": settings_db.impact_prompt or ""
    }


def build_system_prompt_with_settings(base_prompt: str, ai_settings: Dict, prompt_type: Optional[str] = None) -> str:
    """
    Build a complete system prompt by combining base prompt with user's AI settings.
    
    Args:
        base_prompt: The default system prompt
        ai_settings: User's AI settings dict from get_user_ai_settings()
        prompt_type: Optional prompt type ("relationship", "impact", etc.)
    
    Returns:
        Complete system prompt string
    """
    prompt_parts = [base_prompt]
    
    # Add custom system prompt if provided
    if ai_settings["custom_system_prompt"]:
        prompt_parts.append(f"\nUser preferences: {ai_settings['custom_system_prompt']}")
    
    # Add domain focus
    if ai_settings["domain_focus"]:
        domains = ", ".join(ai_settings["domain_focus"])
        prompt_parts.append(f"\nPrioritize these engineering domains: {domains}")
    
    # Add response style
    style_instructions = {
        "brief": "Provide brief, concise responses with key points only.",
        "standard": "Provide balanced responses with adequate detail.",
        "detailed": "Provide comprehensive, detailed analysis.",
        "technical": "Provide deep technical analysis with equations and specifications where applicable."
    }
    if ai_settings["response_style"] in style_instructions:
        prompt_parts.append(f"\n{style_instructions[ai_settings['response_style']]}")
    
    # Add analysis depth
    depth_instructions = {
        "shallow": "Focus only on direct, first-level impacts and relationships.",
        "standard": "Analyze 2-3 levels deep in dependency trees.",
        "deep": "Perform exhaustive analysis across all dependency levels."
    }
    if ai_settings["analysis_depth"] in depth_instructions:
        prompt_parts.append(f"\n{depth_instructions[ai_settings['analysis_depth']]}")
    
    # Add type-specific prompt
    if prompt_type == "relationship" and ai_settings["relationship_prompt"]:
        prompt_parts.append(f"\nRelationship analysis guidance: {ai_settings['relationship_prompt']}")
    elif prompt_type == "impact" and ai_settings["impact_prompt"]:
        prompt_parts.append(f"\nImpact analysis guidance: {ai_settings['impact_prompt']}")
    
    return "\n".join(prompt_parts)


# Example usage in an AI router:
# ai_settings = await get_user_ai_settings(current_user.id, db)
# system_prompt = build_system_prompt_with_settings(
#     base_prompt="You are an engineering assistant...",
#     ai_settings=ai_settings,
#     prompt_type="relationship"
# )
