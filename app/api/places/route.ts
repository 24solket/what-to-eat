import { NextResponse } from 'next/server';

// 카카오 REST API 키 (없으면 빈 문자열)
const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY || '';

export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  phone: string;
  distance: string;
  url: string;
  x: string;
  y: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '맛집';
  const lat = searchParams.get('lat') || '37.5665';
  const lon = searchParams.get('lon') || '126.9780';

  // API 키가 없으면 카카오맵 검색 URL만 반환
  if (!KAKAO_API_KEY) {
    const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
    const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;

    return NextResponse.json({
      hasApiKey: false,
      places: [],
      searchUrls: {
        kakao: kakaoMapUrl,
        naver: naverMapUrl,
      },
      message: '카카오 API 키가 없어 지도 검색 링크를 제공합니다.',
    });
  }

  try {
    const params = new URLSearchParams({
      query,
      x: lon,
      y: lat,
      radius: '3000', // 3km 반경
      sort: 'distance', // 거리순 정렬
      size: '5', // 5개 결과
    });

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_API_KEY}`,
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (data.documents) {
      const places: Place[] = data.documents.map((doc: {
        id: string;
        place_name: string;
        category_name: string;
        address_name: string;
        road_address_name: string;
        phone: string;
        distance: string;
        place_url: string;
        x: string;
        y: string;
      }) => ({
        id: doc.id,
        name: doc.place_name,
        category: doc.category_name,
        address: doc.address_name,
        roadAddress: doc.road_address_name,
        phone: doc.phone,
        distance: doc.distance,
        url: doc.place_url,
        x: doc.x,
        y: doc.y,
      }));

      return NextResponse.json({
        hasApiKey: true,
        places,
        total: data.meta?.total_count || 0,
      });
    }

    return NextResponse.json({
      hasApiKey: true,
      places: [],
      total: 0,
    });
  } catch (error) {
    console.error('Places API error:', error);

    // 에러 시에도 검색 URL 제공
    const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;

    return NextResponse.json({
      hasApiKey: false,
      places: [],
      searchUrls: {
        kakao: kakaoMapUrl,
      },
      error: 'Failed to fetch places',
    });
  }
}
