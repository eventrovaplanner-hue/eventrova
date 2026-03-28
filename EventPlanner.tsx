
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CircleDollarSign,
  ClipboardList,
  PartyPopper,
  MapPin,
  Navigation,
  ExternalLink,
  MapPinIcon,
  AlertCircle,
  ShoppingBag,
  Check,
  Trophy
} from 'lucide-react';
import { PlannerState, EventType, Vendor, HostedEvent } from '../types';
import { SERVICES, EVENT_MULTIPLIERS } from '../constants';
import { Button } from './Button';
import { generateEventAdvice, searchVendors, checkApiHealth, testYelpConnection } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const EventPlanner: React.FC<{ 
  tokens: number; 
  onDeductTokens: (amount: number) => void;
  onAddTokens: (amount: number) => void;
  onEventStarted: (event: Omit<HostedEvent, 'id' | 'date'>) => void;
}> = ({ tokens, onDeductTokens, onAddTokens, onEventStarted }) => {
  const [apiStatus, setApiStatus] = useState<{ status: string; message?: string; details?: any } | null>(null);

  React.useEffect(() => {
    checkApiHealth().then(data => {
      console.log("[Backend Health]", data);
    });
    
    testYelpConnection().then(data => {
      setApiStatus(data);
    });
  }, []);

  const [state, setState] = useState<PlannerState>({
    step: 1,
    eventType: EventType.PARTY,
    guestCount: 50,
    budget: 0,
    selectedServices: [],
    vibe: '',
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [liveSearchingService, setLiveSearchingService] = useState<string | null>(null);
  const [liveVendors, setLiveVendors] = useState<Record<string, Vendor[]>>({});
  const [liveVendorErrors, setLiveVendorErrors] = useState<Record<string, string>>({});

  const calculateTotal = useMemo(() => {
    let total = 0;
    const multiplier = EVENT_MULTIPLIERS[state.eventType];

    state.selectedServices.forEach(serviceId => {
      const service = SERVICES.find(s => s.id === serviceId);
      if (service) {
        if (service.id === 'catering' || service.id === 'bar') {
          total += service.basePrice * state.guestCount;
        } else {
          total += service.basePrice;
        }
      }
    });

    return Math.round(total * multiplier);
  }, [state]);

  const budgetData = useMemo(() => {
    return [
      { name: 'Estimated Cost', amount: calculateTotal },
      { name: 'Target Budget', amount: state.budget },
    ];
  }, [calculateTotal, state.budget]);

  const handleNext = async () => {
    if (state.step === 3) {
      if (tokens < 5) {
        // We'll show the inline notification instead of a generic alert
        const plannerElement = document.getElementById('planner');
        if (plannerElement) {
          plannerElement.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
      
      setAiLoading(true);
      try {
        const results = await Promise.allSettled([
          generateEventAdvice(state),
          searchVendors(state)
        ]);
        
        const advice = results[0].status === 'fulfilled' ? results[0].value : {
          checklist: ["Book Venue", "Finalize Guest List", "Arrange Catering", "Coordinate Vendors"],
          suggestions: "Keep it elegant and focus on guest experience."
        };
        
        const vendorResult = results[1].status === 'fulfilled' ? results[1].value : { vendors: [], error: "Search service unavailable" };
        
        onDeductTokens(5);
        
        setState(prev => ({ 
          ...prev, 
          aiChecklist: advice.checklist, 
          aiSuggestions: advice.suggestions,
          vendors: vendorResult.vendors,
          vendorError: vendorResult.error,
          step: prev.step + 1 
        }));
      } catch (error) {
        console.error("Failed to generate plan:", error);
        setState(prev => ({ ...prev, step: prev.step + 1 }));
      } finally {
        setAiLoading(false);
      }
    } else {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handleGetLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            postalCode: undefined // Clear postal code if using GPS
          }));
          setLocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocating(false);
          alert("Could not get your location. Please enter a postal code manually.");
        }
      );
    } else {
      setLocating(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const toggleService = async (id: string) => {
    const isSelecting = !state.selectedServices.includes(id);
    
    setState(prev => ({
      ...prev,
      selectedServices: isSelecting
        ? [...prev.selectedServices, id]
        : prev.selectedServices.filter(s => s !== id)
    }));

    // If selecting and we have location, do a quick live search
    if (isSelecting && (state.location || state.postalCode)) {
      setLiveSearchingService(id);
      setLiveVendorErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        const result = await searchVendors(state, id);
        if (result.error) {
          setLiveVendorErrors(prev => ({ ...prev, [id]: result.error! }));
        }
        setLiveVendors(prev => ({ ...prev, [id]: result.vendors }));
      } catch (error: any) {
        console.error("Live search failed:", error);
        setLiveVendorErrors(prev => ({ ...prev, [id]: error.message || "Search failed" }));
      } finally {
        setLiveSearchingService(null);
      }
    }
  };

  const toggleVendorSelection = (vendorId: string) => {
    setState(prev => ({
      ...prev,
      vendors: prev.vendors?.map(v => 
        v.id === vendorId ? { ...v, selected: !v.selected } : v
      )
    }));
  };

  const hasSelectedVendors = useMemo(() => {
    return state.vendors?.some(v => v.selected) || false;
  }, [state.vendors]);

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <PartyPopper className="text-gold" /> Let's start with the basics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.values(EventType).map(type => (
                <button
                  key={type}
                  onClick={() => setState(prev => ({ ...prev, eventType: type }))}
                  className={`p-4 rounded-xl border transition-all text-center ${state.eventType === type ? 'border-gold bg-gold/10 text-gold shadow-lg shadow-gold/20' : 'border-gray-800 bg-secondary/50 hover:border-gray-600'}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-400">Approximate Guest Count</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5"
                    max="500"
                    step="5"
                    value={state.guestCount}
                    onChange={(e) => setState(prev => ({ ...prev, guestCount: Number(e.target.value) }))}
                    className="flex-1 accent-gold"
                  />
                  <div className="bg-secondary px-4 py-2 rounded-lg border border-gray-700 min-w-[80px] text-center font-bold">
                    {state.guestCount}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-400">Estimated Budget ($)</label>
                <div className="relative group">
                  <CircleDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gold h-5 w-5 group-focus-within:scale-110 transition-transform" />
                  <input
                    type="number"
                    placeholder="Enter amount (e.g. 5000)"
                    value={state.budget || ''}
                    onChange={(e) => setState(prev => ({ ...prev, budget: e.target.value === '' ? 0 : Number(e.target.value) }))}
                    className="w-full bg-secondary border border-gray-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-gold transition-all text-lg font-bold placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-400">Event Location (Optional for finding local vendors)</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gold h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Enter Postal Code"
                    value={state.postalCode || ''}
                    onChange={(e) => setState(prev => ({ ...prev, postalCode: e.target.value, location: undefined }))}
                    className="w-full bg-secondary border border-gray-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-gold transition-all"
                  />
                </div>
                <button
                  onClick={handleGetLocation}
                  disabled={locating}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all ${state.location ? 'border-gold bg-gold/10 text-gold' : 'border-gray-800 bg-secondary hover:border-gray-500'}`}
                >
                  {locating ? (
                    <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Navigation className="h-5 w-5" />
                  )}
                  {state.location ? 'Location Set' : 'Use My Location'}
                </button>
              </div>
              {state.location && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Sparkles size={12} /> GPS coordinates captured for precise vendor matching.
                </p>
              )}
              
              {/* Debug Section */}
              <div className="pt-4 border-t border-gray-800/50">
                <button 
                  onClick={async () => {
                    const data = await testYelpConnection();
                    setApiStatus(data);
                  }}
                  className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-gold transition-colors flex items-center gap-2"
                >
                  <AlertCircle size={12} /> Test Backend Connection
                </button>
                {apiStatus && (
                  <pre className="mt-2 p-3 rounded-lg bg-black/50 border border-white/5 text-[9px] text-gray-400 overflow-x-auto">
                    {JSON.stringify(apiStatus, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="text-gold" /> What services do you need?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICES.map(service => (
                <div key={service.id} className="space-y-2">
                  <button
                    onClick={() => toggleService(service.id)}
                    className={`w-full p-4 rounded-xl border flex items-start gap-4 transition-all text-left ${state.selectedServices.includes(service.id) ? 'border-gold bg-gold/10' : 'border-gray-800 bg-secondary/50 hover:border-gray-600'}`}
                  >
                    <div className={`w-5 h-5 mt-1 rounded border flex items-center justify-center ${state.selectedServices.includes(service.id) ? 'bg-gold border-gold' : 'border-gray-600'}`}>
                      {state.selectedServices.includes(service.id) && <Check size={14} className="text-black" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-xs text-gray-400">{service.description}</p>
                    </div>
                  </button>
                  
                  {/* Live Search Results in Step 2 */}
                  <AnimatePresence>
                    {state.selectedServices.includes(service.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-9 pr-2 py-2 space-y-2">
                          {liveSearchingService === service.id ? (
                            <div className="flex items-center gap-2 text-xs text-gold animate-pulse">
                              <Navigation size={12} className="animate-spin" />
                              <span>Finding real-time {service.name.toLowerCase()} vendors...</span>
                            </div>
                          ) : liveVendorErrors[service.id] ? (
                            <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                              <AlertCircle size={10} />
                              <span>{liveVendorErrors[service.id]}</span>
                            </div>
                          ) : liveVendors[service.id] ? (
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Top Matches Nearby</p>
                              {Array.isArray(liveVendors[service.id]) && liveVendors[service.id].length > 0 ? (
                                liveVendors[service.id].slice(0, 2).map((v, idx) => (
                                  <div key={idx} className="bg-white/5 border border-white/5 rounded-lg p-2 flex justify-between items-center group">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-200 truncate">{v.name}</p>
                                      <p className="text-[10px] text-gray-500 truncate">{v.address}</p>
                                    </div>
                                    <a 
                                      href={v.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-md bg-gold/10 text-gold opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-gray-500 italic">No vendors found in this area.</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="text-gold" /> The final touch
            </h3>
            <div className="space-y-4 relative">
              {aiLoading && (
                <div className="absolute inset-0 z-10 bg-secondary/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-4" />
                  <p className="font-bold text-gold">Searching for local vendors...</p>
                  <p className="text-xs text-gray-400 mt-2">Our AI is scanning maps and directories for the best matches.</p>
                </div>
              )}
              <label className="block text-sm font-medium text-gray-400">Describe the vibe (Theme, colors, style...)</label>
              <textarea
                value={state.vibe}
                onChange={(e) => setState(prev => ({ ...prev, vibe: e.target.value }))}
                placeholder="e.g. Modern minimalist with rustic wood accents and warm lighting..."
                className="w-full h-48 bg-secondary border border-gray-700 rounded-xl p-4 focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-secondary border border-gray-800">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CircleDollarSign className="text-gold" /> Budget Analysis
                </h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#666" fontSize={12} width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333' }}
                        itemStyle={{ color: '#D4AF37' }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {budgetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? (entry.amount > state.budget ? '#ef4444' : '#10b981') : '#D4AF37'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between items-center text-sm">
                  <span className="text-gray-400">Estimated Total:</span>
                  <span className={`text-xl font-bold ${calculateTotal > state.budget ? 'text-red-500' : 'text-green-500'}`}>
                    ${calculateTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-secondary border border-gray-800">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                   Summary
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex justify-between border-b border-gray-800 pb-2">
                    <span>Event Type</span>
                    <span className="text-gold">{state.eventType}</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-800 pb-2">
                    <span>Guests</span>
                    <span className="text-gold">{state.guestCount}</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-800 pb-2">
                    <span>Services</span>
                    <span className="text-gold">{state.selectedServices.length} selected</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Location</span>
                    <span className="text-gold">{state.postalCode || (state.location ? 'GPS Set' : 'Global')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gold/5 border border-gold/20">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="text-gold" /> Smart Recommendations
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gold font-bold mb-2">Expert Advice</p>
                    <p className="text-sm text-gray-300 italic">"{state.aiSuggestions}"</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gold font-bold mb-2">AI-Generated Checklist</p>
                    <ul className="space-y-2">
                      {state.aiChecklist?.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {state.vendors && state.vendors.length > 0 && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-secondary border border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold flex items-center gap-2">
                        <MapPinIcon className="text-gold" /> Local Vendors Found
                      </h4>
                      <button 
                        onClick={async () => {
                          setAiLoading(true);
                          try {
                            const result = await searchVendors(state);
                            setState(prev => ({ 
                              ...prev, 
                              vendors: result.vendors,
                              vendorError: result.error 
                            }));
                          } catch (error) {
                            console.error("Refresh failed:", error);
                          } finally {
                            setAiLoading(false);
                          }
                        }}
                        className="text-[10px] font-bold text-gold uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Navigation size={10} /> Refresh Results
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {state.vendors.map((vendor, i) => {
                      const CardContent = (
                        <div className="flex gap-4">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleVendorSelection(vendor.id);
                            }}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all ${vendor.selected ? 'bg-gold border-gold text-black' : 'border-gray-700 text-gray-500 hover:border-gold'}`}
                          >
                            {vendor.selected ? <Check size={20} /> : <div className="w-2 h-2 rounded-full bg-gray-700" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col">
                                <h5 className="font-bold text-gold group-hover:text-white transition-colors">{vendor.name}</h5>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/20 font-bold uppercase tracking-wider">Real-time Match</span>
                                  <span className="text-[9px] text-gray-500 font-medium">{vendor.type}</span>
                                </div>
                              </div>
                              {vendor.url && (
                                <div className="flex items-center gap-1 text-[10px] text-gold font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span>Visit Website</span>
                                  <ExternalLink size={10} />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{vendor.address}</p>
                            <p className="text-xs text-gray-300 line-clamp-2">{vendor.description}</p>
                            {vendor.source_url && (
                              <a 
                                href={vendor.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 mt-2 text-[9px] text-gray-500 hover:text-gold transition-colors underline"
                              >
                                <span>Source Data</span>
                                <ExternalLink size={8} />
                              </a>
                            )}
                          </div>
                        </div>
                      );

                      const commonClasses = "block p-4 rounded-xl bg-white/5 border border-white/5 hover:border-gold/30 transition-all group text-left w-full cursor-pointer";

                      return (
                        <div 
                          key={vendor.id || i} 
                          className={commonClasses}
                          onClick={() => {
                            if (vendor.url) {
                              window.open(vendor.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                        >
                          {CardContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

              {state.step === 4 && (!state.vendors || state.vendors.length === 0) && (
                <div className="p-8 rounded-2xl bg-secondary border border-gray-800 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto">
                    <MapPinIcon className="text-gray-600" size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">No vendors found nearby</p>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">
                      {state.vendorError || "We couldn't find specific local vendors for this request. Try adjusting your location or vibe description."}
                    </p>
                    {state.vendorError?.includes("YELP_API_KEY") && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                        <p className="font-bold mb-1">Configuration Required</p>
                        <p>Please add your <strong>YELP_API_KEY</strong> in the AI Studio Settings to enable real-time vendor search.</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={async () => {
                      setAiLoading(true);
                      try {
                        const result = await searchVendors(state);
                        setState(prev => ({ 
                          ...prev, 
                          vendors: result.vendors,
                          vendorError: result.error 
                        }));
                      } catch (error) {
                        console.error("Retry failed:", error);
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    className="px-6 py-2 bg-gold/10 border border-gold/20 text-gold rounded-xl font-bold hover:bg-gold/20 transition-all flex items-center gap-2 mx-auto"
                  >
                    <Navigation size={16} /> Retry Search
                  </button>
                </div>
              )}
              
              <div className="space-y-4">
                <Button 
                  onClick={() => {
                    const selectedVendors = state.vendors?.filter(v => v.selected) || [];
                    onEventStarted({
                      eventType: state.eventType,
                      guestCount: state.guestCount,
                      budget: state.budget,
                      vibe: state.vibe,
                      selectedVendors
                    });
                    setState(prev => ({ ...prev, step: 5 }));
                  }} 
                  className="w-full h-14 text-lg"
                  disabled={!hasSelectedVendors}
                >
                  {hasSelectedVendors ? 'Start Event' : 'Select Vendors to Start'}
                </Button>
                <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest font-bold">
                  {hasSelectedVendors ? 'Ready to launch your event!' : 'Please select at least one vendor to proceed'}
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-8"
          >
            <div className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center mx-auto border border-gold/30 shadow-2xl shadow-gold/20">
              <Trophy className="text-gold w-12 h-12" />
            </div>
            <div>
              <h3 className="text-4xl font-bold mb-4">Event Started!</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Congratulations! Your {state.eventType} is now in motion. We've notified your selected vendors and your smart checklist is active.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="p-6 rounded-2xl bg-secondary border border-gray-800 text-left">
                <p className="text-xs font-bold text-gold uppercase mb-4">Selected Vendors</p>
                <ul className="space-y-3">
                  {(state.vendors?.filter(v => v.selected) || []).map((v, i) => (
                    <li key={v.id || i} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {v.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-secondary border border-gray-800 text-left">
                <p className="text-xs font-bold text-gold uppercase mb-4">Next Steps</p>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li>• Review vendor contracts</li>
                  <li>• Send out digital invites</li>
                  <li>• Finalize floor plan</li>
                </ul>
              </div>
            </div>

            <Button variant="outline" onClick={() => setState(prev => ({ ...prev, step: 1 }))}>
              Plan Another Event
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* API Status Indicator */}
      {apiStatus && apiStatus.status !== 'ok' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="font-bold">Yelp API Connection: {apiStatus.status === 'missing_key' ? 'API Key Missing' : 'Connection Error'}</span>
            </div>
            <button 
              onClick={async () => {
                const data = await testYelpConnection();
                setApiStatus(data);
              }}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors font-bold uppercase tracking-wider"
            >
              Retry Test
            </button>
          </div>
          {apiStatus.message && (
            <p className="opacity-80 italic pl-6">{apiStatus.message}</p>
          )}
          {apiStatus.details && (
            <div className="mt-1 p-2 bg-black/20 rounded border border-white/5 font-mono text-[10px] overflow-x-auto">
              {typeof apiStatus.details === 'string' ? apiStatus.details : JSON.stringify(apiStatus.details, null, 2)}
            </div>
          )}
        </div>
      )}

      {/* Progress Header */}
      <div className="mb-8 flex justify-between items-center">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              className={`h-1.5 w-12 rounded-full transition-all duration-500 ${state.step >= i ? 'bg-gold' : 'bg-gray-800'}`} 
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Step {state.step} of 5
        </span>
      </div>

      <div className="min-h-[400px]">
        {tokens < 5 && state.step === 3 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="font-bold text-red-500">Insufficient Tokens</p>
                <p className="text-xs text-gray-400">You need 5 tokens to generate a plan. You have {tokens}.</p>
              </div>
            </div>
            <button 
              onClick={() => onAddTokens(5)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
            >
              <ShoppingBag size={16} />
              Purchase 5 Tokens ($10)
            </button>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      <div className="mt-12 flex justify-between items-center pt-8 border-t border-gray-800">
        {state.step > 1 && state.step < 5 ? (
          <Button variant="outline" onClick={() => setState(prev => ({ ...prev, step: prev.step - 1 }))}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        ) : <div />}
        
        {state.step < 4 ? (
          <div className="flex flex-col items-end gap-2">
            <Button 
              loading={aiLoading} 
              onClick={handleNext}
              disabled={state.step === 2 && state.selectedServices.length === 0}
            >
              {state.step === 3 ? 'Generate Smart Plan' : 'Continue'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            {state.step === 2 && state.selectedServices.length === 0 && (
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">
                Select at least one service
              </p>
            )}
            {state.step === 3 && (
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Costs 5 Tokens
              </p>
            )}
          </div>
        ) : state.step === 4 ? (
          <div />
        ) : (
          <Button variant="outline" onClick={() => setState(prev => ({ ...prev, step: 1 }))}>
            Start Over
          </Button>
        )}
      </div>
    </div>
  );
};
