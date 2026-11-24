import React from 'react';
import { Landmark, ShieldCheck } from 'lucide-react';
import { usePortal } from '../context/PortalContext';

export const SignInView: React.FC = () => {
  const { directoryAccounts, signInAs, settings, isLoading } = usePortal();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F5F8] p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E8ECF2] bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
        <div className="bg-[#003B9E] px-6 py-5 text-white">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#FACC15]/80 bg-[#002B75] text-white shadow-sm">
              <Landmark className="h-5 w-5 text-[#FACC15]" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                CivicTrack — Government Administration Portal
              </h1>
              <p className="text-xs text-white/80">{settings.municipalityName}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-[#E8ECF2] bg-[#F8FAFC] p-3.5 text-xs text-[#64748B]">
            Authorized Municipal Officials Only. Select an official credential profile below to
            establish a role-scoped administrative session.
          </div>

          <div className="divide-y divide-[#EEF1F5] overflow-hidden rounded-xl border border-[#E8ECF2]">
            {directoryAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1E293B]">{acc.name}</span>
                    <span className="font-mono-tabular text-[11px] text-[#64748B]">
                      {acc.employeeId}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#64748B]">
                    {acc.role} · {acc.designation} · {acc.jurisdiction}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => signInAs(acc.id)}
                  className="shrink-0 rounded-lg bg-[#003B9E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#002D7A] disabled:opacity-50 whitespace-nowrap transition-colors"
                >
                  Sign In
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#EEF1F5] bg-[#F8FAFC] px-6 py-3 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#003B9E]" />
            <span>Role-Based Access Enforced</span>
          </span>
          <span className="font-mono-tabular">Portal Code: {settings.portalCode}</span>
        </div>
      </div>
    </div>
  );
};
