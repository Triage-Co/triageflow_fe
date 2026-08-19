import { NextResponse } from 'next/server';
import { fetchGoogleTranslate } from '@/modules/reception/services/googleTranslationService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, items } = body;

    if (!text && (!items || items.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu câu hỏi cần dịch không hợp lệ' },
        { status: 400 }
      );
    }

    const translatedText = text ? await fetchGoogleTranslate(text) : '';
    const translatedItems = await Promise.all(
      (items || []).map(async (it: { id: string; name: string }) => ({
        id: it.id,
        name: (await fetchGoogleTranslate(it.name)) || it.name,
      }))
    );

    return NextResponse.json({
      success: true,
      data: {
        translatedText,
        translatedItems,
      },
    });
  } catch (error: any) {
    console.error('Lỗi tại /api/translate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi dịch' },
      { status: 500 }
    );
  }
}
