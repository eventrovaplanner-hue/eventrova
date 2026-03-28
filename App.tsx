
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sparkles, DollarSign, Zap, Github, Twitter, Linkedin, Lock, History, Calendar, Users as UsersIcon, Trophy, Download } from 'lucide-react';
import { EventPlanner } from './EventPlanner';
import { WaitlistForm } from './WaitlistForm';
import { PaymentModal } from './PaymentModal';
import { HostedEvent } from './types';
import * as XLSX from 'xlsx';

const features = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "5-Minute Planning",
    description: "Plan your entire event logistics in under 5 minutes. No manual coordination needed.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Smart Checklists",
    description: "AI-curated service checklists for every event type so nothing gets missed.",
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Instant Estimates",
    description: "Get real budget estimates based on local benchmarks before you commit.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "One-Click Booking",
    description: "Book vetted vendors directly through the app. Launching early 2025.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const App: React.FC = () => {
  const [accessUnlocked, setAccessUnlocked] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);
  const [plannerKey, setPlannerKey] = useState(0);
  const [currentView, setCurrentView] = useState<'home' | 'features' | 'planner'>('home');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const status = localStorage.getItem('eventrova_unlocked');
    const savedTokens = localStorage.getItem('eventrova_tokens');
    const savedEvents = localStorage.getItem('eventrova_history');
    
    if (status === 'true') {
      setAccessUnlocked(true);
      if (!savedTokens) {
        setTokens(5);
        localStorage.setItem('eventrova_tokens', '5');
      }
    }
    
    if (savedTokens) {
      setTokens(parseInt(savedTokens, 10));
    }

    if (savedEvents) {
      setHostedEvents(JSON.parse(savedEvents));
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, plannerKey]);

  const handleUnlock = () => {
    localStorage.setItem('eventrova_unlocked', 'true');
    
    setTokens(prev => {
      const newTokens = prev + 5;
      localStorage.setItem('eventrova_tokens', newTokens.toString());
      return newTokens;
    });
    
    setAccessUnlocked(true);
  };

  const deductTokens = (amount: number) => {
    setTokens(prev => {
      const newTokens = Math.max(0, prev - amount);
      localStorage.setItem('eventrova_tokens', newTokens.toString());
      return newTokens;
    });
  };

  const addTokens = (amount: number) => {
    setTokens(prev => {
      const newTokens = prev + amount;
      localStorage.setItem('eventrova_tokens', newTokens.toString());
      return newTokens;
    });
  };

  const handleEventStarted = (eventData: Omit<HostedEvent, 'id' | 'date'>) => {
    const newEvent: HostedEvent = {
      ...eventData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setHostedEvents(prev => {
      const updated = [newEvent, ...prev];
      localStorage.setItem('eventrova_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogoClick = () => {
    setPlannerKey(prev => prev + 1);
    setCurrentView('planner');
  };

  const goToPlanner = () => {
    setPlannerKey(prev => prev + 1);
    setCurrentView('planner');
  };

  const LogoIcon = () => (
    <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold">
      <path d="M50 75V90M40 90H60M50 75C65 75 75 60 75 40V15H25V40C25 60 35 75 50 75Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="35" y="25" width="30" height="25" rx="2" stroke="currentColor" strokeWidth="2"/>
      <line x1="35" y1="33" x2="65" y2="33" stroke="currentColor" strokeWidth="2"/>
      <line x1="45" y1="33" x2="45" y2="50" stroke="currentColor" strokeWidth="2"/>
      <line x1="55" y1="33" x2="55" y2="50" stroke="currentColor" strokeWidth="2"/>
      <circle cx="40" cy="40" r="1" fill="currentColor"/>
      <circle cx="50" cy="40" r="1" fill="currentColor"/>
      <circle cx="60" cy="40" r="1" fill="currentColor"/>
      <circle cx="40" cy="45" r="1" fill="currentColor"/>
      <circle cx="50" cy="45" r="1" fill="currentColor"/>
      <circle cx="60" cy="45" r="1" fill="currentColor"/>
    </svg>
  );

  const exportToExcel = (event: HostedEvent) => {
    const data = event.selectedVendors.map(vendor => ({
      'Event Name': `${event.eventType} Celebration`,
      'Event Date': event.date,
      'Guest Count': event.guestCount,
      'Total Budget': `$${event.budget.toLocaleString()}`,
      'Vendor Name': vendor.name,
      'Service Provided': vendor.type,
      'Vendor Address': vendor.address || 'N/A',
      'Vendor Website': vendor.url || 'N/A',
      'Vendor Description': vendor.description || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Event Details');
    
    // Generate buffer and download
    XLSX.writeFile(workbook, `${event.eventType}_Event_Report_${event.id}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-navy selection:bg-gold/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-2 max-w-7xl mx-auto">
          <button 
            onClick={handleLogoClick}
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
          >
            <LogoIcon />
            <h1 className="font-display text-[10px] font-bold text-gradient-gold tracking-[0.3em] uppercase -mt-1">Eventrova</h1>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <button 
              onClick={() => setCurrentView('features')} 
              className={`hover:text-gold transition-colors ${currentView === 'features' ? 'text-gold' : ''}`}
            >
              Features
            </button>
            <button 
              onClick={goToPlanner} 
              className={`hover:text-gold transition-colors ${currentView === 'planner' ? 'text-gold' : ''}`}
            >
              Planner
            </button>
            {hostedEvents.length > 0 && (
              <a href="#history" className="hover:text-gold transition-colors flex items-center gap-1">
                <History size={14} /> History
              </a>
            )}
            {accessUnlocked && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold font-bold">
                  <Zap className="h-4 w-4" />
                  <span>{tokens} Tokens</span>
                </div>
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="text-xs text-gold hover:underline font-bold"
                >
                  + Get 5 ($10)
                </button>
              </div>
            )}
            <a href="#waitlist" className="px-5 py-2.5 rounded-xl border border-gold/50 text-gold hover:bg-gold hover:text-black transition-all">Join Waitlist</a>
          </nav>
          <div className="flex items-center gap-4">
            {accessUnlocked && (
              <div className="flex items-center gap-1 text-gold font-bold text-xs">
                <Zap className="h-3 w-3" />
                <span>{tokens}</span>
              </div>
            )}
            <a
              href="#waitlist"
              className="md:hidden text-sm font-bold text-gold"
            >
              Join
            </a>
          </div>
        </div>
      </header>

      <main>
        <AnimatePresence>
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Hero */}
              <section className="relative px-6 pt-24 pb-32 max-w-6xl mx-auto text-center overflow-hidden">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold/10 blur-[120px] rounded-full -z-10" />
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-bold uppercase tracking-widest mb-8">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI-Powered Planning
                  </div>
                  <h2 className="font-display text-5xl sm:text-6xl md:text-8xl font-bold leading-tight mb-8">
                    Plan any event in{" "}
                    <span className="text-gradient-gold">5 minutes</span>
                    <br />
                    without the stress
                  </h2>
                  <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                    Eventrova uses intelligent algorithms and Google's Gemini AI to automate 
                    logistics, checklists, and budgeting for hosts who value their time.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={goToPlanner}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-gradient-gold text-black font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20"
                    >
                      {accessUnlocked ? "Go to Smart Planner" : "Unlock Smart Planner"}
                      <Zap className="h-5 w-5" />
                    </button>
                    {!accessUnlocked && (
                      <a
                        href="#waitlist"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold text-lg transition-all"
                      >
                        Get Beta Access
                      </a>
                    )}
                  </div>
                </motion.div>
              </section>

              {/* Stats/Proof */}
              <section className="px-6 py-12 max-w-6xl mx-auto border-y border-white/5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  {[
                    { label: 'Avg. Time Saved', value: '14 Hours' },
                    { label: 'Planner Accuracy', value: '98%' },
                    { label: 'Vendor Network', value: '2k+' },
                    { label: 'Happy Users', value: '500+' }
                  ].map((stat, i) => (
                    <div key={i}>
                      <p className="text-2xl md:text-3xl font-display font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 py-32 max-w-7xl mx-auto"
            >
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-7xl font-display font-bold mb-8">Why choose <span className="text-gradient-gold">Eventrova?</span></h2>
                <p className="text-gray-400 text-xl max-w-2xl mx-auto">Traditional planning takes weeks. We shrunk it down to minutes with smart automation.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="group p-12 rounded-[2.5rem] border border-white/5 bg-white/5 hover:border-gold/30 transition-all duration-500"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-8 group-hover:bg-gold group-hover:text-black transition-colors duration-500">
                      {feature.icon}
                    </div>
                    <h3 className="font-display text-3xl font-bold mb-4">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed text-lg">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-20 text-center">
                <button 
                  onClick={goToPlanner}
                  className="px-10 py-5 rounded-2xl bg-gradient-gold text-black font-bold text-lg hover:scale-105 transition-all"
                >
                  Ready to start? Go to Smart Planner
                </button>
              </div>
            </motion.div>
          )}

          {currentView === 'planner' && (
            <motion.div
              key="planner-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="px-6 py-20"
            >
              <div className="max-w-5xl mx-auto relative">
                <div className="text-center mb-16">
                  <h2 className="font-display text-4xl md:text-7xl font-bold mb-6">
                    Start planning <span className="text-gradient-gold">instantly</span>
                  </h2>
                  <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                    Our smart engine calculates logistics in real-time. Give it a try below.
                  </p>
                </div>
                
                <div className="relative p-8 md:p-12 rounded-[2.5rem] border border-white/10 bg-secondary/80 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[600px] flex items-center justify-center">
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 blur-[60px] rounded-full" />
                   <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gold/10 blur-[60px] rounded-full" />
                   
                   <AnimatePresence mode="wait">
                     {accessUnlocked ? (
                       <motion.div 
                         key="planner"
                         initial={{ opacity: 0, filter: 'blur(10px)' }}
                         animate={{ opacity: 1, filter: 'blur(0px)' }}
                         className="w-full"
                       >
                         <EventPlanner 
                           key={plannerKey}
                           tokens={tokens} 
                           onDeductTokens={deductTokens} 
                           onAddTokens={() => setIsPaymentModalOpen(true)}
                           onEventStarted={handleEventStarted}
                         />
                       </motion.div>
                     ) : (
                       <motion.div 
                         key="locked"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         className="z-10 text-center flex flex-col items-center max-w-md"
                       >
                         <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-8 border border-gold/20 shadow-2xl shadow-gold/10">
                           <Lock className="text-gold w-8 h-8" />
                         </div>
                         <h3 className="text-2xl font-bold mb-4">Planner Locked</h3>
                         <p className="text-gray-400 mb-8 leading-relaxed">
                           To protect our server capacity, the interactive smart planner is currently restricted to waitlist members.
                         </p>
                         <a 
                           href="#waitlist" 
                           className="px-8 py-4 bg-gradient-gold text-black font-bold rounded-2xl hover:scale-105 transition-all shadow-lg shadow-gold/20"
                         >
                           Join Waitlist to Unlock
                         </a>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {!accessUnlocked && (
                     <div className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-none -z-0" />
                   )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Event History Section */}
      {accessUnlocked && hostedEvents.length > 0 && (
        <section id="history" className="px-6 py-32 max-w-7xl mx-auto scroll-mt-20">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Successful Events</h2>
              <p className="text-gray-500">A record of all your extraordinary hosted experiences.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-gold">
              <Trophy className="h-4 w-4" />
              {hostedEvents.length} Events Hosted
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hostedEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-3xl border border-white/5 bg-white/5 hover:border-gold/30 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                      {event.eventType}
                    </span>
                    <button 
                      onClick={() => exportToExcel(event)}
                      className="flex items-center gap-1 text-[10px] font-bold text-gold hover:text-white transition-colors bg-gold/10 px-3 py-1 rounded-full border border-gold/20"
                    >
                      <Download size={10} /> Export Excel
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:text-gold transition-colors">
                  {event.eventType} Celebration
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar size={14} className="text-gold/50" />
                    {event.date}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <UsersIcon size={14} className="text-gold/50" />
                    {event.guestCount} Guests
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <DollarSign size={14} className="text-gold/50" />
                    ${event.budget.toLocaleString()} Budget
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Selected Vendors</p>
                  <div className="flex flex-wrap gap-2">
                    {event.selectedVendors.map((vendor, vi) => (
                      <span key={vi} className="text-[10px] bg-gold/5 text-gold border border-gold/10 px-2 py-1 rounded-md">
                        {vendor.name}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Waitlist Section */}
      <section id="waitlist" className="px-6 py-40 max-w-6xl mx-auto text-center relative overflow-hidden scroll-mt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gold/5 blur-[150px] rounded-full -z-10" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-4xl md:text-7xl font-bold mb-8 leading-tight">
            The future of event <br />
            logistics is <span className="text-gradient-gold">almost here</span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-16">
            Join 500+ event hosts and vendors on the waitlist. 
            Early users get 5 free tokens and exclusive access to the smart planner with zero booking fees.
          </p>
          <div className="max-w-3xl mx-auto">
            <WaitlistForm onJoined={handleUnlock} onNavigateToPlanner={goToPlanner} />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="md:col-span-1">
            <div className="flex flex-col items-start gap-2 mb-6">
               <div className="w-16 h-16 bg-transparent flex items-center justify-center overflow-hidden">
                <LogoIcon />
              </div>
              <span className="font-display text-lg font-bold text-gradient-gold tracking-widest uppercase">Eventrova</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Empowering hosts to plan extraordinary events without the complexity of traditional coordination.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-white/10 transition-all"><Twitter size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-white/10 transition-all"><Linkedin size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-gold hover:bg-white/10 transition-all"><Github size={18} /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-white">Product</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><button onClick={goToPlanner} className="hover:text-gold transition-colors">Smart Planner</button></li>
              <li><button onClick={() => setCurrentView('features')} className="hover:text-gold transition-colors">AI Checklists</button></li>
              <li><a href="#waitlist" className="hover:text-gold transition-colors">Vendor Directory</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Budget Calculator</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-white">Company</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-gold transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-white">Newsletter</h4>
            <p className="text-sm text-gray-500 mb-4">Planning tips delivered to your inbox.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold" />
              <button className="bg-gold px-4 py-2 rounded-lg text-black font-bold text-xs">Join</button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-10 border-t border-white/5 gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Eventrova AI. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-gray-600">
            <a href="#" className="hover:text-gray-400 transition-colors">Security</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Status</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => addTokens(5)}
        amount={5}
        price="$10"
      />
    </div>
  );
};

export default App;
