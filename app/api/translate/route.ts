import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình DEEPSEEK_API_KEY trong .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, items } = body;

    if (!text && (!items || items.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu câu hỏi cần dịch không hợp lệ' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert medical translator for hospital triage systems.
Translate the following medical question and symptom names from English to accurate, natural Vietnamese suitable for patient kiosk displays.
Maintain exact IDs for items.
IMPORTANT: Return ONLY a raw JSON object (no markdown, no backticks, no extra text) matching this JSON structure:
{
  "translatedText": "Tiêu đề câu hỏi tiếng Việt",
  "translatedItems": [
    { "id": "item_id", "name": "Tên triệu chứng tiếng Việt" }
  ]
}`;

    const userPayload = {
      text: text || '',
      items: (items || []).map((it: { id: string; name: string }) => ({
        id: it.id,
        name: it.name
      }))
    };

    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!deepseekRes.ok) {
      const errorText = await deepseekRes.text();
      return NextResponse.json(
        { success: false, error: `DeepSeek API Lỗi [${deepseekRes.status}]: ${errorText}` },
        { status: deepseekRes.status }
      );
    }

    const resData = await deepseekRes.json();
    const content = resData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'DeepSeek không trả về dữ liệu dịch' },
        { status: 500 }
      );
    }

    // Clean JSON content if wrapped in markdown code blocks
    const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedContent);

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Lỗi tại /api/translate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi dịch bằng DeepSeek' },
      { status: 500 }
    );
  }
}
