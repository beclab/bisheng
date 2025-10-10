import DownIcon from '@/components/bs-icons/DownIcon';
import { Button } from '@/components/bs-ui/button';
import { Textarea } from '@/components/bs-ui/input';
import { useToast } from '@/components/bs-ui/toast/use-toast';
import MessageMarkDown from '@/pages/BuildPage/flow/FlowChat/MessageMarkDown';
import axios from 'axios';
import {
    ArrowRight,
    BookOpen,
    Check, ChevronDown,
    Download,
    FileText,
    LucideLoaderCircle, MessageSquareText, Pause,
    Search,
    SendIcon,
    Sparkles,
    WrenchIcon,
    Loader2,
    CheckCircle,
    CircleX
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FileDrawer from './FileDrawer';
import FileIcon from './FileIcon';
import FilePreviewDrawer from './FilePreviewDrawer';
import { SearchKnowledgeSheet } from './SearchKnowledgeSheet';
import { WebSearchSheet } from './WebSearchSheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/bs-ui/tooltip';

const ToolButtonLink = ({ params, setCurrentDirectFile }) => {
    if (!params) return null
    return <Button
        variant="link"
        className='text-xs p-0 h-4 text-blue-400 underline underline-offset-2'
        onClick={() => setCurrentDirectFile(params.file_info)}
    >{params.file_info?.file_name}</Button>
}

const Tool = ({ data, setCurrentDirectFile, onSearchKnowledge, onWebSearch }) => {
    const { name, step_type, params, extra_info, output } = data;
    const { t: localize } = useTranslation();
    const { toast } = useToast();

    // 过滤尾部hash值
    const toolName = useMemo(() => {
        const lastUnderscoreIndex = name.lastIndexOf('_');
        if (lastUnderscoreIndex === -1) return name;

        const afterLastUnderscore = name.slice(lastUnderscoreIndex + 1);

        const isHash = afterLastUnderscore.length >= 8 &&
            /^[a-z0-9]+$/.test(afterLastUnderscore) &&
            !/^\d+$/.test(afterLastUnderscore);

        return isHash ? name.slice(0, lastUnderscoreIndex) : name;
    }, [name])

    // 工具名称映射
    const nameMap = {
        web_search: localize('com_sop_web_search'),
        search_knowledge_base: localize('com_sop_search_knowledge_base'),
        list_files: localize('com_sop_list_files'),
        get_file_details: localize('com_sop_get_file_details'),
        search_files: localize('com_sop_search_files'),
        read_text_file: localize('com_sop_read_text_file'),
        add_text_to_file: localize('com_sop_add_text_to_file'),
        replace_file_lines: localize('com_sop_replace_file_lines'),
        default: localize('com_sop_using_tool', { 0: toolName })
    };

    // search knowledge
    const handleKnowledgeClick = () => {
        if (!output || !output.length) return
        try {
            const upRes = JSON.parse(output)['结果']
            const resData = upRes.map(res => {
                let titleRegex, contentRegex;
                if (res.startsWith('{')) {
                    titleRegex = /<file_title>(.*?)<\/file_title>/;
                    contentRegex = /<paragraph_content>(.*?)<\/paragraph_content>/s;
                } else {
                    // 兼容旧格式
                    titleRegex = /^(.*?)\\n/;
                    contentRegex = /\\n--------\\n(.*?)$/;
                }
                const titleMatch = res.match(titleRegex);
                const contentMatch = res.match(contentRegex);
                const title = titleMatch ? titleMatch[1] : '';

                return {
                    title,
                    suffix: title.split('.').pop().toLowerCase(),
                    content: contentMatch ? contentMatch[1] : ''
                };
            })
            onSearchKnowledge({
                query: params.query,
                data: resData
            })
        } catch (error) {
            console.log('knowledge parse error :>> ', error);
            toast({ description: output, variant: 'error' });
        }
    }

    const handleWebSearchClick = () => {
        if (!output || !output.length) return
        try {
            const res = JSON.parse(output)
            if (Array.isArray(res)) {
                onWebSearch({
                    query: params.query,
                    data: res.map(item => ({
                        ...item,
                        thumbnail: item.thumbnail || '',
                        host: item.url.replace(/^https?:\/\/([^\/]+).*$/, '$1'),
                        title: item.title,
                        content: item.snippet
                    }))
                })
            } else {
                const text = JSON.parse(output)['content'][0].text
                const resData = JSON.parse(text)
                onWebSearch({
                    query: params.query,
                    data: resData['搜索结果'].map(item => ({
                        thumbnail: item['缩略图'] || '',
                        host: item['链接'].replace(/^https?:\/\/([^\/]+).*$/, '$1'),
                        title: item['标题'],
                        content: item['摘要'],
                        url: item['链接'],
                    }))
                })
            }
        } catch (error) {
            console.log('websearch parse error :>> ', error);

            onWebSearch({
                query: params.query,
                data: [{
                    thumbnail: '',
                    host: '',
                    title: output.split(/[.!?，。,！？；：]/)[0] + '...',
                    content: output,
                    url: ''
                }]
            })
        }
    }

    // 参数键名映射
    const paramKeyMap = {
        web_search: () => <Button
            variant="link"
            className='text-xs p-0 h-4 text-blue-400 underline underline-offset-2'
            onClick={handleWebSearchClick}
        >{params.query}</Button>,
        search_knowledge_base: () => <Button
            variant="link"
            className='text-xs p-0 h-4 text-blue-400 underline underline-offset-2'
            onClick={handleKnowledgeClick}
        >{params.query}</Button>,
        list_files: () => params.directory_path,
        get_file_details: () => params.file_path.split('/').pop(),
        search_files: () => params.pattern,
        read_text_file: () => <ToolButtonLink params={extra_info} setCurrentDirectFile={setCurrentDirectFile} />,
        add_text_to_file: () => <ToolButtonLink params={extra_info} setCurrentDirectFile={setCurrentDirectFile} />,
        replace_file_lines: () => <ToolButtonLink params={extra_info} setCurrentDirectFile={setCurrentDirectFile} />,
        web_content_to_markdown_llm: () => <a href={params.url} target='_blank'><Button
            variant="link"
            className='text-xs p-0 h-4 text-blue-400 underline underline-offset-2'
        >{params.url}</Button></a>,
        default: () => '',
    };

    // 图标映射 - 使用组件形式
    const iconMap = {
        web_search: Search,
        search_knowledge_base: BookOpen,
        list_files: FileText,
        get_file_details: FileText,
        search_files: FileText,
        read_text_file: FileText,
        add_text_to_file: FileText,
        replace_file_lines: FileText,
        default: WrenchIcon
    };

    if (step_type !== 'tool_call') {
        return null
    }

    // 获取显示名称
    const displayName = nameMap[toolName] || nameMap.default;

    // 获取参数键名
    const paramValue = params && paramKeyMap[toolName] || paramKeyMap.default;

    // 获取图标
    const Icon = iconMap[toolName] || iconMap.default;

    return (
        <div className='inline-flex items-center gap-2 bg-[#F9FAFD] border rounded-full my-1.5 mb-4 px-3 py-1.5 text-muted-foreground'>
            <Icon size={16} />
            <div className='flex gap-4 items-center'>
                <span className='text-xs text-gray-600 truncate'>{displayName}</span>
                <span className='text-xs text-[#82868C] truncate max-w-72'>{paramValue()}</span>
            </div>
        </div>
    )
}

const Task = ({
    task,
    lvl1 = false,
    que,
    hasSubTask,
    sendInput,
    setCurrentDirectFile,
    onSearchKnowledge,
    onWebSearch,
    children = null
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const { t: localize } = useTranslation();

    // 根据状态选择对应的图标
    const renderStatusIcon = () => {
        const status = (task.children?.some(child => child.status === 'user_input') && 'user_input') || task.status;
        switch (status) {
            case "failed":
            case "user_input":
            case "terminated":
                return <Pause size={18} className='min-w-4 p-0.5 rounded-full mr-2' />;
            // case "user_input":
            // case "user_input_completed":
            // case "in_progress":
            //     return <Hourglass size={16} className='min-w-4 [#BAC1CD] p-0.5 rounded-full text-white mr-2 animate-pulse' />;
            case "success":
                return <Check size={16} className='min-w-4 bg-[#BAC1CD] p-0.5 rounded-full text-white mr-2' />;
            default:
                return <LucideLoaderCircle size={16} className='min-w-4 text-primary mr-2 animate-spin' />;
        }
    };

    // 处理发送输入
    const handleSendInput = () => {
        if (inputValue.trim()) {
            sendInput({
                task_id: task.id,
                user_input: inputValue
            });
            setInputValue(''); // 清空输入框
        }
    };

    // 处理回车键发送
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendInput();
        }
    };

    useEffect(() => {
        if (task.event_type === "user_input") {
            console.log('ding :>> ', task.event_type, task);
        }
    }, [task.status])

    const history = useMemo(() => {
        const result: any = [];
        const startMap = new Map(); // 存储未匹配的 start 消息: call_id -> message
        for (const msg of task.history || []) {
            if (msg.status === 'start') {
                // 存储或覆盖同 call_id 的 start
                startMap.set(msg.call_id, msg);
            } else if (msg.status === 'end') {
                // 检查是否有匹配的 start
                if (startMap.has(msg.call_id)) {
                    // 移除对应的 start
                    startMap.delete(msg.call_id);
                }
                // 总是添加 end 消息
                msg.call_reason && result.push(msg);
            }
        }

        // 添加所有未匹配的 start 消息
        for (const startMsg of startMap.values()) {
            startMsg.call_reason && result.push(startMsg);
        }

        return result;
    }, [task.history])


    // 未开始执行的任务不展示
    if (task.status === 'not_started') {
        return null;
    }

    return (
        <div className={`${lvl1 ? '' : 'pl-6'}`}>
            <div className={`flex items-start relative`}>
                <div className={`absolute right-full flex gap-2 pr-2 items-center top-0 h-6`}>
                    {/* 折叠 */}
                    {lvl1 ? (history.length > 0 || hasSubTask) && <DownIcon
                        className={`text-gray-500 mt-0.5 cursor-pointer size-3 transition-transform 
                                ${isExpanded ? 'rotate-180' : ''}
                            `}
                        onClick={() => setIsExpanded(!isExpanded)}
                    />
                        : history.length > 0 && <ChevronDown
                            size={18}
                            className={`text-gray-500 mt-0.5 cursor-pointer transition-transform 
                                ${isExpanded ? 'rotate-180' : ''} 
                            `}
                            onClick={() => setIsExpanded(!isExpanded)}
                        />
                    }
                </div>
                {lvl1 && <div className='mt-[5px]'>{renderStatusIcon()}</div>}
                {
                    lvl1 ? <h2 className="font-semibold mb-4 text-base">{que}.{task.task_data.display_target}</h2> :
                        <span className='text-sm mb-3'>{task.task_data.display_target}</span>
                }
            </div>

            {/* 历史记录部分 - 可折叠 */}
            {history?.length !== 0 && (
                <div className='mb-2'>
                    <div className='flex'>
                        {
                            isExpanded ? <div className={`${lvl1 ? 'pl-6' : 'pl-0'} w-full text-sm text-gray-400 leading-6 scroll-hover`}>
                                {history.map((_history, index) => (
                                    <div>
                                        <p key={index}>{_history.call_reason}</p>
                                        <Tool
                                            data={_history}
                                            setCurrentDirectFile={setCurrentDirectFile}
                                            onSearchKnowledge={onSearchKnowledge}
                                            onWebSearch={onWebSearch}
                                        />
                                    </div>
                                ))}
                            </div> : null
                        }
                    </div>
                </div>
            )}

            {/* 等待输入部分 */}
            {task.event_type === "user_input" && (
                <div className='bg-[#F3F4F6] border border-[#dfdede] rounded-2xl px-5 py-4 my-2 relative'>
                    <div>
                        <span className='bg-[#D5E3FF] p-1 px-2 text-xs text-primary rounded-md'>{localize('com_sop_waiting_input')}</span>
                        <span className='pl-3 text-sm'>{task.call_reason}</span>
                    </div>
                    <div>
                        <Textarea
                            id={task.id}
                            placeholder={localize('com_sop_please_input')}
                            className='border-none bg-transparent ![box-shadow:initial] pl-0 pr-10 pt-4 h-auto'
                            rows={1}
                            value={inputValue}
                            maxLength={10000}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button
                            className='absolute bottom-4 right-4 size-9 rounded-full p-0 bg-black hover:bg-black/80'
                            onClick={handleSendInput}
                            disabled={!inputValue.trim()}
                        >
                            <SendIcon size={24} />
                        </Button>
                    </div>
                </div>
            )}
            <div className={isExpanded ? 'block' : 'hidden'}>
                {children}
                {/* 任务总结 */}
                {lvl1 && task.status !== 'failed' && task.result.answer && <div className='bs-mkdown max-w-full relative mb-6 text-sm px-4 py-3 rounded-lg bg-[#F8F9FB] text-[#303133] leading-6 break-all'>
                    <MessageMarkDown message={task.result.answer} />
                    <div className='bg-gradient-to-t w-full h-10 from-[#F8F9FB] from-0% to-transparent to-100% absolute bottom-0'></div>
                </div>}
            </div>
        </div>
    );
};


export const TaskFlowContent = ({ linsight, showFeedBack = false }) => {
    const { status, sop, title, tasks, taskError, queueCount = 0 } = linsight
    console.log('linsight :>> ', linsight);
    const summary = linsight.output_result.answer;
    const files = linsight.output_result.final_files || []
    const allFiles = linsight?.output_result?.all_from_session_files || []

    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [currentPreviewFileId, setCurrentPreviewFileId] = useState<string>("")
    const [currentDirectFile, setCurrentDirectFile] = useState<any>(null)
    const { t: localize } = useTranslation();

    // knowledge search
    const [knowledgeInfo, setKnowledgeInfo] = useState(null)
    // web search
    const [webSearchInfo, setWebSearchInfo] = useState(null)
    // 由卡片触发抽屉展开
    const [triggerDrawerFromCard, setTriggerDrawerFromCard] = useState(false)
    // 文件导出提示
    const [exportState, setExportState] = useState<{ loading: boolean; success: boolean; error: boolean; title: string }>({ loading: false, success: false, error: false, title: 'PDF' })
    // useFoucsInput(tasks);

    const mergeFiles = useMemo(() => {
        const mergedFiles = [...files, ...allFiles];
        return mergedFiles;
    }, [files, allFiles]);

    const downloadFile = (file) => {
        const { file_name, file_url } = file;
        const url = `${__APP_ENV__.BASE_URL}${file_url}`;

        return axios.get(url, { responseType: "blob" }).then((res: any) => {
            let blob: any = null
            if (file_url.endsWith(".csv")) {
                // 添加 UTF-8 BOM（\uFEFF）
                const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
                blob = new Blob([bom, res.data], { type: "text/csv;charset=utf-8;" });
            } else {
                blob = new Blob([res.data]);
            }

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = file_name;
            link.click();
            URL.revokeObjectURL(link.href);
        }).catch(console.error);
    };

    const handleExportOther = (e, type: 'pdf' | 'docx') => {
        e.stopPropagation();
        setExportState({ loading: true, success: false, error: false, title: type.toUpperCase() })
        // TODO: 接后端导出接口后替换为真实请求
        setTimeout(() => {
            setExportState(prev => ({ ...prev, loading: false, success: true }))
        }, 1500)
        setTimeout(() => {
            setExportState(prev => ({ ...prev, success: false, error: true }))
        }, 3500)
        setTimeout(() => {
            setExportState(prev => ({ ...prev, error: false }))
        }, 5500)
    }

    if (queueCount) {
        const totalMinutes = queueCount * 8;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        let timeText;
        if (hours > 0) {
            timeText = `${hours} ${localize('com_sop_hours')} ${minutes} ${localize('com_sop_minutes')}`;
        } else {
            timeText = `${minutes} ${localize('com_sop_minutes')}`;
        }

        return (
            <div className='size-full flex flex-col items-center justify-center text-sm'>
                <img src={__APP_ENV__.BASE_URL + '/assets/queue.png'} alt="" />
                <p className='mt-9'>{localize('com_sop_queue_message')}</p>
                <p className='mt-4 font-bold'>{localize('com_sop_estimated_wait')} {timeText}</p>
            </div>
        );
    }

    return (
        <div className="w-[100%] mx-auto p-5 text-gray-800 leading-relaxed overflow-y-auto h-[calc(100vh-170px)] overflow-x-hidden">
            {/* {!tasks?.length && <PlaySop content={sop} />} */}
            {/* feedback */}
            {showFeedBack && <div className='border border-primary/30 rounded-md p-2 bg-white'>
                <div className='flex items-center gap-2'>
                    <Sparkles size={18} className=' text-primary/80' />
                    <span className='font-bold'>用户反馈</span>
                </div>
                <div className='max-h-24 overflow-y-auto no-scrollbar mt-2'>
                    {linsight?.execute_feedback || '暂无用户反馈'}
                </div>
            </div>}
            {/* 任务 */}
            {!!tasks?.length && <div className='pl-6'>
                <p className='text-sm text-gray-400 mt-6 mb-4'>{localize('com_sop_plan_task_path')}</p>
                {tasks.map((task, i) => (
                    <p key={task.id} className='leading-7'>{i + 1}. {task.task_data.target}</p>
                ))}
                <p className='text-sm text-gray-400 mt-6 mb-4'>{localize('com_sop_execute_tasks')}</p>
            </div>}
            {
                tasks?.map((task, i) => <Task
                    key={task.id}
                    que={i + 1}
                    lvl1
                    task={task}
                    hasSubTask={!!task.children?.length}
                    setCurrentDirectFile={(file) => {
                        setIsPreviewOpen(true);
                        setCurrentDirectFile(file)
                    }}
                    onSearchKnowledge={setKnowledgeInfo}
                    onWebSearch={setWebSearchInfo}
                    sendInput={() => { }} >
                    {
                        task.children?.map((_task, i) => <Task
                            key={_task.id}
                            que={i + 1}
                            task={_task}
                            sendInput={() => { }}
                            setCurrentDirectFile={(file) => {
                                setIsPreviewOpen(true);
                                setCurrentDirectFile(file)
                            }}
                            onSearchKnowledge={setKnowledgeInfo}
                            onWebSearch={setWebSearchInfo}
                        />)
                    }
                </Task>
                )
            }
            {/* error */}
            {/* {taskError && <ErrorDisplay title={localize('com_sop_task_execution_interrupted')} taskError={taskError} />} */}
            {/* 总结 */}
            {/* {
                summary && <div className='relative mb-6 text-sm px-4 py-3 rounded-lg bg-[#F8F9FB] text-[#303133] leading-6 break-all'>
                    <MessageMarkDown message={summary} />
                    <div className='bg-gradient-to-t w-full h-10 from-[#F8F9FB] from-0% to-transparent to-100% absolute bottom-0'></div>
                </div>
            } */}
            {/* 结果文件 */}
            {files &&
                <div>
                    {/* <p className='text-sm text-gray-500'></p> */}
                    <div className='mt-5 flex flex-wrap gap-3'>
                        {files?.map((file) => (
                            <div
                                key={file.file_id}
                                onClick={() => {
                                    if (file.file_name.split('.').pop() === 'html') {
                                        return window.open(`${__APP_ENV__.BASE_URL}/html?url=${encodeURIComponent(file.file_url)}`, '_blank')
                                    }
                                    setCurrentDirectFile(null);
                                    setCurrentPreviewFileId(file.file_id);
                                    setIsPreviewOpen(true);
                                    setTriggerDrawerFromCard(true);
                                }}
                                className='w-[calc(50%-6px)] p-2 rounded-2xl border border-[#ebeef2] cursor-pointer'
                            >
                                <div className='bg-[#F4F6FB] h-24 p-4 rounded-lg overflow-hidden'>
                                    <FileIcon type={file.file_name.split('.').pop().toLowerCase()} className='size-24 mx-auto opacity-20' />
                                </div>
                                <div className='relative flex pt-3 gap-2 items-center'>
                                    <FileIcon type={file.file_name.split('.').pop().toLowerCase()} className='size-4 min-w-4' />
                                    <span className='text-sm truncate pr-6'>{file.file_name}</span>
                                    <Button variant="ghost" className='absolute right-1 -bottom-1 w-6 h-6 p-0'>
                                        {String(file.file_name).toLowerCase().endsWith('.md') ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span onClick={(e) => e.stopPropagation()}>
                                                        <Download size={16} />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side='bottom' align='center' className='bg-white text-gray-800 border border-gray-200'>
                                                    <div className='flex flex-col gap-2'>
                                                        <div className='flex gap-2 items-center cursor-pointer hover:bg-gray-100 rounded-md p-1' onClick={(e) => { e.stopPropagation(); downloadFile(file); }}>
                                                            <FileIcon type={'md'} className='size-5' />
                                                            <div className='w-full flex gap-2 items-center'>Markdown</div>
                                                        </div>
                                                        <div className='flex gap-2 items-center rounded-md p-1 cursor-pointer hover:bg-gray-100' onClick={(e) => handleExportOther(e, 'pdf')}>
                                                            <FileIcon type={'pdf'} className='size-5' />
                                                            <div className='w-full flex gap-2 items-center'>PDF</div>
                                                        </div>
                                                        <div className='flex gap-2 items-center rounded-md p-1 cursor-pointer hover:bg-gray-100' onClick={(e) => handleExportOther(e, 'docx')}>
                                                            <FileIcon type={'docx'} className='size-5' />
                                                            <div className='w-full flex gap-2 items-center'>Docx</div>
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Download size={16} onClick={(e) => { e.stopPropagation(); downloadFile(file); }} />
                                            
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/*  预览所有文件列表 */}
                    {
                        allFiles.length > files.length && <div className='mt-2.5'>
                            <div
                                onClick={() => setIsDrawerOpen(true)}
                                className='w-[calc(50%-6px)] p-2 rounded-2xl border border-[#ebeef2] cursor-pointer'
                            >
                                <div className='bg-[#F4F6FB] h-24 p-6 rounded-lg overflow-hidden'>
                                    <FileIcon type="dir" className='size-24 mx-auto opacity-20' />
                                </div>
                                <div className='relative flex pt-3 gap-2 items-center'>
                                    <FileIcon type="dir" className='size-4 min-w-4' />
                                    <span className='text-sm truncate pr-6'>{localize('com_sop_view_all_files')}</span>
                                    <Button variant="ghost" className='absolute right-1 -bottom-1 w-6 h-6 p-0'>
                                        <ArrowRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }

            {/* search knowledge */}
            <SearchKnowledgeSheet
                isOpen={!!knowledgeInfo}
                onClose={() => setKnowledgeInfo(null)}
                data={knowledgeInfo?.data}
                searchQuery={knowledgeInfo?.query} />
            {/* web search */}
            <WebSearchSheet
                isOpen={!!webSearchInfo}
                onClose={() => setWebSearchInfo(null)}
                data={webSearchInfo?.data}
                searchQuery={webSearchInfo?.query} />
            {/* 文件列表抽屉 */}
            <FileDrawer
                title={title}
                files={allFiles}
                isOpen={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                downloadFile={downloadFile}
                onPreview={(id) => {
                    setCurrentDirectFile(null);
                    setCurrentPreviewFileId(id);
                    setIsDrawerOpen(false)
                    setIsPreviewOpen(true)
                    setTriggerDrawerFromCard(false)
                }}
            />
            {/* 文件预览抽屉 */}
            <FilePreviewDrawer
                files={mergeFiles}
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                downloadFile={downloadFile}
                directFile={currentDirectFile}
                currentFileId={currentPreviewFileId}
                onFileChange={(fileId) => setCurrentPreviewFileId(fileId)}
                onBack={currentDirectFile || triggerDrawerFromCard ? undefined : (() => {
                    setIsDrawerOpen(true);
                    setIsPreviewOpen(false);
                })}
            >
            </FilePreviewDrawer>
            {exportState.loading && (
                <div className="fixed top-24 right-5 flex items-center gap-2 bg-white p-3 rounded-lg shadow-md z-50">
                    <Loader2 className="size-5 animate-spin text-blue-500" />
                    <div className="text-sm text-gray-800">{exportState.title}&nbsp;正在导出，请稍后...&nbsp;&nbsp;</div>
                </div>
            )}
            {exportState.success && (
                <div className="fixed top-24 right-5 flex items-center gap-2 bg-white p-3 rounded-lg shadow-md z-50">
                    <CheckCircle className="size-5 text-green-500" />
                    <div className="text-sm text-gray-800">{exportState.title}&nbsp;文件下载成功</div>
                </div>
            )}
            {exportState.error && (
                <div className="fixed top-24 right-5 flex items-center gap-2 bg-white p-3 rounded-lg shadow-md z-50">
                    <CircleX className="size-5 text-red-500" />
                    <div className="text-sm text-gray-800">{exportState.title}&nbsp;导出失败</div>
                </div>
            )}
        </div >
    );
};


/**
 * 自动定位用户输入框
 * @param tasks 
 */
const useFoucsInput = (tasks: any) => {
    const [inputQueue, setInputQueue] = useState<string[]>([]); // 待处理的输入任务队列
    const [currentFocusId, setCurrentFocusId] = useState(''); // 当前聚焦的任务ID
    console.log('inputQueue :>> ', inputQueue);
    // 当任务变化时更新输入队列
    useEffect(() => {
        // 找出所有需要输入的新任务
        const newInputTasks = tasks
            .filter((task: any) => task.status === 'user_input' && !inputQueue.includes(task.id))
            .map(task => task.id);

        // 二级任务(同时只有一个二级任务下有待输入input)
        const hasUserInputTask = tasks.find((task: any) => task.children?.find((_task: any) => _task.status === 'user_input'));
        if (hasUserInputTask) {
            hasUserInputTask.children
                .filter((_task: any) => _task.status === 'user_input' && !inputQueue.includes(_task.id))
                .forEach(_task => newInputTasks.push(_task.id));
        }

        if (newInputTasks.length > 0) {
            // 将新任务添加到队列末尾
            setInputQueue((prev) => {
                const res = [...newInputTasks]
                setCurrentFocusId(res[0] || '')
                return res;
            });

        } else {
            setCurrentFocusId(newInputTasks[0] || '');
        }
    }, [tasks]);

    // 当输入队列变化时自动聚焦
    useEffect(() => {
        if (currentFocusId) {
            const dom = document.getElementById(currentFocusId);
            console.log('dom :>> ', dom);
            if (dom) {
                dom?.focus();
                // 平滑滚动到输入框位置
                dom.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }, [currentFocusId]);
}