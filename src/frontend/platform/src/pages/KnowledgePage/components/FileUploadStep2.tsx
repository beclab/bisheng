import { Button } from "@/components/bs-ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/bs-ui/tabs";
import { useToast } from "@/components/bs-ui/toast/use-toast";
import { cn } from "@/util/utils";
import { SearchCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import useKnowledgeStore from "../useKnowledgeStore";
import PreviewResult from "./PreviewResult";
import RuleFile from "./RuleFile";
import RuleTable from "./RuleTable";
import { LoadingIcon } from "@/components/bs-icons/loading";
import { forwardRef, useImperativeHandle } from 'react';

export interface FileItem {
    split_rule: any;
    id: string;
    fileName: string;
    file_path: string;
    fileType: 'table' | 'file';
    suffix: string;
}
interface IProps {
    step: number
    resultFiles: FileItem[]
    isSubmitting: boolean
    onNext: (step: number, config?: any) => void
    onPrev: () => void
    isAdjustMode?: boolean
    kId?: string | number
}
const enum DisplayModeType {
    OnlyTables = 'table',
    OnlyDocuments = 'file',
    Mixed = 'mixed'
}

const initialStrategies = [
    { id: '1', regex: '\\n\\n', position: 'after', rule: '双换行后切分,用于分隔段落' },
    { id: '2', regex: '\\n', position: 'after', rule: '单换行后切分，用于分隔普通换行' }
];

const FileUploadStep2 = forwardRef(({ step, resultFiles, isSubmitting, onNext, onPrev, isAdjustMode, kId }: IProps, ref) => {
    const [previewLoading, setPreviewLoading] = useState(false);
    const { id: kid } = useParams()
    const { t } = useTranslation('knowledge')
    const setSelectedChunkIndex = useKnowledgeStore((state) => state.setSelectedChunkIndex);
    const [previewFailed, setPreviewFailed] = useState(false);
    const displayStep = isAdjustMode ? step + 1 : step;
    const splitRule = resultFiles[0]?.split_rule;
    console.log("子组件接收的布尔值：", {
        retain_images: splitRule?.retain_images,
        force_ocr: splitRule?.force_ocr
    });
    const displayMode: DisplayModeType | null = useMemo(() => {
        if (!resultFiles || resultFiles.length === 0) return null;

        const hasTableFiles = resultFiles.some(file => file.fileType === 'table');
        const hasDocumentFiles = resultFiles.some(file => file.fileType === 'file');

        return hasTableFiles && !hasDocumentFiles ? DisplayModeType.OnlyTables :
            !hasTableFiles && hasDocumentFiles ? DisplayModeType.OnlyDocuments :
                DisplayModeType.Mixed;
    }, [resultFiles]);


    const [showPreview, setShowPreview] = useState(false)
    const [previewCount, setPreviewCount] = useState(0)
    const {
        rules,
        setRules,
        applyEachCell,
        setApplyEachCell,
        cellGeneralConfig,
        setCellGeneralConfig,
        strategies,
        setStrategies
    } = useFileProcessingRules(initialStrategies, resultFiles, kid || kId, resultFiles[0].split_rule);

    const [applyRule, setApplyRule] = useState<any>({}) // 应用规则
    const applyRuleRef = useRef(applyRule);
    useEffect(() => {
        applyRuleRef.current = applyRule;
    }, [applyRule]);
    // 起始行与切分参数校验
    const vildateCell = () => {
        // 表头行区间校验
        if (applyEachCell
            ? rules.fileList.some(file => file.excelRule.append_header && Number(file.excelRule.header_start_row) > Number(file.excelRule.header_end_row))
            : cellGeneralConfig.append_header && Number(cellGeneralConfig.header_start_row) > Number(cellGeneralConfig.header_end_row)) {
            toast({
                variant: 'warning',
                description: '最小行不能大于最大行'
            })
            return true
        }

        // 切分长度与重叠长度校验
        const chunkSizeNum = Number((rules as any)?.chunkSize ?? (rules as any)?.chunk_size ?? 0)
        const chunkOverlapNum = Number((rules as any)?.chunkOverlap ?? (rules as any)?.chunk_overlap ?? 0)
        if (!Number.isNaN(chunkSizeNum) && !Number.isNaN(chunkOverlapNum) && chunkOverlapNum > chunkSizeNum) {
            toast({
                variant: 'warning',
                description: '重叠区长度不能大于预期切分长度'
            })
            return true
        }

        return false
    }

    const { toast } = useToast()
    const internalHandleNext = () => {
        // 全局校验：无论在哪个分支，都先校验参数
        if (vildateCell()) return;
        // 规则校验：过滤后若为空或存在空regex，阻止继续
        const hasEmptyCustomRule = (strategies || []).some(s => String(s?.regex ?? '') === '');
        if (hasEmptyCustomRule) {
            toast({ variant: 'warning', description: '自定义规则不能为空' });
            return;
        }
        if (!rules.separator || rules.separator.length === 0) {
            toast({ variant: 'warning', description: '请至少添加一个分割规则' });
            return;
        }
        const nextStep = step + 1;
        if (step === 2 || displayStep === 2) {
            const config = {
                applyEachCell,
                cellGeneralConfig,
                rules
            };
            setApplyRule(config);

            setSelectedChunkIndex(-1); // 清空选中块
            return onNext(nextStep, config);
        }
        // 合并配置
        const { fileList, pageHeaderFooter, chunkOverlap, chunkSize, enableFormula, forceOcr, retainImages, separator, separatorRule } = rules;

        const params = {
            knowledge_id: kid || kId,
            file_list: fileList.map(item => ({
                file_path: item.filePath,
                excel_rule: applyEachCell ? item.excelRule : cellGeneralConfig
            })),
            separator,
            separator_rule: separatorRule,
            chunk_size: chunkSize,
            chunk_overlap: chunkOverlap,
            retain_images: retainImages,
            enable_formula: enableFormula,
            force_ocr: forceOcr,
            fileter_page_header_footer: pageHeaderFooter
        };

        onNext(nextStep, params);
    };

    // 使用 useImperativeHandle 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        handleNext: internalHandleNext
    }));
    // 预览
    useEffect(() => {
        setApplyRule({
            applyEachCell,
            cellGeneralConfig,
            rules
        });
    }, [applyEachCell, cellGeneralConfig, rules]);
    const handlePreview = () => {
        if (vildateCell()) return
        const hasEmptyCustomRule = (strategies || []).some(s => String(s?.regex ?? '') === '');
        if (hasEmptyCustomRule) {
            toast({ variant: 'warning', description: '自定义规则不能为空' });
            return;
        }
        if (!rules.separator || rules.separator.length === 0) {
            toast({ variant: 'warning', description: '请至少添加一个分割规则' });
            return;
        }
        setShowPreview(true)
        setPreviewLoading(true);
        setPreviewCount(c => c + 1) // 刷新分段


        setApplyRule({
            applyEachCell,
            cellGeneralConfig,
            rules: { ...rules, knowledgeId: kId }
        })
        console.log(applyRule, 'previewCount');
    }


    return <div>
        {/* 核心修改：使用flex布局实现预览时的半平分 */}
        <div className={cn("flex flex-row justify-center gap-4", showPreview ? "px-4" : "")}>
            {/* 左侧区域：规则设置区 */}
            {
                displayStep === 2 && (
                    <div className={cn(
                        "h-full flex flex-col min-w-[540px]",
                        // 预览时占50%
                        showPreview ? "max-w-1/2" : ""
                    )}>
                        <Tabs
                            defaultValue={displayMode === DisplayModeType.Mixed ? 'file' : displayMode}
                            className="flex flex-col h-full"
                        >
                            {/* 标签页头部 */}
                            <div className="">
                                {displayMode === DisplayModeType.Mixed ? (
                                    <TabsList className="">
                                        <TabsTrigger id="knowledge_file_tab" value="file" className="roundedrounded-xl">{t('defaultStrategy')}</TabsTrigger>
                                        <TabsTrigger id="knowledge_table_tab" value="table">{t('customStrategy')}</TabsTrigger>
                                    </TabsList>
                                ) : <div className="h-1"></div>}
                            </div>
                            {/* 文件文档设置 */}
                            <TabsContent value="file">
                                <RuleFile
                                    rules={rules}
                                    setRules={setRules}
                                    strategies={strategies}
                                    setStrategies={(next) => setStrategies(next)}
                                    showPreview={showPreview}
                                />
                            </TabsContent>
                            {/* 表格文档设置 */}
                            <TabsContent value="table">
                                <RuleTable
                                    rules={rules}
                                    setRules={setRules}
                                    applyEachCell={applyEachCell}
                                    setApplyEachCell={setApplyEachCell}
                                    cellGeneralConfig={cellGeneralConfig}
                                    setCellGeneralConfig={setCellGeneralConfig}
                                    showPreview={showPreview}
                                />
                            </TabsContent>
                            {/* 预览分段按钮 */}
                            <div className="mt-4">
                                <Button
                                    className="h-8"
                                    onClick={handlePreview}
                                    disabled={strategies.length === 0}
                                >
                                    <SearchCheck size={16} />
                                    {showPreview ? '重新预览分段' : t('previewResults')}
                                </Button>
                            </div>
                        </Tabs>
                    </div>
                )
            }

            {/* 原文预览 & 分段预览：预览时占50% */}
            {
                (showPreview || (step === 3 && !isAdjustMode)) ? (
                    <div className={cn(
                        "relative",
                        // 预览时占50%宽度
                        showPreview ? "w-1/2" : ""
                    )}>

                        {/* 预览组件 - 始终渲染以保证Hook稳定性 */}
                        <PreviewResult
                            showPreview={showPreview}
                            step={step}
                            previewCount={previewCount}
                            kId={kId}
                            rules={applyRule.rules}
                            applyEachCell={applyRule.applyEachCell}
                            cellGeneralConfig={applyRule.cellGeneralConfig}
                            handlePreviewResult={(isSuccess) => {
                                setPreviewFailed(!isSuccess);
                                // 预览完成后关闭loading
                                setPreviewLoading(false);
                            }}
                        />
                    </div>
                ) : null
            }
        </div >

        <div className="fixed bottom-2 right-12 flex gap-4 bg-white p-2 rounded-lg shadow-sm z-10">
            <Button
                className="h-8"
                variant="outline"
                onClick={() => {
                    onPrev()
                    step === 2 && setShowPreview(false) // step时关闭
                }}
            >
                {t('previousStep')}
            </Button>
            <Button
                className="h-8"
                // disabled={strategies.length === 0}
                disabled={previewFailed || isSubmitting || strategies.length === 0}
                onClick={internalHandleNext}
            >
                {isSubmitting ? (
                    <LoadingIcon className="h-12 w-12" />
                ) : (
                    t('nextStep')
                )}
            </Button>
        </div>
    </div>
});
FileUploadStep2.displayName = 'FileUploadStep2';

export default FileUploadStep2;


const useFileProcessingRules = (initialStrategies, resultFiles, kid, splitRule) => {
    // 统一解析 splitRule：可能是字符串或对象
    const parsedSplitRule = useMemo(() => {
        if (!splitRule) return {} as any;
        if (typeof splitRule === 'string') {
            try {
                const obj = JSON.parse(splitRule);
                return obj && typeof obj === 'object' ? obj : {};
            } catch (e) {
                console.error('splitRule 解析失败:', e);
                return {} as any;
            }
        }
        return splitRule || {};
    }, [splitRule]);
    const [rules, setRules] = useState({
        knowledgeId: kid,
        fileList: [],
        // 统一显示：将真实换行转为可见的转义形式
        separator: (parsedSplitRule?.separator || ['\\n\\n', '\\n']).map((s) =>
            typeof s === 'string' ? s.replace(/\n/g, '\\n') : s
        ),
        separatorRule: parsedSplitRule?.separator_rule || ['after', 'after'],
        chunkSize: parsedSplitRule?.chunk_size?.toString() || "1000",
        chunkOverlap: parsedSplitRule?.chunk_overlap?.toString() || "0",
        retainImages: parsedSplitRule?.retain_images ?? true,
        enableFormula: parsedSplitRule?.enable_formula ?? true,
        forceOcr: parsedSplitRule?.force_ocr ?? true,
        pageHeaderFooter: parsedSplitRule?.filter_page_header_footer ?? true
    });

    const [applyEachCell, setApplyEachCell] = useState(false);
    const [cellGeneralConfig, setCellGeneralConfig] = useState({
        slice_length: splitRule?.excel_rule?.slice_length || 10,
        append_header: splitRule?.excel_rule?.append_header || true,
        header_start_row: splitRule?.excel_rule?.header_start_row || 1,
        header_end_row: splitRule?.excel_rule?.header_end_row || 1
    });



    // 根据正则表达式生成策略描述
    const getStrategyRuleDescription = (regex) => {
        const ruleMap = {
            // 转义形式
            '\\n\\n': '双换行后切分,用于分隔段落',
            '\\n': '单换行后切分，用于分隔普通换行',
            // 真实换行字符形式
            '\n\n': '双换行后切分,用于分隔段落',
            '\n': '单换行后切分，用于分隔普通换行',
            '第.{1,3}章': '"第X章"前切分，切分章节等',
            '第.{1,3}条': '"第X条"前切分，切分条目等',
            '。': '中文句号后切分，中文断句',
            '\\.': '英文句号后切分，英文断句'
        };
        return ruleMap[regex] || `自定义规则: ${regex}`;
    };
    const [strategies, setStrategies] = useState(() => {
        if (parsedSplitRule?.separator && parsedSplitRule?.separator_rule) {
            // 从 parsedSplitRule 初始化策略（将真实换行标准化为可见的转义形式）
            return parsedSplitRule.separator.map((regex, index) => ({
                id: `strategy-${index}`,
                regex: typeof regex === 'string' ? regex.replace(/\n/g, '\\n') : regex,
                position: parsedSplitRule.separator_rule[index] || 'after',
                rule: getStrategyRuleDescription(regex) // 根据正则生成描述
            }));
        }
        return initialStrategies;
    });
    // Update rules when strategies change（不过滤只含换行的规则）
    useEffect(() => {
        const cleaned = (strategies || []).filter(s => String(s?.regex ?? '') !== '');
        const [separator, separatorRule] = cleaned.reduce(([_separator, _separatorRule], strategy) => {
            // 统一显示：确保换行以可见转义“\\n”存在，避免 UI 为空
            const regex = String(strategy.regex).replace(/\n/g, '\\n');
            const position = strategy.position || 'after';
            return [[..._separator, regex], [..._separatorRule, position]];
        }, [[], []]);

        setRules(prev => ({
            ...prev,
            separator,
            separatorRule
        }));
    }, [strategies]);

    // Initialize rules when resultFiles change
    useEffect(() => {
        if (resultFiles && resultFiles.length > 0) {
            setRules(prev => ({
                ...prev,
                fileList: resultFiles.map(file => ({
                    id: file.id,
                    filePath: file.file_path,
                    fileName: file.fileName,
                    previewUrl: file.previewUrl,
                    suffix: file.suffix,
                    fileType: file.fileType,
                    excelRule: file.fileType === 'table' ? {
                        ...cellGeneralConfig
                    } : {}
                }))
            }));
        }
    }, [resultFiles, kid, cellGeneralConfig]);

    return {
        rules,
        setRules,
        applyEachCell,
        setApplyEachCell,
        cellGeneralConfig,
        setCellGeneralConfig,
        strategies,
        setStrategies
    };
};
