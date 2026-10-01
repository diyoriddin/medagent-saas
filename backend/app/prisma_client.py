"""
Prisma Client Singleton for MedAgent SaaS
Provides a single Prisma client instance across the application
"""
from prisma import Prisma
from typing import Optional

_prisma_client: Optional[Prisma] = None


async def get_prisma() -> Prisma:
    """Get or create Prisma client instance"""
    global _prisma_client
    if _prisma_client is None:
        _prisma_client = Prisma()
        await _prisma_client.connect()
    elif not _prisma_client.is_connected():
        await _prisma_client.connect()
    return _prisma_client


async def close_prisma():
    """Close Prisma client connection"""
    global _prisma_client
    if _prisma_client and _prisma_client.is_connected():
        await _prisma_client.disconnect()
        _prisma_client = None