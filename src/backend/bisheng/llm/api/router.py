from fastapi import APIRouter, Request, Depends, Body, Query, BackgroundTasks, UploadFile, Response

from bisheng.api.services.user_service import UserPayload, get_login_user, get_admin_user
from bisheng.api.v1.schemas import resp_200, KnowledgeLLMConfig, \
    AssistantLLMConfig, EvaluationLLMConfig, LLMServerCreateReq, WorkbenchModelConfig, UnifiedResponseModel
from ..domain import LLMService

router = APIRouter(prefix='/llm', tags=['LLM'])


@router.get('')
def get_all_llm(request: Request, login_user: UserPayload = Depends(get_login_user)):
    ret = LLMService.get_all_llm(request, login_user)
    return resp_200(data=ret)


@router.post('')
async def add_llm_server(request: Request, login_user: UserPayload = Depends(get_admin_user),
                         server: LLMServerCreateReq = Body(..., description="服务提供方所有数据")):
    ret = await LLMService.add_llm_server(request, login_user, server)
    return resp_200(data=ret)


@router.delete('')
def delete_llm_server(request: Request, login_user: UserPayload = Depends(get_admin_user),
                      server_id: int = Body(..., embed=True, description="服务提供方唯一ID")):
    LLMService.delete_llm_server(request, login_user, server_id)
    return resp_200()


@router.put('')
async def update_llm_server(request: Request, login_user: UserPayload = Depends(get_admin_user),
                            server: LLMServerCreateReq = Body(..., description="服务提供方所有数据")):
    ret = await LLMService.update_llm_server(request, login_user, server)
    return resp_200(data=ret)


@router.get('/info')
async def get_one_llm(request: Request, login_user: UserPayload = Depends(get_admin_user),
                      server_id: int = Query(..., description="服务提供方唯一ID")):
    ret = await LLMService.get_one_llm(request, login_user, server_id)
    return resp_200(data=ret)


@router.post('/online')
def update_model_online(request: Request, login_user: UserPayload = Depends(get_admin_user),
                        model_id: int = Body(..., embed=True, description="模型的唯一ID"),
                        online: bool = Body(..., embed=True, description="是否上线")):
    ret = LLMService.update_model_online(request, login_user, model_id, online)
    return resp_200(data=ret)


@router.get('/workbench', summary="获取工作台相关的模型配置", response_model=UnifiedResponseModel)
async def get_workbench_llm(request: Request, login_user: UserPayload = Depends(get_admin_user)):
    """ 获取灵思相关的模型配置 """
    ret = await LLMService.get_workbench_llm()
    return resp_200(data=ret)


@router.post('/workbench', summary="更新工作台相关的模型配置", response_model=UnifiedResponseModel)
async def update_workbench_llm(
        background_tasks: BackgroundTasks,
        login_user: UserPayload = Depends(get_admin_user),
        config_obj: WorkbenchModelConfig = Body(..., description="模型配置对象")):
    """ 更新灵思相关的模型配置 """
    ret = await LLMService.update_workbench_llm(config_obj, background_tasks)
    return resp_200(data=ret)


@router.post('/workbench/asr')
async def invoke_workbench_asr(request: Request, login_user: UserPayload = Depends(get_login_user),
                               file: UploadFile = None):
    """ 调用工作台的asr模型 将语音转为文字 """
    text = await LLMService.invoke_workbench_asr(file)
    return resp_200(data=text)


@router.get('/workbench/tts')
async def invoke_workbench_tts(request: Request, login_user: UserPayload = Depends(get_login_user),
                               text: str = Query(..., description="需要合成的文本")):
    """ 调用工作台的tts模型 将文字转为语音 """
    audio_bytes = await LLMService.invoke_workbench_tts(text)
    return Response(content=audio_bytes, media_type='audio/mp3')


@router.get('/knowledge')
def get_knowledge_llm(request: Request, login_user: UserPayload = Depends(get_login_user)):
    ret = LLMService.get_knowledge_llm()
    return resp_200(data=ret)


@router.post('/knowledge')
def update_knowledge_llm(request: Request, login_user: UserPayload = Depends(get_admin_user),
                         data: KnowledgeLLMConfig = Body(..., description="知识库默认模型配置")):
    """ 更新知识库相关的默认模型配置 """
    ret = LLMService.update_knowledge_llm(request, login_user, data)
    return resp_200(data=ret)


@router.get('/assistant')
def get_assistant_llm(request: Request, login_user: UserPayload = Depends(get_login_user)):
    """ 获取助手相关的模型配置 """
    ret = LLMService.get_assistant_llm()
    return resp_200(data=ret)


@router.post('/assistant')
def update_assistant_llm(request: Request, login_user: UserPayload = Depends(get_admin_user),
                         data: AssistantLLMConfig = Body(..., description="助手默认模型配置")):
    """ 更新助手相关的模型配置 """
    ret = LLMService.update_assistant_llm(request, login_user, data)
    return resp_200(data=ret)


@router.get('/evaluation')
def get_evaluation_llm(request: Request, login_user: UserPayload = Depends(get_login_user)):
    """ 获取评价相关的模型配置 """
    ret = LLMService.get_evaluation_llm()
    return resp_200(data=ret)


@router.post('/evaluation')
def update_evaluation_llm(request: Request, login_user: UserPayload = Depends(get_admin_user),
                          data: EvaluationLLMConfig = Body(..., description="评价默认模型配置")):
    """ 更新评价相关的模型配置 """
    ret = LLMService.update_evaluation_llm(request, login_user, data)
    return resp_200(data=ret)


@router.get('/workflow')
def get_workflow_llm(request: Request, login_user: UserPayload = Depends(get_login_user)):
    """ 获取评价相关的模型配置 """
    ret = LLMService.get_workflow_llm()
    return resp_200(data=ret)


@router.post('/workflow')
def update_workflow_llm(request: Request, login_user: UserPayload = Depends(get_admin_user),
                        data: EvaluationLLMConfig = Body(..., description="工作流默认模型配置")):
    """ 更新评价相关的模型配置 """
    ret = LLMService.update_workflow_llm(request, login_user, data)
    return resp_200(data=ret)


@router.get('/assistant/llm_list')
async def get_assistant_llm_list(request: Request, login_user: UserPayload = Depends(get_login_user)):
    """ 获取助手可选的模型列表 """
    ret = LLMService.get_assistant_llm_list(request, login_user)
    return resp_200(data=ret)
