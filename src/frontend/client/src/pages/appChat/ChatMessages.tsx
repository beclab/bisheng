import { useRef } from "react";
import { useRecoilValue } from "recoil";
import GuideWord from "./components/GuideWord";
import InputForm from "./components/InputForm";
import InputFormSkill from "./components/InputFormSkill";
import MessageBs, { ReasoningLog } from "./components/MessageBs";
import MessageBsChoose from "./components/MessageBsChoose";
import MessageFeedbackForm from "./components/MessageFeedbackForm";
import MessageFile from "./components/MessageFile";
import MessageNodeRun from "./components/MessageNodeRun";
import MessageRemark from "./components/MessageRemark";
import MessageRunlog from "./components/MessageRunlog";
import MessageSystem from "./components/MessageSystem";
import MessageUser from "./components/MessageUser";
import ResouceModal from "./components/ResouceModal";
import { currentChatState, currentRunningState } from "./store/atoms";
import { useMessage } from "./useMessages";
import { useLocalize } from "~/hooks";

export default function ChatMessages({ useName, title, logo, disabledSearch = false }) {
    const { messageScrollRef, chatId, messages } = useMessage()
    const { inputForm, guideWord, inputDisabled } = useRecoilValue(currentRunningState)
    const chatState = useRecoilValue(currentChatState)
    const localize = useLocalize()

    console.log('messages :>> ', chatState, messages, guideWord);
    // 反馈
    const thumbRef = useRef(null)
    // 溯源
    const sourceRef = useRef(null)

    const remark = chatState?.flow?.guide_word


    return <div id="messageScrollPanne" ref={messageScrollRef} className="h-full overflow-y-auto scrollbar-hide pt-2 pb-96 px-4">
        {/* 助手开场白 */}
        {remark && <MessageRemark
            logo={logo}
            title={title}
            message={remark}
        />
        }

        {
            messages.map((msg, index) => {
                // 技能特殊消息
                if (msg.files?.length) {
                    return <MessageFile key={msg.id} title={title} data={msg} logo={logo} />
                } else if (['tool', 'flow', 'knowledge'].includes(msg.category)) {
                    return <MessageRunlog key={msg.id || msg.extra} data={msg} />
                } else if (msg.thought) {
                    return <MessageSystem
                        logo={logo} title={title} key={msg.id} data={msg} />;
                }

                // output节点特殊msg
                switch (msg.category) {
                    case 'input':
                        return null
                    case 'question':
                        return <MessageUser
                            key={msg.id}
                            useName={useName}
                            data={msg}
                            disabledSearch={disabledSearch}
                            showButton={!inputDisabled && chatState?.flow.flow_type !== 10}
                        />;
                    case 'guide_word':
                        return <MessageRemark
                            key={msg.id}
                            logo={logo}
                            title={title}
                            message={msg.message.guide_word}
                        />;
                    case 'output_msg':
                    case 'stream_msg':
                    case "answer":
                        return <MessageBs
                            key={msg.id}
                            data={msg}
                            logo={logo}
                            title={title}
                            onUnlike={(messageId) => { thumbRef.current?.openModal(messageId) }}
                            onSource={(data) => { sourceRef.current?.openModal({ ...data, chatId }) }}
                        />;
                    case 'divider':
                        return <div key={msg.id} className={'flex items-center justify-center py-4 text-gray-400 text-sm'}>
                            ----------- {localize(msg.message)} -----------
                        </div>
                    case 'output_with_choose_msg':
                        return <MessageBsChoose key={msg.id} data={msg} logo={logo} flow={chatState.flow} />;
                    case 'output_with_input_msg':
                        return <MessageBsChoose type='input' key={msg.id} data={msg} logo={logo} flow={chatState.flow} />;
                    case 'node_run':
                        return <MessageNodeRun key={msg.id} data={msg} />;
                    case 'system':
                        return <MessageSystem
                            logo={logo}
                            title={title}
                            key={msg.id}
                            data={msg} />;
                    case 'reasoning':
                    case 'reasoning_answer':
                        return <ReasoningLog key={msg.id} loading={false} msg={msg.message} />
                    default:
                        return <div className="text-sm mt-2 border rounded-md p-2" key={msg.id}>Unknown message type</div>;
                }
            })
        }
        {/* 只有引导问题没有开场白 => 上面得要有图标+应用名称 */}
        {!remark
            && !messages.some(msg => msg.category === 'guide_word')
            && !!guideWord?.length
            && <MessageRemark
                logo={logo}
                title={title}
                message={''}
            />}
        {/* 引导词 */}
        {guideWord && !inputDisabled && !inputForm && <GuideWord data={guideWord} />}
        {/* 表单 */}
        {inputForm && (chatState?.flow.flow_type === 10 ?
            <InputForm data={inputForm} flow={chatState.flow} logo={logo} /> :
            <InputFormSkill flow={chatState.flow} logo={logo} />
        )}

        <MessageFeedbackForm ref={thumbRef}></MessageFeedbackForm>
        <ResouceModal ref={sourceRef}></ResouceModal>
    </div>
};
