from fastapi import APIRouter, HTTPException
from app.models.conversation import ConversationCreate, ConversationResponse
from app import db

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=201)
async def create(body: ConversationCreate):
    result = db.insert_conversation(
        platform=body.platform,
        messages=[m.model_dump() for m in body.messages],
        title=body.title,
    )
    return result


@router.get("", response_model=list[ConversationResponse])
async def list_all(limit: int = 50, offset: int = 0):
    return db.list_conversations(limit=limit, offset=offset)


@router.get("/{conv_id}", response_model=ConversationResponse)
async def get_one(conv_id: str):
    conv = db.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/{conv_id}", status_code=204)
async def delete(conv_id: str):
    deleted = db.delete_conversation(conv_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
