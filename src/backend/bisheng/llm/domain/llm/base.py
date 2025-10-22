from typing import Optional

from pydantic import BaseModel, Field, ConfigDict
from typing_extensions import Self

from ...models import LLMModel, LLMServer, LLMDao


class BishengBase(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, validate_by_name=True, validate_by_alias=True)

    model_id: int = Field(description="后端服务保存的model唯一ID")

    # bisheng强相关的业务参数
    model_info: Optional[LLMModel] = Field(default=None, description="模型配置信息")
    server_info: Optional[LLMServer] = Field(default=None, description="服务提供方信息")

    @classmethod
    async def get_class_instance(cls, **kwargs) -> Self:
        model_id: int | None = kwargs.pop('model_id', None)
        model_info, server_info = await cls.get_model_server_info(model_id)
        instance = cls(
            model_id=model_id,
            model_info=model_info,
            server_info=server_info,
        )
        instance._init_client(model_info, server_info, **kwargs)
        return instance

    @classmethod
    async def get_model_server_info(cls, model_id: int | None) -> tuple[LLMModel | None, LLMServer | None]:
        model_info = None
        server_info = None
        if not model_id:
            return model_info, server_info
        model_info = await LLMDao.aget_model_by_id(model_id)
        if model_info:
            server_info = await LLMDao.aget_server_by_id(model_info.server_id)
        return model_info, server_info

    @classmethod
    def get_model_server_info_sync(cls, model_id: int | None) -> tuple[LLMModel | None, LLMServer | None]:
        model_info = None
        server_info = None
        if not model_id:
            return model_info, server_info
        model_info = LLMDao.get_model_by_id(model_id)
        if model_info:
            server_info = LLMDao.get_server_by_id(model_info.server_id)
        return model_info, server_info

    async def update_model_status(self, status: int, remark: str = ''):
        """更新模型状态"""
        if self.model_info.status != status:
            self.model_info.status = status
            await LLMDao.aupdate_model_status(self.model_id, status, remark[-500:])  # 限制备注长度为500字符

    def sync_update_model_status(self, status: int, remark: str = ''):
        """更新模型状态"""
        if self.model_info.status != status:
            self.model_info.status = status
            LLMDao.update_model_status(self.model_id, status, remark[-500:])

    def get_server_info_config(self):
        if self.server_info and self.server_info.config:
            return self.server_info.config
        return {}

    def get_model_info_config(self):
        if self.model_info and self.model_info.config:
            return self.model_info.config
        return {}
