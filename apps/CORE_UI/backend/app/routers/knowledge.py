"""
Knowledge API router - knowledge base search
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List
import random

from app.models import KnowledgeCard, ArtifactRef, ArtifactType

router = APIRouter(tags=["knowledge"])


@router.get("/knowledge", response_model=List[KnowledgeCard])
async def search_knowledge(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """Search knowledge base"""
    try:
        # Generate mock knowledge cards based on search query
        knowledge_cards = []
        
        # Mock knowledge base entries
        knowledge_topics = [
            {
                "title": "Systems Engineering Best Practices",
                "summary": "Comprehensive guide to systems engineering methodologies and practices.",
                "content": "Systems engineering is an interdisciplinary field that focuses on designing and managing complex systems...",
                "source": "IEEE Standards",
                "tags": ["systems", "engineering", "methodology", "standards"]
            },
            {
                "title": "Requirements Traceability Matrix",
                "summary": "How to maintain traceability between requirements, design, and verification.",
                "content": "Requirements traceability ensures that each requirement is addressed through design and verified through testing...",
                "source": "Internal Wiki",
                "tags": ["requirements", "traceability", "verification", "testing"]
            },
            {
                "title": "Change Management Process",
                "summary": "Engineering change control and approval workflows.",
                "content": "Engineering change notices (ECNs) must follow established approval workflows to ensure proper impact assessment...",
                "source": "Process Documentation",
                "tags": ["change", "process", "approval", "ECN"]
            },
            {
                "title": "Test Planning and Execution",
                "summary": "Guidelines for effective test planning and execution strategies.",
                "content": "Effective test planning begins with understanding requirements and identifying appropriate verification methods...",
                "source": "Test Guidelines",
                "tags": ["testing", "verification", "planning", "execution"]
            },
            {
                "title": "Integration Testing Strategies",
                "summary": "Approaches to integration testing in complex systems.",
                "content": "Integration testing validates that components work together as intended...",
                "source": "Technical Manual",
                "tags": ["integration", "testing", "components", "validation"]
            }
        ]
        
        # Filter by relevance to search query
        relevant_topics = []
        query_lower = q.lower()
        
        for topic in knowledge_topics:
            relevance_score = 0.0
            
            # Check title relevance
            if query_lower in topic["title"].lower():
                relevance_score += 0.4
            
            # Check summary relevance
            if query_lower in topic["summary"].lower():
                relevance_score += 0.3
            
            # Check content relevance
            if query_lower in topic["content"].lower():
                relevance_score += 0.2
            
            # Check tag relevance
            for tag in topic["tags"]:
                if query_lower in tag.lower():
                    relevance_score += 0.1
            
            if relevance_score > 0:
                relevant_topics.append((topic, relevance_score))
        
        # Sort by relevance and limit results
        relevant_topics.sort(key=lambda x: x[1], reverse=True)
        relevant_topics = relevant_topics[:limit]
        
        # Convert to KnowledgeCard objects
        for i, (topic, score) in enumerate(relevant_topics):
            # Generate some related artifacts
            artifact_refs = []
            for j in range(random.randint(1, 3)):
                artifact_refs.append(ArtifactRef(
                    id=f"JAMA-REQ-{random.randint(1, 100):03d}",
                    type=ArtifactType.REQUIREMENT,
                    source="jama",
                    title=f"Related Requirement {j+1}",
                    status="approved"
                ))
            
            card = KnowledgeCard(
                id=f"KB-{i+1:03d}",
                title=topic["title"],
                summary=topic["summary"],
                content=topic["content"],
                source=topic["source"],
                tags=topic["tags"],
                relevance_score=score,
                artifact_refs=artifact_refs
            )
            knowledge_cards.append(card)
        
        return knowledge_cards
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge search error: {str(e)}")
