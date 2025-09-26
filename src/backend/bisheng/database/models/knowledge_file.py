import json
from datetime import datetime
from enum import Enum
from typing import List, Optional

# if TYPE_CHECKING:
from pydantic import field_validator
from sqlalchemy import JSON, Column, DateTime, String, or_, text, Text
from sqlmodel import Field, delete, func, select, update, col

from bisheng.core.database import get_async_db_session, get_sync_db_session
from bisheng.database.models.base import SQLModelSerializable


class KnowledgeFileStatus(Enum):
    PROCESSING = 1  # 处理中
    SUCCESS = 2  # 成功
    FAILED = 3  # 解析失败
    REBUILDING = 4  # 重建中


class QAStatus(Enum):
    DISABLED = 0  # 用户手动关闭QA
    ENABLED = 1  # 启用成功
    PROCESSING = 2  # 处理中
    FAILED = 3  # QA插入向量库失败


class ParseType(Enum):
    LOCAL = 'local'  # 本地模式解析
    UNS = 'uns'  # uns服务解析，全部转为pdf文件

    # 1.3.0之后的枚举，之前的属于就版本解析的文件
    ETL4LM = 'etl4lm'  # etl4lm服务解析，包含pdf的版式分析
    UN_ETL4LM = 'un_etl4lm'  # 非etl4lm服务解析，没有bbox内容，只有源文件和md文件


class KnowledgeFileBase(SQLModelSerializable):
    user_id: Optional[int] = Field(default=None, index=True)
    knowledge_id: int = Field(index=True)
    file_name: str = Field(max_length=200, index=True)
    file_size: Optional[int] = Field(default=None, index=False, description='文件大小，单位为bytes')
    md5: Optional[str] = Field(default=None, index=False)
    parse_type: Optional[str] = Field(default=ParseType.LOCAL.value,
                                      index=False,
                                      description='采用什么模式解析的文件')
    split_rule: Optional[str] = Field(default=None, sa_column=Column(Text), description='采用什么模式解析的文件')
    bbox_object_name: Optional[str] = Field(default='', description='bbox文件在minio存储的对象名称')
    status: Optional[int] = Field(default=KnowledgeFileStatus.PROCESSING.value,
                                  index=False,
                                  description='1: 解析中；2: 解析成功；3: 解析失败')
    object_name: Optional[str] = Field(default=None, index=False, description='文件在minio存储的对象名称')
    extra_meta: Optional[str] = Field(default=None, index=False)
    remark: Optional[str] = Field(default='', sa_column=Column(String(length=512)))
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP')))


class QAKnowledgeBase(SQLModelSerializable):
    user_id: Optional[int] = Field(default=None, index=True)
    knowledge_id: int = Field(index=True)
    questions: List[str] = Field(index=False)
    answers: str = Field(index=False)
    source: Optional[int] = Field(default=0, index=False, description='0: 未知 1: 手动；2: 审计, 3: api, 4: 批量导入')
    status: Optional[int] = Field(default=1, index=False,
                                  description='1: 开启；0: 关闭，用户手动关闭；2: 处理中；3：插入失败')
    extra_meta: Optional[str] = Field(default=None, index=False)
    remark: Optional[str] = Field(default=None, sa_column=Column(String(length=512)))
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP')))

    @field_validator('questions')
    @classmethod
    def validate_json(cls, v):
        # dict_keys(['description', 'name', 'id', 'data'])
        if not v:
            return v
        if not isinstance(v, List):
            raise ValueError('question must be a valid JSON')

        return v

    @field_validator('answers')
    @classmethod
    def validate_answer(cls, v):
        # dict_keys(['description', 'name', 'id', 'data'])
        if not v:
            return v
        if isinstance(v, List):
            return json.dumps(v, ensure_ascii=False)

        return v


class KnowledgeFile(KnowledgeFileBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class QAKnowledge(QAKnowledgeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    questions: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    answers: Optional[str] = Field(default=None, sa_column=Column(Text))


class KnowledgeFileRead(KnowledgeFileBase):
    id: int


class KnowledgeFileCreate(KnowledgeFileBase):
    pass


class QAKnowledgeUpsert(QAKnowledgeBase):
    """支持修改"""
    id: Optional[int] = None
    answers: Optional[List[str] | str] = None


class KnowledgeFileDao(KnowledgeFileBase):

    @classmethod
    async def query_by_id(cls, file_id: int) -> Optional[KnowledgeFile]:
        async with get_async_db_session() as session:
            result = await session.execute(select(KnowledgeFile).where(KnowledgeFile.id == file_id))
            return result.scalars().first()

    @classmethod
    def get_file_simple_by_knowledge_id(cls, knowledge_id: int, page: int, page_size: int):
        offset = (page - 1) * page_size
        with get_sync_db_session() as session:
            return session.query(KnowledgeFile.id, KnowledgeFile.object_name).filter(
                KnowledgeFile.knowledge_id == knowledge_id).order_by(
                KnowledgeFile.id.asc()).offset(offset).limit(page_size).all()

    @classmethod
    def count_file_by_knowledge_id(cls, knowledge_id: int):
        with get_sync_db_session() as session:
            return session.query(func.count(
                KnowledgeFile.id)).filter(KnowledgeFile.knowledge_id == knowledge_id).scalar()

    @classmethod
    def delete_batch(cls, file_ids: List[int]) -> bool:
        with get_sync_db_session() as session:
            session.exec(delete(KnowledgeFile).where(KnowledgeFile.id.in_(file_ids)))
            session.commit()
            return True

    @classmethod
    def add_file(cls, knowledge_file: KnowledgeFile) -> KnowledgeFile:
        with get_sync_db_session() as session:
            session.add(knowledge_file)
            session.commit()
            session.refresh(knowledge_file)
        return knowledge_file

    @classmethod
    def update(cls, knowledge_file):
        with get_sync_db_session() as session:
            session.add(knowledge_file)
            session.commit()
            session.refresh(knowledge_file)
        return knowledge_file

    @classmethod
    async def async_update(cls, knowledge_file):
        async with get_async_db_session() as session:
            session.add(knowledge_file)
            await session.commit()
            await session.refresh(knowledge_file)
        return knowledge_file

    @classmethod
    def update_file_status(cls, file_ids: list[int], status: KnowledgeFileStatus, reason: str = None):
        """ 批量更新文件状态 """
        statement = update(KnowledgeFile).where(KnowledgeFile.id.in_(file_ids)).values(status=status.value,
                                                                                       remark=reason)
        with get_sync_db_session() as session:
            session.exec(statement)
            session.commit()

    @classmethod
    def get_file_by_condition(cls, knowledge_id: int, md5_: str = None, file_name: str = None):
        with get_sync_db_session() as session:
            sql = select(KnowledgeFile).where(KnowledgeFile.knowledge_id == knowledge_id)
            if md5_:
                sql = sql.where(KnowledgeFile.md5 == md5_)
            if file_name:
                sql = sql.where(KnowledgeFile.file_name == file_name)
            return session.exec(sql).all()

    @classmethod
    def select_list(cls, file_ids: List[int]):
        if not file_ids:
            return []
        with get_sync_db_session() as session:
            knowledge_files = session.exec(
                select(KnowledgeFile).where(KnowledgeFile.id.in_(file_ids))).all()
        if not knowledge_files:
            raise ValueError('文件ID不存在')
        return knowledge_files

    @classmethod
    def get_file_by_ids(cls, file_ids: List[int]):
        if not file_ids:
            return []
        with get_sync_db_session() as session:
            return session.exec(select(KnowledgeFile).where(KnowledgeFile.id.in_(file_ids))).all()

    @classmethod
    def get_file_by_filters(cls,
                            knowledge_id: int,
                            file_name: str = None,
                            status: List[int] = None,
                            page: int = 0,
                            page_size: int = 0,
                            file_ids: List[int] = None) -> List[KnowledgeFile]:
        statement = select(KnowledgeFile).where(KnowledgeFile.knowledge_id == knowledge_id)
        if file_name:
            statement = statement.where(KnowledgeFile.file_name.like(f'%{file_name}%'))
        if status:
            statement = statement.where(KnowledgeFile.status.in_(status))
        if file_ids:
            statement = statement.where(KnowledgeFile.id.in_(file_ids))
        if page and page_size:
            statement = statement.offset((page - 1) * page_size).limit(page_size)
        statement = statement.order_by(KnowledgeFile.update_time.desc())
        with get_sync_db_session() as session:
            return session.exec(statement).all()

    @classmethod
    def get_files_by_multiple_status(cls, knowledge_id: int, status_list: List[int]) -> List[KnowledgeFile]:
        """
        根据知识库ID和状态列表查询文件
        
        Args:
            knowledge_id: 知识库ID
            status_list: 状态值列表
            
        Returns:
            List[KnowledgeFile]: 匹配的文件列表
        """
        statement = select(KnowledgeFile).where(
            KnowledgeFile.knowledge_id == knowledge_id,
            KnowledgeFile.status.in_(status_list)
        )

        with get_sync_db_session() as session:
            return session.exec(statement).all()

    @classmethod
    def count_file_by_filters(cls,
                              knowledge_id: int,
                              file_name: str = None,
                              status: List[int] = None,
                              file_ids: List[int] = None) -> int:
        statement = select(func.count(
            KnowledgeFile.id)).where(KnowledgeFile.knowledge_id == knowledge_id)
        if file_name:
            statement = statement.where(KnowledgeFile.file_name.like(f'%{file_name}%'))
        if status:
            statement = statement.where(KnowledgeFile.status.in_(status))
        if file_ids:
            statement = statement.where(KnowledgeFile.id.in_(file_ids))
        with get_sync_db_session() as session:
            return session.scalar(statement)

    @classmethod
    async def async_count_file_by_filters(cls,
                                          knowledge_id: int,
                                          file_name: str = None,
                                          status: List[int] = None,
                                          file_ids: List[int] = None) -> int:
        statement = select(func.count(
            KnowledgeFile.id)).where(KnowledgeFile.knowledge_id == knowledge_id)
        if file_name:
            statement = statement.where(KnowledgeFile.file_name.like(f'%{file_name}%'))
        if status:
            statement = statement.where(KnowledgeFile.status.in_(status))
        if file_ids:
            statement = statement.where(KnowledgeFile.id.in_(file_ids))
        async with get_async_db_session() as session:
            result = await session.execute(statement)
            return result.scalar_one()

    @classmethod
    def get_knowledge_ids_by_name(cls, file_name: str) -> List[int]:
        statement = select(KnowledgeFile.knowledge_id).where(KnowledgeFile.file_name.like(f'%{file_name}%')).group_by(
            KnowledgeFile.knowledge_id)
        with get_sync_db_session() as session:
            return session.exec(statement).all()

    @classmethod
    def update_status_bulk(cls, file_ids: List[int], status: KnowledgeFileStatus, remark: str = "") -> None:
        """
        批量更新文件状态

        Args:
            file_ids: 文件ID列表
            status: 新的状态值

        Returns:
            None
        """
        if not file_ids:
            return

        statement = (
            update(KnowledgeFile)
            .where(col(KnowledgeFile.id).in_(file_ids))
        )

        statement = statement.values(status=status.value)

        if remark:
            statement = statement.values(remark=remark)

        with get_sync_db_session() as session:
            session.exec(statement)
            session.commit()


class QAKnoweldgeDao(QAKnowledgeBase):

    @classmethod
    def get_qa_knowledge_by_knowledge_id(cls, knowledge_id: int, page: int, page_size: int):
        offset = (page - 1) * page_size
        state = select(QAKnowledge).where(
            QAKnowledge.knowledge_id == knowledge_id, ).offset(offset).limit(page_size)
        with get_sync_db_session() as session:
            return session.exec(state).all()

    @classmethod
    def get_qa_knowledge_by_knowledge_ids(cls, knowledge_ids: List[int]) -> List[QAKnowledge]:
        with get_sync_db_session() as session:
            return session.exec(
                select(QAKnowledge).where(QAKnowledge.knowledge_id.in_(knowledge_ids))).all()

    @classmethod
    def get_qa_knowledge_by_primary_id(cls, qa_id: int) -> QAKnowledge:
        with get_sync_db_session() as session:
            return session.exec(select(QAKnowledge).where(QAKnowledge.id == qa_id)).first()

    @classmethod
    def get_qa_knowledge_by_name(cls, question: List[str], knowledge_id: int, exclude_id: int = None) -> QAKnowledge:
        with get_sync_db_session() as session:
            group_filters = []
            for one in question:
                group_filters.append(func.json_contains(QAKnowledge.questions, json.dumps(one)))
            statement = select(QAKnowledge).where(
                or_(*group_filters)).where(QAKnowledge.knowledge_id == knowledge_id)
            if exclude_id:
                statement = statement.where(QAKnowledge.id != exclude_id)
            return session.exec(statement).first()

    @classmethod
    def update(cls, qa_knowledge: QAKnowledge):
        if qa_knowledge.id is None:
            raise ValueError('id不能为空')
        with get_sync_db_session() as session:
            session.add(qa_knowledge)
            session.commit()
            session.refresh(qa_knowledge)
        return qa_knowledge

    @classmethod
    def delete_batch(cls, qa_ids: List[int]) -> bool:
        with get_sync_db_session() as session:
            session.exec(delete(QAKnowledge).where(QAKnowledge.id.in_(qa_ids)))
            session.commit()
            return True

    @classmethod
    def select_list(cls, ids: List[int]) -> List[QAKnowledge]:
        with get_sync_db_session() as session:
            QAKnowledges = session.exec(select(QAKnowledge).where(QAKnowledge.id.in_(ids))).all()
        if not QAKnowledges:
            raise ValueError('知识库不存在')
        return QAKnowledges

    @classmethod
    def insert_qa(cls, qa_knowledge: QAKnowledgeUpsert):
        with get_sync_db_session() as session:
            qa = QAKnowledge.model_validate(qa_knowledge)
            session.add(qa)
            session.commit()
            session.refresh(qa)
        return qa

    @classmethod
    def batch_insert_qa(cls, qa_knowledges: List[QAKnowledgeUpsert]) -> List[QAKnowledge]:
        with get_sync_db_session() as session:
            qas = []
            for qa_knowledge in qa_knowledges:
                qa = QAKnowledge.model_validate(qa_knowledge)
                qas.append(qa)
            session.add_all(qas)
            session.commit()
            for qa in qas:
                session.refresh(qa)
            return qas

    @classmethod
    def total_count(cls, sql):
        with get_sync_db_session() as session:
            return session.scalar(sql)

    @classmethod
    def query_by_condition(cls, sql):
        with get_sync_db_session() as session:
            return session.exec(sql).all()

    @classmethod
    def query_by_condition_v1(cls, source: List[int], create_start: str, create_end: str):
        with get_sync_db_session() as session:
            sql = select(QAKnowledge).where(QAKnowledge.source.in_(source)).where(
                QAKnowledge.create_time.between(create_start, create_end))

            return session.exec(sql).all()
