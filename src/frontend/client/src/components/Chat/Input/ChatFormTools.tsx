import { FileText, GlobeIcon, Hammer, KeyRound, Pencil, Settings2Icon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Switch } from '~/components/ui';
import { Select, SelectContent, SelectTrigger } from '~/components/ui/Select';
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip2";
import { useGetBsConfig, useModelBuilding } from '~/data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

import {
    BsConfig
} from '~/data-provider/data-provider/src';
import { cn } from '~/utils';

// 工具
export const ChatToolDown = ({ linsi, tools, setTools, config, searchType, setSearchType, disabled }
    : { linsi: boolean, config?: BsConfig, searchType: string, setSearchType: (type: string) => void, disabled: boolean }) => {
    const [building] = useModelBuilding()
    const localize = useLocalize()

    // 每次重置工具
    useEffect(() => {
        setSearchType('');
    }, [])

    if (linsi) return <LinsiTools tools={tools} setTools={setTools} />

    return <Select disabled={disabled}>
        <SelectTrigger className="h-7 rounded-full px-2 bg-white dark:bg-transparent data-[state=open]:border-blue-500">
            <div className={cn('flex gap-2', searchType && 'text-blue-600')}>
                <Settings2Icon size="16" />
                <span className="text-xs font-normal">{localize('com_tools_title')}</span>
            </div>
        </SelectTrigger>
        <SelectContent className='bg-white rounded-xl p-2 w-52'>
            {
                config?.webSearch.enabled && <div className='flex justify-between mb-3'>
                    <div className='flex gap-2 items-center'>
                        <GlobeIcon className='' size="16" />
                        <span className="text-xs font-normal">{localize('com_tools_web_search')}</span>
                    </div>
                    <Switch className='data-[state=checked]:bg-blue-600'
                        disabled={disabled}
                        checked={searchType === 'netSearch'}
                        onCheckedChange={val => {
                            if (searchType === 'netSearch') {
                                setSearchType('');
                            } else {
                                setSearchType('netSearch');
                            }
                        }}
                    ></Switch>
                </div>
            }
            {
                config?.knowledgeBase.enabled && <div className='flex justify-between'>
                    <div className='flex gap-2 items-center'>
                        <FileText size="16" />
                        <span className="text-xs font-normal">{localize('com_tools_personal_knowledge')}</span>
                    </div>
                    <Tooltip delayDuration={200}>
                        <TooltipTrigger >
                            <Switch className='data-[state=checked]:bg-blue-600'
                                disabled={building || disabled}
                                checked={searchType === 'knowledgeSearch'}
                                onCheckedChange={val => {
                                    if (searchType === 'knowledgeSearch') {
                                        setSearchType('');
                                    } else {
                                        setSearchType('knowledgeSearch');
                                    }
                                }}
                            ></Switch>
                        </TooltipTrigger>

                        {building && <TooltipContent
                            className={`text-sm shadow-md`}
                            avoidCollisions={false}
                            sticky="always"
                        >
                            <p>{localize('com_tools_knowledge_rebuilding')}</p>
                        </TooltipContent>
                        }
                    </Tooltip>
                </div>
            }
        </SelectContent>
    </Select>
}


const LinsiTools = ({ tools, setTools }) => {
    const { data: bsConfig } = useGetBsConfig()
    const localize = useLocalize()
    const lang = useRecoilValue(store.lang);

    useEffect(() => {
        const defaultTools = [{
            id: 'pro_knowledge',
            name: localize('com_tools_org_knowledge'),
            icon: <KeyRound size="16" />,
            checked: true
        },
        {
            id: 'knowledge',
            name: localize('com_tools_personal_knowledge'),
            icon: <Pencil size="16" />,
            checked: true
        },]
        if (bsConfig) {
            const tools = bsConfig.linsightConfig?.tools || []
            const newTools = tools.map(tool => ({
                id: tool.id,
                name: tool.name,
                icon: <Hammer size="16" />,
                checked: true,
                data: tool
            }))
            setTools((tools) => [...defaultTools, ...newTools])
        }

    }, [bsConfig, lang])


    const active = useMemo(() => tools.some(tool => tool.checked), [tools])

    return <Select>
        <SelectTrigger className="h-7 rounded-full px-2 bg-white dark:bg-transparent data-[state=open]:border-blue-500">
            <div className={cn('flex gap-2', active && 'text-blue-600')}>
                <Settings2Icon size="16" />
                <span className="text-xs font-normal">{localize('com_tools_title')}</span>
            </div>
        </SelectTrigger>
        <SelectContent className='bg-white rounded-xl p-2 w-64'>
            {tools.map(tool => {
                return <div key={tool.name} className='flex justify-between mb-3.5'>
                    <div className='flex gap-2 items-center'>
                        {tool.icon}
                        <span className="max-w-36 text-xs font-normal line-clamp-1 flex-1 grow overflow-hidden">{tool.name}</span>
                    </div>
                    <Switch className='data-[state=checked]:bg-blue-600'
                        checked={tool.checked}
                        onCheckedChange={val =>
                            setTools(tools.map(t => t.id === tool.id ? { ...t, checked: val } : t))
                        }
                    ></Switch>
                </div>
            })}
        </SelectContent>
    </Select>
}