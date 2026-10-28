from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    student_id_context: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    grounded_in_db: bool
    context_sources: List[str] = []
    tokens_used: Optional[int] = None
    model: str
