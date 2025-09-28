import asyncio
from typing import Optional

from dashscope.audio.tts_v2 import SpeechSynthesizer

from ..base import BaseTTSClient


class AliyunTTSClient(BaseTTSClient):
    """阿里云TTS客户端"""

    def __init__(self, api_key: str, **kwargs):
        """
        初始化阿里云TTS客户端
        """
        self.model = kwargs.get("model", "cosyvoice-v2")
        self.voice = kwargs.get("voice", "longxiaochun_v2")
        self.app_key = api_key
        self.synthesizer = SpeechSynthesizer(model=self.model, voice=self.voice)
        self.synthesizer.request.apikey = self.app_key

    def sync_func(self, text: str):
        audio = self.synthesizer.call(text=text)
        return audio

    async def synthesize(
            self,
            text: str,
            voice: Optional[str] = None,
            language: Optional[str] = None,
            format: str = "mp3"
    ) -> bytes:
        """
        将文本转换为音频
        :param text:
        :param voice:
        :param language:
        :param format:
        :return:
        """

        audio = await asyncio.to_thread(self.sync_func, text=text)

        if audio is None:
            raise ValueError("TTS synthesis failed, no audio data returned.")

        return audio
