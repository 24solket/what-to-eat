'use client';

import { useState, useEffect } from 'react';
import {
  WeatherData,
  RecommendedMenu,
  recommendMenus,
  getTimeSlot,
  getTimeSlotEmoji,
  getWeatherEmoji,
  getWeatherDescription,
} from './lib/recommend';
import { Menu, getMenuById, MENUS } from './data/menus';

const SITUATIONS = [
  { id: '혼밥', emoji: '🧑', label: '혼밥' },
  { id: '가족', emoji: '👨‍👩‍👧‍👦', label: '가족' },
  { id: '회식', emoji: '🍻', label: '회식' },
  { id: '데이트', emoji: '💕', label: '데이트' },
  { id: '다이어트', emoji: '🥗', label: '다이어트' },
  { id: '든든', emoji: '💪', label: '든든하게' },
  { id: '간단', emoji: '⚡', label: '간단히' },
];

interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  phone: string;
  distance: string;
  url: string;
}

interface PlacesResponse {
  hasApiKey: boolean;
  places: Place[];
  searchUrls?: {
    kakao: string;
    naver?: string;
  };
}

interface FavoriteMenu {
  id: string;
  addedAt: number;
}

export default function Home() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [timeSlot, setTimeSlot] = useState<'아침' | '점심' | '저녁' | '야식'>('점심');
  const [situation, setSituation] = useState('혼밥');
  const [recommendations, setRecommendations] = useState<RecommendedMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);

  // 맛집 관련 상태
  const [selectedMenu, setSelectedMenu] = useState<RecommendedMenu | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchUrls, setSearchUrls] = useState<{ kakao: string; naver?: string } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  // 즐겨찾기 관련 상태
  const [favorites, setFavorites] = useState<FavoriteMenu[]>([]);
  const [activeTab, setActiveTab] = useState<'recommend' | 'favorites'>('recommend');
  const [showFavoriteToast, setShowFavoriteToast] = useState<string | null>(null);

  // 배달앱 관련 상태
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryMenu, setDeliveryMenu] = useState<Menu | RecommendedMenu | null>(null);

  // 즐겨찾기 로드
  useEffect(() => {
    const saved = localStorage.getItem('menu-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  // 즐겨찾기 저장
  useEffect(() => {
    localStorage.setItem('menu-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    setTimeSlot(getTimeSlot());
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    // 현재 시간 기반 기본 날씨 설정 (정적 배포용)
    const month = new Date().getMonth() + 1;

    // 계절별 기본 온도 설정
    let temperature = 20;
    if (month >= 3 && month <= 5) temperature = 15;
    else if (month >= 6 && month <= 8) temperature = 28;
    else if (month >= 9 && month <= 11) temperature = 15;
    else temperature = 0;

    // 위치 정보 저장 (지도 검색용)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        () => {
          setUserLocation({ lat: 37.5665, lon: 126.978 });
        }
      );
    } else {
      setUserLocation({ lat: 37.5665, lon: 126.978 });
    }

    setWeather({
      temperature,
      sky: 'clear',
      precipitation: 'none',
      humidity: 50,
    });
    setLoading(false);
  };

  const handleRecommend = () => {
    if (!weather) return;

    setAnimateCards(false);
    setShowResults(false);
    setActiveTab('recommend');

    setTimeout(() => {
      const results = recommendMenus({ weather, timeSlot, situation }, 7);
      setRecommendations(results);
      setShowResults(true);
      setTimeout(() => setAnimateCards(true), 100);
    }, 300);
  };

  const handleFindPlaces = async (menu: Menu | RecommendedMenu) => {
    setSelectedMenu(menu as RecommendedMenu);
    setShowModal(true);
    setPlaces([]);

    // 정적 배포에서는 API를 사용할 수 없으므로 바로 지도 URL 제공
    const query = menu.name + ' 맛집';
    setSearchUrls({
      kakao: 'https://map.kakao.com/link/search/' + encodeURIComponent(query),
      naver: 'https://map.naver.com/v5/search/' + encodeURIComponent(query),
    });
    setPlacesLoading(false);
  };

  // 즐겨찾기 토글
  const toggleFavorite = (menuId: string, menuName: string) => {
    const isFavorite = favorites.some((f) => f.id === menuId);

    if (isFavorite) {
      setFavorites(favorites.filter((f) => f.id !== menuId));
      setShowFavoriteToast(`${menuName} 즐겨찾기 해제`);
    } else {
      setFavorites([...favorites, { id: menuId, addedAt: Date.now() }]);
      setShowFavoriteToast(`${menuName} 즐겨찾기 추가!`);
    }

    // 토스트 자동 숨김
    setTimeout(() => setShowFavoriteToast(null), 2000);
  };

  const isFavorite = (menuId: string) => {
    return favorites.some((f) => f.id === menuId);
  };

  // 배달앱 열기
  const openDeliveryModal = (menu: Menu | RecommendedMenu) => {
    setDeliveryMenu(menu);
    setShowDeliveryModal(true);
  };

  // 배달앱 URL 생성
  const getDeliveryUrls = (menuName: string) => {
    const query = encodeURIComponent(menuName);
    return {
      baemin: {
        name: '배달의민족',
        emoji: '🛵',
        color: 'bg-[#2AC1BC]',
        hoverColor: 'hover:bg-[#25a9a5]',
        // 배민 앱 딥링크 (앱 없으면 웹으로)
        appUrl: `baemin://search?query=${query}`,
        webUrl: `https://www.baemin.com/search?keyword=${query}`,
      },
      yogiyo: {
        name: '요기요',
        emoji: '🍔',
        color: 'bg-[#FA0050]',
        hoverColor: 'hover:bg-[#e00048]',
        webUrl: `https://www.yogiyo.co.kr/mobile/#/search/${query}`,
      },
      coupangeats: {
        name: '쿠팡이츠',
        emoji: '🚀',
        color: 'bg-[#5D35DC]',
        hoverColor: 'hover:bg-[#4f2dba]',
        webUrl: `https://www.coupangeats.com/search?keyword=${query}`,
      },
    };
  };

  // 즐겨찾기 메뉴 목록 가져오기
  const getFavoriteMenus = (): Menu[] => {
    return favorites
      .map((f) => getMenuById(f.id))
      .filter((m): m is Menu => m !== undefined)
      .sort((a, b) => {
        const aTime = favorites.find((f) => f.id === a.id)?.addedAt || 0;
        const bTime = favorites.find((f) => f.id === b.id)?.addedAt || 0;
        return bTime - aTime;
      });
  };

  const getCalorieIcon = (calories: string) => {
    switch (calories) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  const getFullnessIcon = (fullness: string) => {
    switch (fullness) {
      case 'light': return '🪶';
      case 'medium': return '🍽️';
      case 'heavy': return '🏋️';
      default: return '❓';
    }
  };

  const renderMenuCard = (menu: Menu | RecommendedMenu, idx: number, isRecommended: boolean = false) => {
    const reason = 'reason' in menu ? menu.reason : null;

    return (
      <div
        key={menu.id}
        className={`bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
          animateCards || !isRecommended ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: isRecommended ? `${idx * 100}ms` : '0ms' }}
      >
        {/* Card Header */}
        <div className={`p-4 text-white relative ${
          isRecommended && idx === 0
            ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500'
            : isRecommended && idx === 1
              ? 'bg-gradient-to-r from-purple-400 to-pink-500'
              : isRecommended && idx === 2
                ? 'bg-gradient-to-r from-blue-400 to-cyan-500'
                : 'bg-gradient-to-r from-gray-400 to-gray-500'
        }`}>
          {/* 즐겨찾기 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(menu.id, menu.name);
            }}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all transform hover:scale-110"
          >
            <span className={`text-2xl transition-transform ${isFavorite(menu.id) ? 'scale-110' : ''}`}>
              {isFavorite(menu.id) ? '❤️' : '🤍'}
            </span>
          </button>

          <div className="flex items-center justify-between pr-12">
            <span className="text-4xl">{menu.emoji}</span>
            {isRecommended && idx === 0 && <span className="text-2xl">👑</span>}
            {isRecommended && idx === 1 && <span className="text-xl">🥈</span>}
            {isRecommended && idx === 2 && <span className="text-xl">🥉</span>}
          </div>
          <h3 className="text-xl font-bold mt-2">{menu.name}</h3>
          <p className="text-sm opacity-90">{menu.category}</p>
        </div>

        {/* Card Body */}
        <div className="p-4">
          {/* Reason */}
          {reason && (
            <p className="text-gray-600 text-sm mb-3 italic">
              &quot;{reason}&quot;
            </p>
          )}

          {/* Icons */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <span title="칼로리">
              {getCalorieIcon(menu.calories)} {menu.calories === 'low' ? '저' : menu.calories === 'medium' ? '중' : '고'}칼로리
            </span>
            <span title="포만감">
              {getFullnessIcon(menu.fullness)} {menu.fullness === 'light' ? '가벼움' : menu.fullness === 'medium' ? '보통' : '든든'}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {menu.hasSoup && (
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">🍲 국물</span>
            )}
            {menu.isSpicy && (
              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">🌶️ 매콤</span>
            )}
            {menu.isCold && (
              <span className="px-2 py-1 bg-cyan-100 text-cyan-600 text-xs rounded-full">🧊 시원</span>
            )}
            {menu.cookTime === 'fast' && (
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">⚡ 빠름</span>
            )}
          </div>

          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            {/* 맛집 찾기 버튼 */}
            <button
              onClick={() => handleFindPlaces(menu)}
              className="flex-1 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-500 hover:to-emerald-600 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-1 text-sm"
            >
              <span>📍</span>
              맛집
            </button>
            {/* 배달 주문 버튼 */}
            <button
              onClick={() => openDeliveryModal(menu)}
              className="flex-1 py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-600 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-1 text-sm"
            >
              <span>🛵</span>
              배달
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* 토스트 알림 */}
      {showFavoriteToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <span>❤️</span>
            {showFavoriteToast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-10 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>🍜</div>
          <div className="absolute top-8 right-20 text-5xl animate-bounce" style={{ animationDelay: '0.2s' }}>🍕</div>
          <div className="absolute bottom-4 left-1/4 text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>🍔</div>
          <div className="absolute bottom-6 right-1/3 text-5xl animate-bounce" style={{ animationDelay: '0.6s' }}>🍣</div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-2 drop-shadow-lg">
            오늘 뭐 먹지? 🤔
          </h1>
          <p className="text-lg opacity-90">
            날씨와 상황에 딱 맞는 메뉴 추천
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Weather & Time Info */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 transform hover:scale-[1.01] transition-transform">
          <div className="flex flex-wrap items-center justify-center gap-6 text-lg">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
                <span className="text-gray-500">날씨 정보 불러오는 중...</span>
              </div>
            ) : weather && (
              <>
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                  <span className="text-2xl">{getWeatherEmoji(weather)}</span>
                  <span className="font-semibold text-gray-700">{getWeatherDescription(weather)}</span>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
                  <span className="text-2xl">{getTimeSlotEmoji(timeSlot)}</span>
                  <span className="font-semibold text-gray-700">{timeSlot} 시간</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Situation Selector */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            오늘 상황은? 🎯
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {SITUATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSituation(s.id)}
                className={`px-5 py-3 rounded-2xl font-semibold text-base transition-all transform hover:scale-105 ${
                  situation === s.id
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recommend Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleRecommend}
            disabled={loading}
            className="group relative px-12 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white text-xl font-bold rounded-full shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              <span className="text-2xl group-hover:animate-spin">🎰</span>
              메뉴 추천받기!
              <span className="text-2xl group-hover:animate-bounce">🍽️</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {/* 탭 메뉴 */}
        {(showResults || favorites.length > 0) && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab('recommend')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === 'recommend'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">✨</span>
              추천 메뉴
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'favorites'
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>❤️</span>
              즐겨찾기
              {favorites.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-sm ${
                  activeTab === 'favorites' ? 'bg-white/20' : 'bg-pink-100 text-pink-600'
                }`}>
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* 추천 결과 탭 */}
        {activeTab === 'recommend' && showResults && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              <span className="mr-2">✨</span>
              오늘의 추천 메뉴
              <span className="ml-2">✨</span>
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((menu, idx) => renderMenuCard(menu, idx, true))}
            </div>

            {/* Refresh Button */}
            <div className="text-center mt-8">
              <button
                onClick={handleRecommend}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-all"
              >
                <span className="mr-2">🔄</span>
                다시 추천받기
              </button>
            </div>
          </div>
        )}

        {/* 즐겨찾기 탭 */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              <span className="mr-2">❤️</span>
              내 즐겨찾기
              <span className="ml-2">❤️</span>
            </h2>

            {favorites.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getFavoriteMenus().map((menu, idx) => renderMenuCard(menu, idx, false))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💔</div>
                <p className="text-xl text-gray-500 mb-2">아직 즐겨찾기한 메뉴가 없어요</p>
                <p className="text-gray-400">추천 받은 메뉴에서 ❤️를 눌러 추가해보세요!</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!showResults && activeTab === 'recommend' && !loading && (
          <div className="text-center py-12">
            <div className="text-8xl mb-4 animate-pulse">🍴</div>
            <p className="text-xl text-gray-500">
              상황을 선택하고 추천받기 버튼을 눌러보세요!
            </p>
          </div>
        )}
      </main>

      {/* 맛집 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <span>{selectedMenu?.emoji}</span>
                    {selectedMenu?.name} 맛집
                  </h3>
                  <p className="text-green-100 text-sm mt-1">주변 맛집을 찾아보세요</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 모달 바디 */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {placesLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
                  <p className="text-gray-500">맛집 검색 중...</p>
                </div>
              ) : places.length > 0 ? (
                <div className="space-y-4">
                  {places.map((place) => (
                    <a
                      key={place.id}
                      href={place.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">{place.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{place.roadAddress || place.address}</p>
                          {place.phone && (
                            <p className="text-sm text-gray-400 mt-1">📞 {place.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                            {parseInt(place.distance) >= 1000
                              ? `${(parseInt(place.distance) / 1000).toFixed(1)}km`
                              : `${place.distance}m`}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : searchUrls ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-gray-600 mb-6">
                    지도에서 <strong>{selectedMenu?.name}</strong> 맛집을 검색해보세요!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href={searchUrls.kakao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🗺️</span>
                      카카오맵에서 검색
                    </a>
                    {searchUrls.naver && (
                      <a
                        href={searchUrls.naver}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🗺️</span>
                        네이버지도에서 검색
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">검색 결과가 없습니다.</p>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            {!placesLoading && searchUrls && (
              <div className="border-t p-4 bg-gray-50">
                <p className="text-center text-sm text-gray-400">
                  💡 카카오 API 키를 등록하면 여기서 바로 맛집 목록을 볼 수 있어요
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 배달앱 모달 */}
      {showDeliveryModal && deliveryMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeliveryModal(false)}>
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-orange-400 to-red-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <span>{deliveryMenu.emoji}</span>
                    {deliveryMenu.name} 배달
                  </h3>
                  <p className="text-orange-100 text-sm mt-1">배달앱에서 주문하세요</p>
                </div>
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 배달앱 목록 */}
            <div className="p-6 space-y-3">
              {Object.entries(getDeliveryUrls(deliveryMenu.name)).map(([key, app]) => (
                <a
                  key={key}
                  href={app.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full p-4 ${app.color} ${app.hoverColor} text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{app.emoji}</span>
                      <div>
                        <p className="text-lg">{app.name}</p>
                        <p className="text-sm opacity-80">에서 주문하기</p>
                      </div>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </a>
              ))}

              {/* 안내 문구 */}
              <p className="text-center text-sm text-gray-400 mt-4">
                💡 선택한 앱에서 &quot;{deliveryMenu.name}&quot; 검색 결과가 열립니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-gray-400 text-sm">
        <p>기상청 Open API 연동 | 규칙 기반 추천 시스템</p>
      </footer>
    </div>
  );
}
