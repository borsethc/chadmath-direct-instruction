"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { TeacherPinModal } from "@/components/TeacherPinModal";
import { setActiveStudentId, setPortalSession } from "@/lib/storage";
import { PortalAuthSession, StudentProfile } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [portalSession, setPortalSessionState] = useState<PortalAuthSession | null>(null);

  const handleBackToApp = () => {
    setPortalSession(null);
    setPortalSessionState(null);
    router.push("/");
  };

  const handleSelectStudentToPlay = (student: StudentProfile) => {
    setActiveStudentId(student.id);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#08090f] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {!portalSession ? (
        <TeacherPinModal
          isOpen={true}
          onClose={handleBackToApp}
          onSuccess={(session) => setPortalSessionState(session)}
        />
      ) : (
        <main className="flex-1 flex flex-col">
          <TeacherDashboard
            portalSession={portalSession}
            onBackToApp={handleBackToApp}
            onSelectStudentToPlay={handleSelectStudentToPlay}
          />
        </main>
      )}
    </div>
  );
}
