import time
from openai import OpenAI

from app.config import DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, DASHSCOPE_MODEL

client = OpenAI(api_key=DASHSCOPE_API_KEY, base_url=DASHSCOPE_BASE_URL)


def chat(messages: list[dict], model: str = None) -> tuple:
    start = time.time()
    response = client.chat.completions.create(
        model=model or DASHSCOPE_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    )
    elapsed_ms = int((time.time() - start) * 1000)
    return response.choices[0].message.content, elapsed_ms


def chat_stream(messages: list[dict], model: str = None):
    """生成器：逐 token 产出 AI 回复文本片段。调用方负责拼接 full_text 并落库。"""
    stream = client.chat.completions.create(
        model=model or DASHSCOPE_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        stream=True,
    )
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
