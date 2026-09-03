import { NextResponse } from 'next/server';

/**
 * Passthrough — không còn gọi Google Translate.
 * Giữ route để tương thích client cũ; trả nguyên văn.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, items } = body;

    if (!text && (!items || items.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu câu hỏi không hợp lệ' },
        { status: 400 }
      );
    }

    const translatedText = typeof text === 'string' ? text : '';
    const translatedItems = (items || []).map((it: { id: string; name: string }) => ({
      id: it.id,
      name: it.name,
    }));

    return NextResponse.json({
      success: true,
      data: {
        translatedText,
        translatedItems,
      },
    });
  } catch (error: unknown) {
    console.error('Lỗi tại /api/translate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi server',
      },
      { status: 500 }
    );
  }
}
