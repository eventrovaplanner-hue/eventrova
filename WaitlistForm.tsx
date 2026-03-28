
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface WaitlistFormProps {
  onJoined?: () => void;
  onNavigateToPlanner?: () => void;
}

export const WaitlistForm: React.FC<WaitlistFormProps> = ({ onJoined, onNavigateToPlanner }) => {
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    // Re-initialize the Sender library when the component mounts.
    // @ts-ignore
    if (typeof window.sender === 'function') {
      // @ts-ignore
      window.sender('d930b01eba9060');
    }

    const status = localStorage.getItem('eventrova_unlocked');
    if (status === 'true') {
      setHasVerified(true);
    }
  }, []);

  const handleManualVerify = () => {
    if (onJoined) {
      onJoined();
      setHasVerified(true);
      // Navigate to planner after unlock
      if (onNavigateToPlanner) {
        setTimeout(() => {
          onNavigateToPlanner();
        }, 500);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-2xl mx-auto p-6 md:p-10 rounded-[2.5rem] bg-secondary border border-white/5 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-gold opacity-30"></div>
      
      {!hasVerified ? (
        <>
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-white mb-2">Join the Exclusive Waitlist</h3>
            <p className="text-gray-500 text-sm">Enter your details below to secure your early access spot.</p>
          </div>

          {/* Official Sender.net HTML Embed */}
          <div 
            style={{ textAlign: 'left' }} 
            className="sender-form-field" 
            data-sender-form-id="eZ6nLv"
          ></div>
          
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-gray-400 mb-4">Already filled out the form above?</p>
            <button
              onClick={handleManualVerify}
              className="px-6 py-3 rounded-xl border border-gold/50 text-gold font-bold hover:bg-gold hover:text-black transition-all text-sm"
            >
              I've Joined – Unlock Now
            </button>
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <CheckCircle2 className="text-green-500 w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold mb-4">You're on the list!</h3>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">
            Access to the Smart Planner is now unlocked. We've added 3 free tokens to your account to get you started!
          </p>
          <button 
            onClick={onNavigateToPlanner}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-gold text-black font-bold transition-all shadow-xl shadow-gold/20"
          >
            Go to Smart Planner
          </button>
        </div>
      )}
      
      <p className="text-[10px] text-center text-gray-600 mt-8 uppercase tracking-[0.2em] font-bold">
        Powered by Sender.net • Secure SSL Encryption
      </p>
    </motion.div>
  );
};
