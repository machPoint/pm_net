# filters.py
# This file should be included in the OPAL base image. It contains generic filter logic for all OPAL instances.
# DO NOT add any user-specific logic or configs here.

def run_filters(payload, filters):
    """
    Evaluates a payload (article/item) against a list of filters.
    Returns True if any filter matches, else False.
    Filters are dicts with at least 'type' and 'value'.
    """
    for f in filters:
        if f["type"] == "regex":
            # Case-insensitive substring match in 'title' or 'content'
            value = f["value"].lower()
            if value in payload.get("title", "").lower() or value in payload.get("content", "").lower():
                return True
        elif f["type"] == "semantic":
            # Stub for future LLM-based filtering
            if llm_filter_check(payload, f["value"]):
                return True
    return False

def llm_filter_check(payload, instruction):
    """
    Stub for semantic (LLM) filtering. Always returns False in MVP.
    """
    # This should be replaced with a call to an LLM or external model in the future.
    return False
