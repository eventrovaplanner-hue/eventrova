
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Smartphone, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  price: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, amount, price }) => {
  const [step, setStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [method, setMethod] = useState<'apple' | 'google' | 'card' | null>(null);

  const handlePayment = (payMethod: 'apple' | 'google' | 'card') => {
    setMethod(payMethod);
    setStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset for next time
        setTimeout(() => {
          setStep('selection');
          setMethod(null);
        }, 500);
      }, 2000);
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-secondary border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8 sm:p-10">
              {step === 'selection' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center text-gold mx-auto mb-6">
                    <Zap size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Purchase Tokens</h3>
                  <p className="text-gray-400 mb-8">Get {amount} tokens for {price} to unlock your next smart event plan.</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => handlePayment('apple')}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98]"
                    >
                      <Smartphone size={20} />
                      Pay with Apple Pay
                    </button>
                    
                    <button 
                      onClick={() => handlePayment('google')}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-[#4285F4] text-white rounded-2xl font-bold hover:bg-[#357abd] transition-all active:scale-[0.98]"
                    >
                      <Smartphone size={20} />
                      Pay with Google Pay
                    </button>

                    <button 
                      onClick={() => handlePayment('card')}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-[0.98]"
                    >
                      <CreditCard size={20} />
                      Credit or Debit Card
                    </button>
                  </div>
                  
                  <p className="mt-6 text-[10px] text-gray-500 uppercase tracking-widest">
                    Secure checkout powered by App Store & Google Play
                  </p>
                </div>
              )}

              {step === 'processing' && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full mx-auto mb-8"
                  />
                  <h3 className="text-2xl font-bold mb-2">Processing Payment</h3>
                  <p className="text-gray-400">Connecting to your {method === 'apple' ? 'App Store' : method === 'google' ? 'Google Play' : 'bank'} account...</p>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8"
                  >
                    <CheckCircle size={48} />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
                  <p className="text-gray-400">{amount} tokens have been added to your account.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
