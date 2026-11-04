"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StudentLogin } from "@/components/StudentLogin";
import { StudentDashboard } from "@/components/StudentDashboard";
import { LessonEngine } from "@/components/LessonEngine";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { Confetti } from "@/components/Confetti";
import { StudentProfile, DILesson, LessonAttempt } from "@/lib/types";
import {
  loadAllStudents,
  getActiveStudentId,
  setActiveStudentId,
  getStudentById,
  recordLessonComplete,
} from "@/lib/storage";
import { DI_LESSONS } from "@/lib/lessons";

export default function Home() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "lesson" | "login" | "teacher">("dashboard");
  const [activeLesson, setActiveLesson] = useState<DILesson | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize and load saved student
  useEffect(() => {
    const loadedStudents = loadAllStudents();
    setStudents(loadedStudents);

    const savedId = getActiveStudentId();
    const current = loadedStudents.find((s) => s.id === savedId) || loadedStudents[0] || null;
    setActiveStudent(current);
    setIsLoaded(true);
  }, []);

  const handleSelectStudent = (student: StudentProfile) => {
    setActiveStudent(student);
    setActiveStudentId(student.id);
    setCurrentView("dashboard");
  };

  const handleGuestStart = () => {
    // Pick first demo student or Leo
    const guest = students[0];
    if (guest) {
      handleSelectStudent(guest);
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
        onOpenTeacherDashboard={() => setCurrentView("teacher")}
        onSwitchStudent={() => setCurrentView("login")}
        onGoHome={() => setCurrentView("dashboard")}
        isTeacherView={currentView === "teacher"}
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
            onOpenTeacher={() => setCurrentView("teacher")}
          />
        )}

        {currentView === "dashboard" && activeStudent && (
          <StudentDashboard
            student={activeStudent}
            onStartLesson={handleStartLesson}
            onOpenTeacher={() => setCurrentView("teacher")}
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

        {currentView === "teacher" && (
          <TeacherDashboard
            onBackToApp={() => setCurrentView("dashboard")}
            onSelectStudentToPlay={(student) => {
              handleSelectStudent(student);
              const lesson = DI_LESSONS.find((l) => l.id === student.currentLessonId) || DI_LESSONS[0];
              handleStartLesson(lesson);
            }}
          />
        )}
      </main>
    </div>
  );
}
