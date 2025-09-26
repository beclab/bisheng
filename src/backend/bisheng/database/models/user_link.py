from typing import Optional
from datetime import datetime
from sqlmodel import Field, Column, DateTime, select
from bisheng.database.models.base import SQLModelSerializable
from sqlalchemy import text, and_, delete
from sqlalchemy.exc import IntegrityError
from typing import List
from bisheng.core.database import get_sync_db_session


class UserLinkBase(SQLModelSerializable):
    user_id: int = Field(index=True)
    type: str = Field(index=True,max_length=32)
    type_detail: str = Field(index=True,max_length=255, description='type相关信息')
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, index=True, server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP')))
    

class UserLink(UserLinkBase, table=True):
    __tablename__ = 'user_link'
    id: Optional[int] = Field(default=None, primary_key=True)


class UserLinkDao(UserLinkBase):
    @classmethod
    def get_user_link(cls, user_id: int, types: list) -> List[UserLink]:
        with get_sync_db_session() as session:
            statement = select(UserLink).where(and_(UserLink.user_id == user_id, UserLink.type.in_(types)))
            statement = statement.order_by(UserLink.create_time.desc())  # 按创建时间降序排序，新添加的排在前面
            return session.exec(statement).all()
    
    @classmethod
    def add_user_link(cls, user_id: int, type: str, type_detail: str) -> tuple[UserLink, bool]:
        """
        添加用户链接
        
        Returns:
            tuple[UserLink, bool]: (用户链接对象, 是否为新添加)
        """
        with get_sync_db_session() as session:
            try:
                # 直接尝试插入，利用数据库唯一约束
                user_link = UserLink(user_id=user_id, type=type, type_detail=type_detail, create_time=datetime.now(), update_time=datetime.now())
                session.add(user_link)
                session.commit()
                return user_link, True  # 新添加
            except IntegrityError:
                # 如果违反唯一约束，回滚并查询现有记录
                session.rollback()
                existing = session.exec(
                    select(UserLink).where(
                        and_(
                            UserLink.user_id == user_id,
                            UserLink.type == type,
                            UserLink.type_detail == type_detail
                        )
                    )
                ).first()
                return existing, False  # 已存在

    @classmethod
    def delete_user_link(cls, user_id: int, type: str, type_detail: str) -> None:
        with get_sync_db_session() as session:
            statement = delete(UserLink).where(and_(UserLink.user_id == user_id, UserLink.type == type, UserLink.type_detail == type_detail))
            session.exec(statement)
            session.commit()
        return True
