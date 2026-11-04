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
import { DI_LESSONS } from "@/lib/lessons";

export default function Home() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "lesson" | "login">("login");
  const [activeLesson, setActiveLesson] = useState<DILesson | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize and load saved student
  useEffect(() => {
    const loadedStudents = loadAllStudents();
    setStudents(loadedStudents);

    const savedId = getActiveStudentId();
    const current = loadedStudents.find((s) => s.id === savedId) || (loadedStudents.length > 0 ? loadedStudents[0] : null);
    setActiveStudent(current);

    // If no students exist or no active profile, force login view so first-time users create username immediately
    if (loadedStudents.length === 0 || !current) {
      setCurrentView("login");
    } else {
      setCurrentView("dashboard");
    }
    setIsLoaded(true);
  }, []);

  const handleSelectStudent = (student: StudentProfile) => {
    setActiveStudent(student);
    setActiveStudentId(student.id);
    setStudents(loadAllStudents());
    setCurrentView("dashboard");
  };

  const handleGuestStart = () => {
    if (students.length > 0) {
      handleSelectStudent(students[0]);
    } else {
      setCurrentView("login");
    }
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
        onSwitchStudent={() => {
          setStudents(loadAllStudents());
          setCurrentView("login");
        }}
        onGoHome={() => {
          if (activeStudent) {
            setCurrentView("dashboard");
          } else {
            setCurrentView("login");
          }
        }}
      />

      {/* Confetti celebration for lesson mastery */}
      <Confetti trigger={confettiTrigger} onComplete={() => setConfettiTrigger(false)} />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === "login" && (
          <StudentLogin
            students={students}
            onSelectStudent={handleSelectStudent}
            onGuestStart={handleGuestStart}
          />
        )}

        {currentView === "dashboard" && activeStudent && (
          <StudentDashboard
            student={activeStudent}
            onStartLesson={handleStartLesson}
          />
        )}

        {currentView === "lesson" && activeLesson && (
          <LessonEngine
            lesson={activeLesson}
            student={activeStudent}
            onLessonComplete={handleLessonComplete}
            onExit={() => setCurrentView("dashboard")}
          />
        )}
      </main>
    </div>
  );
}
