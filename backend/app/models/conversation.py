from pydantic import BaseModel, field_validator
from typing import Optional


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    timestamp: Optional[str] = None

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in ("user", "assistant", "system"):
            raise ValueError("role must be user, assistant, or system")
        return v


class ConversationCreate(BaseModel):
    platform: str
    messages: list[Message]
    title: str = ""

    @field_validator("messages")
    @classmethod
    def messages_not_empty(cls, v: list[Message]) -> list[Message]:
        if len(v) == 0:
            raise ValueError("messages must not be empty")
        return v


class ConversationResponse(BaseModel):
    id: str
    platform: str
    title: str
    messages: list[Message]
    created_at: str
