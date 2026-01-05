import { Menu, MENUS } from '../data/menus';

export interface WeatherData {
  temperature: number;
  sky: 'clear' | 'cloudy' | 'overcast';
  precipitation: 'none' | 'rain' | 'snow' | 'sleet';
  humidity: number;
}

export interface RecommendInput {
  weather: WeatherData;
  timeSlot: '아침' | '점심' | '저녁' | '야식';
  situation: string;
}

export interface RecommendedMenu extends Menu {
  score: number;
  reason: string;
}

export function getTimeSlot(): '아침' | '점심' | '저녁' | '야식' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return '아침';
  if (hour >= 10 && hour < 15) return '점심';
  if (hour >= 15 && hour < 21) return '저녁';
  return '야식';
}

export function getTimeSlotEmoji(slot: string): string {
  switch (slot) {
    case '아침': return '🌅';
    case '점심': return '☀️';
    case '저녁': return '🌆';
    case '야식': return '🌙';
    default: return '🕐';
  }
}

export function getWeatherEmoji(weather: WeatherData): string {
  if (weather.precipitation === 'rain') return '🌧️';
  if (weather.precipitation === 'snow') return '❄️';
  if (weather.sky === 'clear') return weather.temperature > 25 ? '☀️' : '🌤️';
  if (weather.sky === 'cloudy') return '⛅';
  return '☁️';
}

export function getWeatherDescription(weather: WeatherData): string {
  const temp = weather.temperature;
  let desc = `${temp}°C`;

  if (weather.precipitation === 'rain') desc += ' / 비';
  else if (weather.precipitation === 'snow') desc += ' / 눈';
  else if (weather.sky === 'clear') desc += ' / 맑음';
  else if (weather.sky === 'cloudy') desc += ' / 구름';
  else desc += ' / 흐림';

  return desc;
}

function generateReason(menu: Menu, input: RecommendInput): string {
  const { weather, timeSlot, situation } = input;
  const reasons: string[] = [];

  // 날씨 기반 이유
  if (weather.temperature >= 28 && menu.isCold) {
    reasons.push('더운 날 시원하게');
  } else if (weather.temperature >= 28 && menu.weather.hot) {
    reasons.push('더위에 딱');
  } else if (weather.temperature <= 10 && menu.hasSoup) {
    reasons.push('추운 날 따끈하게');
  } else if (weather.temperature <= 10 && menu.weather.cold) {
    reasons.push('추위를 녹여줄');
  }

  if (weather.precipitation !== 'none' && menu.hasSoup) {
    reasons.push('비 오는 날 국물 한 그릇');
  } else if (weather.precipitation !== 'none' && menu.weather.rainy) {
    reasons.push('비 오는 날 생각나는');
  }

  // 시간 기반 이유
  if (timeSlot === '아침' && menu.cookTime === 'fast') {
    reasons.push('아침에 가볍게');
  } else if (timeSlot === '야식' && menu.fullness !== 'heavy') {
    reasons.push('야식으로 부담 없이');
  } else if (timeSlot === '점심' && menu.cookTime === 'fast') {
    reasons.push('점심시간에 빠르게');
  }

  // 상황 기반 이유
  if (situation === '혼밥' && menu.situations.includes('혼밥')) {
    reasons.push('혼밥하기 좋은');
  } else if (situation === '다이어트' && menu.calories === 'low') {
    reasons.push('칼로리 걱정 없이');
  } else if (situation === '든든' && menu.fullness === 'heavy') {
    reasons.push('든든하게 한 끼');
  } else if (situation === '간단' && menu.cookTime === 'fast') {
    reasons.push('간단하게 해결');
  } else if (situation === '가족' && menu.situations.includes('가족')) {
    reasons.push('온 가족이 좋아하는');
  } else if (situation === '회식' && menu.situations.includes('회식')) {
    reasons.push('회식 메뉴로 딱');
  } else if (situation === '데이트' && menu.situations.includes('데이트')) {
    reasons.push('분위기 있게');
  }

  // 기본 이유
  if (reasons.length === 0) {
    if (menu.hasSoup) reasons.push('국물이 끝내주는');
    else if (menu.isSpicy) reasons.push('매콤하게 입맛 돋우기');
    else if (menu.calories === 'low') reasons.push('가볍게 즐기기');
    else reasons.push('언제 먹어도 맛있는');
  }

  return reasons.slice(0, 2).join(', ');
}

export function recommendMenus(input: RecommendInput, count: number = 7): RecommendedMenu[] {
  const { weather, timeSlot, situation } = input;
  const scoredMenus: RecommendedMenu[] = [];

  for (const menu of MENUS) {
    let score = 0;

    // 시간대 필터 (필수)
    if (!menu.timeSlots.includes(timeSlot)) {
      continue;
    }

    // 상황 매칭
    if (menu.situations.includes(situation)) {
      score += 30;
    }

    // 날씨 기반 점수
    const temp = weather.temperature;
    const isHot = temp >= 28;
    const isCold = temp <= 10;
    const isRainy = weather.precipitation !== 'none';

    // 더운 날
    if (isHot) {
      if (menu.isCold) score += 40;
      if (menu.weather.hot) score += 35;
      if (menu.hasSoup && !menu.isCold) score -= 20;
      if (menu.fullness === 'heavy') score -= 10;
    }

    // 추운 날
    if (isCold) {
      if (menu.hasSoup) score += 35;
      if (menu.weather.cold) score += 30;
      if (menu.isCold) score -= 30;
    }

    // 비/눈 오는 날
    if (isRainy) {
      if (menu.hasSoup) score += 25;
      if (menu.weather.rainy) score += 30;
      if (menu.isSpicy) score += 15;
    }

    // 상황별 점수
    switch (situation) {
      case '혼밥':
        if (menu.cookTime === 'fast') score += 15;
        break;
      case '다이어트':
        if (menu.calories === 'low') score += 40;
        if (menu.calories === 'high') score -= 30;
        if (menu.fullness === 'light') score += 20;
        break;
      case '든든':
        if (menu.fullness === 'heavy') score += 30;
        if (menu.calories === 'high') score += 15;
        break;
      case '간단':
        if (menu.cookTime === 'fast') score += 30;
        if (menu.fullness === 'light') score += 15;
        break;
      case '가족':
      case '회식':
        if (menu.fullness === 'heavy') score += 15;
        break;
      case '데이트':
        if (menu.category === '양식' || menu.category === '일식') score += 20;
        break;
    }

    // 시간대별 보너스
    if (timeSlot === '아침') {
      if (menu.fullness === 'light') score += 15;
      if (menu.cookTime === 'fast') score += 10;
    } else if (timeSlot === '야식') {
      if (menu.fullness === 'heavy') score -= 10;
      if (menu.tags.includes('야식')) score += 20;
    }

    // 약간의 랜덤성 추가
    score += Math.random() * 15;

    const reason = generateReason(menu, input);

    scoredMenus.push({
      ...menu,
      score,
      reason,
    });
  }

  // 점수순 정렬 후 상위 N개 반환
  return scoredMenus
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}
