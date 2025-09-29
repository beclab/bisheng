import { useEffect, useMemo, useState } from "react";
import '../../markdown.css';
import Markdown from '../Chat/Messages/Content/Markdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui";
import { useLocalize } from "~/hooks";

interface FilePreviewProps {
    // 原有方式：通过 fileId 查找文件
    files?: any[]
    fileId?: string
    // 新增方式：直接传入文件对象
    currentDisplayFile?: any
}

export default function FilePreview({ files, fileId, currentDisplayFile }: FilePreviewProps) {
    const localize = useLocalize();
    // 获取当前文件信息
    const currentFile = useMemo(() => {
        if (currentDisplayFile) {
            return currentDisplayFile
        }

        if (files && fileId) {
            const currentFile = files.find(file => file.file_id === fileId)
            return currentFile
        }

        return null
    }, [files, fileId, currentDisplayFile])

    // 获取文件扩展名
    const getFileExtension = (fileName: string): string => {
        const lastDot = fileName.lastIndexOf(".")
        return (lastDot !== -1 ? fileName.substring(lastDot + 1) : "").toLowerCase()
    }

    const render = () => {
        if (!currentFile && !currentFile?.file_url) {
            return <div className="flex justify-center items-center h-full text-gray-400">{localize('com_sop_preview_failed')}</div>
        }

        const { file_url, file_name } = currentFile
        const type = getFileExtension(file_name)

        // 对于直接文件模式，不需要 URL
        const url = `${location.origin}${file_url}`

        switch (type) {
            case 'doc':
            case 'docx':
            case 'md':
                return <TxtFileViewer
                    markdown
                    filePath={url}
                />
            case 'csv':
                return <TxtFileViewer
                    csv
                    filePath={url}
                />
            case 'txt':
                return <TxtFileViewer
                    filePath={url}
                />
            case 'html':
                return <TxtFileViewer
                    html
                    filePath={url}
                />
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'bmp':
                return <img
                    className="border"
                    src={url.replace(/https?:\/\/[^\/]+/, __APP_ENV__.BASE_URL) || "/placeholder.svg"}
                    alt={file_name}
                />
            default:
                return <div className="flex justify-center items-center h-full text-gray-400">{localize('com_sop_preview_failed')}</div>
        }
    }

    return <div className="relative h-[calc(100vh-84px)] overflow-y-auto">{render()}</div>
}

interface TxtFileViewerProps {
    html?: boolean
    markdown?: boolean
    csv?: boolean
    filePath?: string
    directContent?: string // 新增：直接传入的内容
}

const TxtFileViewer = ({ html = false, markdown = false, csv = false, filePath }: TxtFileViewerProps) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const localize = useLocalize();

    useEffect(() => {
        if (!filePath) {
            setError('No file path or direct content provided');
            setLoading(false);
            return;
        }

        const fetchTextFile = async () => {
            try {
                setLoading(true);
                const url = filePath.replace(/https?:\/\/[^\/]+/, __APP_ENV__.BASE_URL)
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
                }
                const text = await response.text();
                setContent(text);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setContent('');
            } finally {
                setLoading(false);
            }
        };

        fetchTextFile();
    }, [filePath]);

    if (loading) {
        return (
            <div className="p-4 text-sm text-gray-500">
                <img className='size-5' src={__APP_ENV__.BASE_URL + '/assets/load.webp'} alt="" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-sm text-red-500">
                {localize('com_sop_file_load_error')}: {error}
            </div>
        );
    }

    if (html) return <iframe
        className="w-full h-full border"
        srcDoc={content}
        sandbox="allow-scripts"
    />

    if (markdown) return <div className="bs-mkdown p-10">
        <Markdown content={content} isLatestMessage={true} webContent={false} />
    </div>

    if (csv) return <CsvTableViewer csvText={content} />

    return (
        <div className="p-4 text-sm whitespace-pre-wrap bg-gray-50 rounded border border-gray-200 h-full overflow-y-auto">
            {content || <span className="text-gray-400">({localize('com_sop_empty_file')})</span>}
        </div>
    );
};

interface CsvTableViewerProps {
    csvText: string;
}

export function CsvTableViewer({ csvText }: CsvTableViewerProps) {
    // 改进的CSV解析：只有逗号后无空格才分割
    const parseCsv = (text: string) => {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        return rows.map(row => {
            // 关键修改：使用负向零宽断言 (?<!\s) 确保逗号前没有空格
            const cells = row.split(/,(?!\s)/);
            return cells.map(cell => cell.trim());
        });
    };

    const parsedData = parseCsv(csvText);
    const headers = parsedData[0] || [];
    const rows = parsedData.slice(1);

    const isUrl = (str: string) => {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <div className="rounded-md border mx-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map((header, index) => (
                            <TableHead key={index} className="font-medium">
                                {header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>
                                    {isUrl(cell) ? (
                                        <a
                                            href={cell}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline break-all"
                                        >
                                            {cell.length > 30 ? `${cell.substring(0, 30)}...` : cell}
                                        </a>
                                    ) : (
                                        cell
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
