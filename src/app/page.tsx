"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StudentLogin } from "@/components/StudentLogin";
import { StudentDashboard } from "@/components/StudentDashboard";
import { LessonEngine } from "@/components/LessonEngine";
import { Confetti } from "@/components/Confetti";
import { StudentProfile, DILesson, LessonAttempt } from "@/lib/types";
import {
  loadAllStudents,
  getActiveStudentId,
  setActiveStudentId,
  recordLessonComplete,
} from "@/lib/storage";

export default function Home() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "lesson" | "login">("login");
  const [activeLesson, setActiveLesson] = useState<DILesson | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize and load saved student from cookie / storage
  useEffect(() => {
    const loadedStudents = loadAllStudents();
    setStudents(loadedStudents);

    const savedId = getActiveStudentId();
    const current = loadedStudents.find((s) => s.id === savedId) || null;

    if (current) {
      setActiveStudent(current);
      setCurrentView("dashboard");
    } else {
      setActiveStudent(null);
      setCurrentView("login");
    }
    setIsLoaded(true);
  }, []);

  const handleSelectStudent = (student: StudentProfile) => {
    setActiveStudent(student);
    setActiveStudentId(student.id);
    setStudents(loadAllStudents());
    setCurrentView("dashboard");
  };

  const handleLogoutStudent = () => {
    setActiveStudentId("");
    setActiveStudent(null);
    setStudents(loadAllStudents());
    setCurrentView("login");
  };

  const handleStartLesson = (lesson: DILesson) => {
    setActiveLesson(lesson);
    setCurrentView("lesson");
  };

  const handleLessonComplete = (attemptData: Omit<LessonAttempt, "id" | "studentId" | "timestamp">) => {
    if (!activeStudent) return;
    const updated = recordLessonComplete(activeStudent.id, attemptData);
    if (updated) {
      setActiveStudent(updated);
      setStudents(loadAllStudents());
    }
    if (attemptData.checkoutPassed) {
      setConfettiTrigger(true);
    }
    setCurrentView("dashboard");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#08090f] flex items-center justify-center text-white font-black text-xl">
        Loading ChadMath Direct Instruction...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090f] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentStudent={activeStudent}
        onGoHome={() => {
          if (activeStudent) {
            setCurrentView("dashboard");
          } else {
            setCurrentView("login");
          }
        }}
        onSwitchStudent={handleLogoutStudent}
      />

      {/* Confetti celebration for lesson mastery */}
      <Confetti trigger={confettiTrigger} onComplete={() => setConfettiTrigger(false)} />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === "login" && (
          <StudentLogin
            students={students}
            onSelectStudent={handleSelectStudent}
          />
        )}

        {currentView === "dashboard" && activeStudent && (
          <StudentDashboard
            student={activeStudent}
            onStartLesson={handleStartLesson}
            onSwitchStudent={handleLogoutStudent}
          />
        )}

        {currentView === "lesson" && activeLesson && (
          <LessonEngine
            lesson={activeLesson}
            student={activeStudent}
            onLessonComplete={handleLessonComplete}
            onExit={() => {
              const loaded = loadAllStudents();
              setStudents(loaded);
              if (activeStudent) {
                const refreshed = loaded.find((s) => s.id === activeStudent.id) || activeStudent;
                setActiveStudent(refreshed);
              }
              setCurrentView("dashboard");
            }}
          />
        )}
      </main>
    </div>
  );
}
