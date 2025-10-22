from fastapi import APIRouter, Request, Query, UploadFile

from bisheng.common.schemas.api import resp_200
from bisheng.llm.domain import LLMService

router = APIRouter(prefix='/llm', tags=['OpenAPI', 'llm'])


@router.post('/workbench/asr')
async def invoke_workbench_asr(request: Request, file: UploadFile = None):
    """ 调用工作台的asr模型 将语音转为文字 """
    text = await LLMService.invoke_workbench_asr(file)
    return resp_200(data=text)


@router.get('/workbench/tts')
async def invoke_workbench_tts(request: Request, text: str = Query(..., description="需要合成的文本")):
    """ 调用工作台的tts模型 将文字转为语音 """
    audio_url = await LLMService.invoke_workbench_tts(text)
    return resp_200(data=audio_url)
