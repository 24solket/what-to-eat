import { NextResponse } from 'next/server';

const API_KEY = 'a7f6eb06576828b9ef107157a7096e427b65bb2915d9248a499a6fa1225e49aa';
const API_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';

// 위경도를 격자 좌표로 변환
function convertToGrid(lat: number, lon: number) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx: x, ny: y };
}

function getBaseDateTime() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 초단기실황은 매시 40분 이후에 발표
  // 40분 이전이면 이전 시간의 데이터 사용
  if (minute < 40) {
    now.setHours(hour - 1);
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const baseTime = String(now.getHours()).padStart(2, '0') + '00';

  return {
    baseDate: `${year}${month}${day}`,
    baseTime,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '37.5665'); // 서울 기본값
  const lon = parseFloat(searchParams.get('lon') || '126.9780');

  const { nx, ny } = convertToGrid(lat, lon);
  const { baseDate, baseTime } = getBaseDateTime();

  const params = new URLSearchParams({
    serviceKey: decodeURIComponent(API_KEY),
    pageNo: '1',
    numOfRows: '10',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: String(nx),
    ny: String(ny),
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      cache: 'no-store',
    });

    const data = await response.json();

    if (data.response?.header?.resultCode !== '00') {
      // API 에러 시 기본값 반환
      return NextResponse.json({
        temperature: 20,
        sky: 'clear',
        precipitation: 'none',
        humidity: 50,
        error: data.response?.header?.resultMsg || 'API Error',
      });
    }

    const items = data.response?.body?.items?.item || [];

    let temperature = 20;
    let precipitation = 'none';
    let humidity = 50;
    let pty = '0';

    for (const item of items) {
      switch (item.category) {
        case 'T1H': // 기온
          temperature = parseFloat(item.obsrValue);
          break;
        case 'PTY': // 강수형태: 0없음, 1비, 2비/눈, 3눈, 5빗방울, 6빗방울눈날림, 7눈날림
          pty = item.obsrValue;
          break;
        case 'REH': // 습도
          humidity = parseFloat(item.obsrValue);
          break;
      }
    }

    // 강수형태 변환
    switch (pty) {
      case '1':
      case '2':
      case '5':
      case '6':
        precipitation = 'rain';
        break;
      case '3':
      case '7':
        precipitation = 'snow';
        break;
      default:
        precipitation = 'none';
    }

    // 하늘 상태 (초단기실황에서는 SKY가 없으므로 습도로 추정)
    let sky = 'clear';
    if (humidity > 80) sky = 'overcast';
    else if (humidity > 60) sky = 'cloudy';

    return NextResponse.json({
      temperature,
      sky,
      precipitation,
      humidity,
      grid: { nx, ny },
      baseDate,
      baseTime,
    });
  } catch (error) {
    console.error('Weather API error:', error);
    // 에러 시 기본값 반환
    return NextResponse.json({
      temperature: 20,
      sky: 'clear',
      precipitation: 'none',
      humidity: 50,
      error: 'Failed to fetch weather data',
    });
  }
}
