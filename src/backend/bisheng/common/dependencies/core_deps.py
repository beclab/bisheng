from typing import Generator, Any, AsyncGenerator

from sqlmodel.ext.asyncio.session import AsyncSession, Session


# db session
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话"""
    from bisheng.core.database import get_database_connection
    db_manager = await get_database_connection()
    async with db_manager.async_session() as session:
        yield session


# sync db session
def get_sync_db_session() -> Generator[Session, None, None]:
    """获取同步数据库会话"""
    from bisheng.core.database.manager import sync_get_database_connection

    db_manager = sync_get_database_connection()
    with db_manager.create_session() as session:
        yield session
