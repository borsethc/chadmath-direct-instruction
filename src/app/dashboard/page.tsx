"use client";

import { useRouter } from "next/navigation";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { setActiveStudentId } from "@/lib/storage";
import { StudentProfile } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();

  const handleBackToApp = () => {
    router.push("/");
  };

  const handleSelectStudentToPlay = (student: StudentProfile) => {
    setActiveStudentId(student.id);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#08090f] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <main className="flex-1 flex flex-col">
        <TeacherDashboard
          onBackToApp={handleBackToApp}
          onSelectStudentToPlay={handleSelectStudentToPlay}
        />
      </main>
    </div>
  );
}
