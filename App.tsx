
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MapPin, Calendar, Clock, Loader2, Sparkles,
  Navigation, ChevronRight, Globe, Compass, List, Map as MapIcon,
  ChevronLeft, MessageSquare, X, RefreshCw, ExternalLink, Link as LinkIcon,
  Camera, Languages, BookOpen, Info, Lightbulb, Camera as CameraIcon
} from 'lucide-react';
import { TripPlan, Coordinates, Activity } from './types';
import { generateTripPlan, updateTripPlan, translateTripPlan, generatePlaceImage } from './geminiService';
import MapView from './components/MapView';
import IconRenderer from './components/IconRenderer';

const LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: '繁體中文', value: 'Traditional Chinese' },
  { label: '日本語', value: 'Japanese' },
  { label: '한국어', value: 'Korean' },
  { label: 'Français', value: 'French' },
  { label: 'Español', value: 'Spanish' },
];

const App: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [viewMode, setViewMode] = useState<'schedule' | 'map'>('schedule');
  const [showChat, setShowChat] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);

  // High-Performance Destination Modal
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const fetchingRefs = useRef<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.error("Error getting user location:", error)
      );
    }
  }, []);

  // Background Prefetcher: Fetches images for current day as soon as the day is selected
  const prefetchImages = useCallback(async (currentTrip: TripPlan, day: number) => {
    const currentDay = currentTrip.itinerary.find(d => d.day === day);
    if (!currentDay) return;

    for (const activity of (currentDay.activities || [])) {
      if (!imageCache[activity.place] && !fetchingRefs.current.has(activity.place)) {
        fetchingRefs.current.add(activity.place);
        try {
          const url = await generatePlaceImage(activity.place, currentTrip.destination);
          if (url) {
            setImageCache(prev => ({ ...prev, [activity.place]: url }));
          }
        } catch (e) {
          console.warn("Failed pre-fetching image for", activity.place);
        } finally {
          fetchingRefs.current.delete(activity.place);
        }
      }
    }
  }, [imageCache]);

  useEffect(() => {
    if (trip) {
      prefetchImages(trip, selectedDay);
    }
  }, [trip, selectedDay, prefetchImages]);

  useEffect(() => {
    if (trip) {
      const performTranslation = async () => {
        if (isTranslating) return;
        setIsTranslating(true);
        try {
          const translatedTrip = await translateTripPlan(trip, selectedLanguage);
          setTrip(translatedTrip);
        } catch (err) {
          setError("Translation took too long. Using original text.");
        } finally {
          setIsTranslating(false);
        }
      };
      performTranslation();
    }
  }, [selectedLanguage]);

  const handleIconClick = async (activity: Activity) => {
    setActiveActivity(activity);
    if (!imageCache[activity.place]) {
      setIsGeneratingImage(true);
      try {
        const url = await generatePlaceImage(activity.place, trip?.destination || "");
        if (url) {
          setImageCache(prev => ({ ...prev, [activity.place]: url }));
        }
      } catch (err) {
        console.error("Manual image load failed");
      } finally {
        setIsGeneratingImage(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage({ data: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlanTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() && !selectedImage) return;
    setIsLoading(true);
    setError(null);
    setImageCache({});
    fetchingRefs.current.clear();
    try {
      const plan = await generateTripPlan(userInput, userLocation, selectedLanguage, selectedImage || undefined);
      setTrip(plan);
      setSelectedDay(1);
      setViewMode('schedule');
      setSelectedImage(null);
      setUserInput('');
    } catch (err: any) {
      console.error("Trip generation error:", err);
      let errorMessage = "Failed to create the itinerary. Try being more specific with your link or request.";

      const errString = err.toString().toLowerCase();
      if (errString.includes('quota') || errString.includes('429') || errString.includes('resource exhausted')) {
        errorMessage = "Google Gemini API Quota Exceeded. Please check your API usage limits.";
      } else if (errString.includes('403')) {
        const key = import.meta.env.VITE_GEMINI_API_KEY;
        const keyDebug = key ? `(Key: ${key.substring(0, 4)}... Length: ${key.length})` : "(Key Missing)";
        errorMessage = `Access Denied (403). ${keyDebug}. Check: 1. Enabled 'Generative Language API'? 2. Billing? 3. Correct Project?`;
      } else if (errString.includes('api key')) {
        errorMessage = "Invalid Google Gemini API Key. Please check your .env file.";
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedImage) || !trip) return;
    setIsUpdating(true);
    try {
      const updated = await updateTripPlan(trip, chatInput, selectedLanguage, selectedImage || undefined);
      setTrip(updated);
      setChatInput('');
      setSelectedImage(null);
    } catch (err: any) {
      setError("Failed to update the guide.");
    } finally {
      setIsUpdating(false);
    }
  };

  const currentDayData = trip?.itinerary.find(d => d.day === selectedDay);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Destination Spotlight Modal */}
      {activeActivity && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[4000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300 border border-slate-200">
            <button onClick={() => setActiveActivity(null)} className="absolute top-6 right-6 z-[4010] bg-black/40 hover:bg-black/60 p-4 rounded-full text-white transition-all backdrop-blur">
              <X size={24} />
            </button>

            <div className="w-full md:w-1/2 h-[350px] md:h-auto bg-slate-900 relative overflow-hidden">
              {isGeneratingImage && !imageCache[activeActivity.place] ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                  <Loader2 className="animate-spin text-blue-500" size={48} />
                  <p className="font-black text-xs uppercase tracking-[0.2em] animate-pulse">Rendering Guide Imagery...</p>
                </div>
              ) : imageCache[activeActivity.place] ? (
                <img src={imageCache[activeActivity.place]} alt={activeActivity.place} className="w-full h-full object-cover animate-in fade-in duration-700" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-white p-12 text-center">
                  <p className="font-bold text-slate-400">Our guide is retrieving deep insights for {activeActivity.place}...</p>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-12">
                <h3 className="text-4xl font-black text-white leading-tight mb-2 tracking-tight">{activeActivity.place}</h3>
                <div className="flex items-center gap-3 text-blue-300 font-bold uppercase text-[10px] tracking-widest">
                  <MapPin size={16} /> GPS: {activeActivity.coordinates.lat.toFixed(4)}, {activeActivity.coordinates.lng.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-10 md:p-16 overflow-y-auto max-h-[50vh] md:max-h-[90vh] bg-white text-slate-900">
              <div className="space-y-12">
                <section>
                  <div className="flex items-center gap-4 mb-4 text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">
                    <BookOpen size={20} /> Historical Perspective
                  </div>
                  <p className="text-slate-700 text-xl leading-relaxed font-medium">
                    {activeActivity.tour_guide_info.history}
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-4 mb-4 text-orange-500 font-black uppercase tracking-[0.2em] text-[10px]">
                    <Lightbulb size={20} /> Guide's Fun Facts
                  </div>
                  <ul className="space-y-4">
                    {activeActivity.tour_guide_info.fun_facts.map((fact, i) => (
                      <li key={i} className="flex gap-4 text-slate-800 font-bold items-start leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-blue-500 mt-1 flex-shrink-0">✦</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="bg-green-50 rounded-3xl p-8 border border-green-100 shadow-sm">
                    <h4 className="flex items-center gap-2 text-green-700 font-black uppercase tracking-widest text-[10px] mb-3">
                      <Info size={16} /> Local Expert Tip
                    </h4>
                    <p className="text-green-900 font-bold text-sm leading-relaxed">{activeActivity.tour_guide_info.local_tip}</p>
                  </div>
                  <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100 shadow-sm">
                    <h4 className="flex items-center gap-2 text-blue-700 font-black uppercase tracking-widest text-[10px] mb-3">
                      <Clock size={16} /> Best Visit Time
                    </h4>
                    <p className="text-blue-900 font-bold text-sm leading-relaxed">{activeActivity.tour_guide_info.best_time_to_visit}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTrip(null)}>
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
            <Compass size={24} />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent tracking-tighter">VoyageAI</h1>
        </div>

        {trip && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
            <button onClick={() => setViewMode('schedule')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${viewMode === 'schedule' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={18} className="inline mr-2" /> List View
            </button>
            <button onClick={() => setViewMode('map')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${viewMode === 'map' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <MapIcon size={18} className="inline mr-2" /> Live Map
            </button>
          </div>
        )}

        <div className="flex items-center gap-5">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white transition-all text-slate-800 font-black text-sm">
              {isTranslating ? <Loader2 className="animate-spin text-blue-500" size={18} /> : <Languages size={18} className="text-blue-500" />}
              <span className="hidden md:inline">{selectedLanguage}</span>
            </button>
            <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[1001] p-2">
              {LANGUAGES.map((lang) => (
                <button key={lang.value} onClick={() => setSelectedLanguage(lang.value)} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all ${selectedLanguage === lang.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setTrip(null); setUserInput(''); }} className="text-slate-400 hover:text-slate-600 p-2" title="New Guide"><RefreshCw size={20} /></button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-slate-50">
        {isTranslating && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-lg z-[2500] flex flex-col items-center justify-center">
            <div className="bg-white p-14 rounded-[3rem] shadow-2xl flex flex-col items-center gap-8 border border-slate-100 animate-in zoom-in-95">
              <Loader2 className="animate-spin text-blue-600" size={72} />
              <div className="text-center">
                <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Syncing Itinerary Data</h3>
                <p className="text-slate-500 font-bold text-lg">Updating details for {selectedLanguage}...</p>
              </div>
            </div>
          </div>
        )}

        {!trip && (
          <div className="flex-1 h-full flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
            <div className="max-w-3xl w-full space-y-12 py-12">
              <div className="text-center">
                <div className="inline-block p-6 bg-white text-blue-600 rounded-[2.5rem] mb-8 shadow-2xl shadow-blue-100 border border-blue-50">
                  <Sparkles size={56} />
                </div>
                <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter leading-none">The Only <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">Accurate</span> <br />AI Tour Guide.</h2>
                <p className="text-slate-500 text-xl font-medium max-w-xl mx-auto leading-relaxed">Paste your travel link or flyer photo. We mirror the exact schedule and add historical depth instantly.</p>
              </div>
              <form onSubmit={handlePlanTrip} className="relative group">
                <div className="bg-white border-2 border-slate-200 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden focus-within:border-blue-500 focus-within:ring-[12px] focus-within:ring-blue-50 transition-all duration-500">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Paste your tour link (e.g. TripAdvisor, Travel Agency) or describe a dream trip..."
                    className="w-full px-12 py-10 h-48 text-2xl outline-none text-slate-900 bg-white placeholder:text-slate-300 font-bold resize-none leading-relaxed"
                  />
                  {selectedImage && (
                    <div className="px-12 pb-8">
                      <div className="relative inline-block group/img">
                        <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-48 h-48 object-cover rounded-[2rem] border-4 border-blue-500 shadow-2xl" />
                        <button type="button" onClick={() => setSelectedImage(null)} className="absolute -top-4 -right-4 bg-red-600 text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"><X size={20} /></button>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50 px-10 py-6 flex items-center justify-between border-t border-slate-100">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                      <Camera size={24} className="text-blue-500" /> <span>Snap Flyer</span>
                    </button>
                    <button type="submit" disabled={isLoading || (!userInput.trim() && !selectedImage)} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-12 py-5 rounded-[2rem] flex items-center gap-4 transition-all font-black shadow-xl shadow-blue-200 hover:translate-y-[-2px] active:translate-y-[1px]">
                      {isLoading ? <Loader2 className="animate-spin" size={28} /> : <>Generate Guide <ChevronRight size={24} /></>}
                    </button>
                  </div>
                </div>
                {error && <p className="mt-6 text-center text-red-600 font-black bg-red-50 py-4 rounded-2xl border border-red-100">{error}</p>}
              </form>
            </div>
          </div>
        )}

        {trip && (
          <div className="h-full flex flex-col relative bg-slate-50">
            {/* Day Bar */}
            <div className="bg-white px-8 py-5 border-b border-slate-200 overflow-x-auto scrollbar-hide flex gap-4 items-center sticky top-0 z-30">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mr-6 whitespace-nowrap">Plan Chronology</span>
              {trip.itinerary.map((day) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(day.day)}
                  className={`flex-shrink-0 px-7 py-3 rounded-2xl font-black text-sm transition-all border ${selectedDay === day.day ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}
                >
                  Day {day.day}
                </button>
              ))}
            </div>

            <div className="flex-1 relative overflow-hidden">
              {viewMode === 'schedule' && (
                <div className="h-full overflow-y-auto p-8 md:p-12">
                  <div className="max-w-5xl mx-auto space-y-10 pb-40">
                    <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-16 text-slate-100 pointer-events-none transition-transform group-hover:scale-105 duration-1000"><Globe size={280} /></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 text-blue-600 text-[11px] font-black uppercase tracking-[0.4em] mb-6">
                          <Calendar size={18} /> {currentDayData?.date_description}
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tighter leading-none">Day {selectedDay} Itinerary</h2>
                        <p className="text-slate-500 text-2xl font-medium leading-relaxed max-w-3xl border-l-8 border-blue-100 pl-10 py-3 italic">
                          "{currentDayData?.daily_summary}"
                        </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {currentDayData?.activities?.map((activity, idx) => (
                        <div key={idx} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 hover:shadow-2xl hover:border-blue-100 transition-all flex flex-col md:flex-row gap-10 group">
                          <div className="flex-shrink-0 flex md:flex-col items-center justify-center gap-4 md:border-r md:border-slate-100 md:pr-12">
                            <button
                              onClick={() => handleIconClick(activity)}
                              className={`p-7 rounded-[2.5rem] transition-all transform group-hover:scale-110 shadow-xl border-4 relative ${imageCache[activity.place] ? 'bg-blue-600 text-white border-blue-400 shadow-blue-200' : 'bg-white text-blue-600 border-blue-50 shadow-blue-50'}`}
                            >
                              <IconRenderer name={activity.icon} size={40} />
                              {imageCache[activity.place] && <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1.5 rounded-full border-4 border-white animate-pulse"><Sparkles size={12} /></div>}
                            </button>
                            <span className="text-2xl font-black text-slate-300 group-hover:text-blue-600 transition-colors tracking-tight">{activity.time}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-5">
                              <h4 onClick={() => handleIconClick(activity)} className="text-3xl font-black text-slate-900 tracking-tight leading-tight cursor-pointer hover:text-blue-600 transition-all underline decoration-transparent hover:decoration-blue-200 underline-offset-[12px]">
                                {activity.place}
                              </h4>
                              <button onClick={() => setViewMode('map')} className="text-slate-400 hover:text-blue-600 p-3 hover:bg-blue-50 rounded-2xl transition-all">
                                <Navigation size={26} />
                              </button>
                            </div>
                            <p className="text-slate-600 text-xl leading-relaxed mb-8 font-medium">{activity.description}</p>
                            <div className="flex flex-wrap gap-4">
                              <button onClick={() => handleIconClick(activity)} className="flex items-center gap-3 text-sm font-black text-blue-600 bg-blue-50 border-2 border-blue-100 px-8 py-4 rounded-full hover:bg-blue-600 hover:text-white transition-all uppercase tracking-[0.2em] shadow-lg shadow-blue-50">
                                <BookOpen size={18} /> {imageCache[activity.place] ? 'View Tour Insights' : 'Retrieving Insights...'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'map' && (
                <div className="h-full w-full p-6 md:p-10">
                  <div className="h-full w-full bg-white rounded-[4rem] shadow-2xl border border-slate-200 overflow-hidden relative">
                    <MapView trip={trip} selectedDay={selectedDay} userLocation={userLocation} />
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] px-12 py-6 z-[1000] border border-slate-200 flex items-center gap-12">
                      <button disabled={selectedDay === 1} onClick={() => setSelectedDay(prev => prev - 1)} className="p-5 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all hover:bg-slate-50 rounded-full"><ChevronLeft size={36} /></button>
                      <div className="text-center min-w-[160px] border-x-2 border-slate-100 px-10">
                        <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">Selected Day</p>
                        <p className="text-5xl font-black text-slate-900 leading-none tracking-tighter">{selectedDay}</p>
                      </div>
                      <button disabled={selectedDay === trip.itinerary.length} onClick={() => setSelectedDay(prev => prev + 1)} className="p-5 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all hover:bg-slate-50 rounded-full"><ChevronRight size={36} /></button>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Adjustment Overlay - Explicit Theme Overrides */}
              <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-[1100] transition-all duration-700 transform ${showChat ? 'translate-y-0 opacity-100' : 'translate-y-48 opacity-0'}`}>
                <div className="!bg-white rounded-[3rem] border-2 border-slate-200 p-2.5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] ring-2 ring-white/50">
                  {selectedImage && (
                    <div className="!bg-slate-50 px-8 py-5 flex items-center gap-6 border-b border-slate-100 mb-2 rounded-t-[2.5rem]">
                      <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-20 h-20 rounded-[1.5rem] object-cover border-4 border-white shadow-xl" />
                      <div className="flex-1">
                        <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">Visual Insight</p>
                        <p className="text-md font-bold text-slate-600">Syncing updates from visual material...</p>
                      </div>
                      <button onClick={() => setSelectedImage(null)} className="p-3 text-slate-300 hover:text-red-500 transition-all hover:rotate-90"><X size={28} /></button>
                    </div>
                  )}
                  <form onSubmit={handleAdjustTrip} className="flex items-center gap-3 !bg-white rounded-[2.5rem]">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-6 text-slate-400 hover:text-blue-600 transition-colors" title="Reference Image">
                      <Camera size={32} />
                    </button>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Modify the tour, add stops, or ask for facts..."
                      className="flex-1 !bg-white border-none rounded-[2rem] px-5 py-6 text-xl font-bold outline-none !text-slate-900 placeholder:text-slate-300"
                      onFocus={() => setShowChat(true)}
                    />
                    <button type="submit" disabled={isUpdating || (!chatInput.trim() && !selectedImage)} className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-[2.2rem] transition-all flex items-center justify-center shadow-2xl shadow-blue-400/30 disabled:bg-slate-200 disabled:shadow-none hover:scale-105 active:scale-95">
                      {isUpdating ? <Loader2 className="animate-spin" size={30} /> : <Send size={30} />}
                    </button>
                    <button type="button" onClick={() => setShowChat(false)} className="hidden lg:flex w-16 h-16 rounded-full text-slate-300 hover:bg-slate-50 items-center justify-center transition-all">
                      <X size={30} />
                    </button>
                  </form>
                </div>
              </div>

              {!showChat && (
                <button onClick={() => setShowChat(true)} className="fixed bottom-36 right-16 bg-blue-600 text-white p-8 rounded-full shadow-[0_20px_60px_-10px_rgba(59,130,246,0.6)] z-[1100] animate-bounce hover:scale-110 active:scale-95 transition-all"><MessageSquare size={40} /></button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
