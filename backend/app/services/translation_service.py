import os
import json
from groq import Groq

def translate_segments(segments: list, genre: str = 'animation', glossary: list = None) -> list:
    """Translate Chinese segments to Vietnamese using Groq Llama API."""
    client = Groq(api_key=os.getenv('GROQ_API_KEY'))

    # Build glossary string
    glossary_text = ''
    if glossary:
        glossary_text = '\nTỪ ĐIỂN THUẬT NGỮ (BẮT BUỘC tuân thủ):\n'
        for term in glossary:
            glossary_text += f"  {term['zh']} → {term['vi']}\n"

    # Build segments for prompt
    segments_json = []
    for seg in segments:
        duration = seg['end'] - seg['start']
        max_chars = int(duration * 5.0 * 0.9)  # ~5 chars/sec, 90% budget
        segments_json.append({
            'id': seg['id'],
            'text_zh': seg['text_zh'],
            'duration_sec': round(duration, 1),
            'max_vi_chars': max(10, max_chars)
        })

    genre_instructions = {
        'animation': 'Đây là phim hoạt hình Trung Quốc (donghua). Dùng ngôn ngữ tự nhiên, thuật ngữ Hán-Việt cho tu tiên/võ hiệp. Tên riêng phiên âm Hán-Việt.',
        'news': 'Đây là tin tức. Dùng ngôn ngữ trang trọng, chính xác.',
        'education': 'Đây là nội dung giáo dục. Dùng ngôn ngữ rõ ràng, dễ hiểu.'
    }

    prompt = f"""Bạn là chuyên gia dịch phụ đề sang tiếng Việt.

{genre_instructions.get(genre, genre_instructions['animation'])}
{glossary_text}

QUY TẮC:
1. Mỗi câu dịch PHẢI ngắn hơn hoặc bằng max_vi_chars ký tự
2. Nếu quá dài → diễn đạt ngắn gọn hơn, giữ nghĩa chính
3. Ưu tiên: ĐÚNG NGHĨA > TỰ NHIÊN > ĐẦY ĐỦ
4. Dùng đúng thuật ngữ trong từ điển nếu có

CÁC CÂU CẦN DỊCH:
{json.dumps(segments_json, ensure_ascii=False, indent=2)}

Bạn PHẢI trả về ĐÚNG MỘT JSON OBJECT theo định dạng sau:
{{"translations": [{{"id": 1, "text_vi": "..."}}, ...]}}
CHỈ trả về JSON object, không có bất kỳ văn bản nào khác."""

    response = client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    # Parse response
    response_text = response.choices[0].message.content.strip()
    
    # Cố gắng bóc tách JSON nếu Llama vẫn cố tình chèn markdown (ví dụ: ```json ... ```)
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].strip()

    try:
        data = json.loads(response_text)
        translations = data.get("translations", [])
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw response: {response_text}")
        raise ValueError("Failed to parse AI response as JSON")

    # Update segments
    trans_map = {t['id']: t['text_vi'] for t in translations}
    for seg in segments:
        if seg['id'] in trans_map:
            seg['text_vi'] = trans_map[seg['id']]

    return segments
