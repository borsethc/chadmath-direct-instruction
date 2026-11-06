"use client";

import { useState, useEffect } from "react";
import { Lock, X } from "lucide-react";
import { authenticatePortalPin, setPortalSession } from "@/lib/storage";
import { PortalAuthSession } from "@/lib/types";

interface TeacherPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: PortalAuthSession) => void;
}

export function TeacherPinModal({ isOpen, onClose, onSuccess }: TeacherPinModalProps) {
  const [enteredPin, setEnteredPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEnteredPin("");
      setErrorMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.length < 4) {
      setErrorMsg("PIN must be at least 4 digits.");
      return;
    }

    const session = authenticatePortalPin(enteredPin);
    if (session) {
      setPortalSession(session);
      setErrorMsg("");
      onSuccess(session);
    } else {
      setErrorMsg("Incorrect PIN. Access denied.");
      setEnteredPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="w-full max-w-sm rounded-3xl bg-[#0e121e] border-2 border-amber-500/30 p-6 shadow-2xl flex flex-col gap-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-white text-base">Teacher Dashboard Access</h3>
            <span className="text-xs text-white/50">Enter PIN to continue</span>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Enter PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              value={enteredPin}
              onChange={(e) => {
                setErrorMsg("");
                setEnteredPin(e.target.value.replace(/[^0-9]/g, ""));
              }}
              placeholder="••••"
              className="w-full h-12 rounded-2xl bg-black/60 border-2 border-white/15 text-center text-xl font-mono tracking-widest text-white focus:border-amber-400 outline-none"
            />
          </div>

          {errorMsg && (
            <span className="text-xs text-rose-400 text-center font-bold">{errorMsg}</span>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={enteredPin.length < 4}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
