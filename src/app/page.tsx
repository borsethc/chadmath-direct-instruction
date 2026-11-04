"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StudentLogin } from "@/components/StudentLogin";
import { StudentDashboard } from "@/components/StudentDashboard";
import { LessonEngine } from "@/components/LessonEngine";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { TeacherPinModal } from "@/components/TeacherPinModal";
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
  const [currentView, setCurrentView] = useState<"dashboard" | "lesson" | "login" | "teacher">("login");
  const [activeLesson, setActiveLesson] = useState<DILesson | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [showTeacherPinModal, setShowTeacherPinModal] = useState(false);
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

  const handleOpenTeacherPortal = () => {
    setShowTeacherPinModal(true);
  };

  const handleTeacherPinSuccess = () => {
    setShowTeacherPinModal(false);
    setCurrentView("teacher");
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
        onSwitchStudent={() => {
          setStudents(loadAllStudents());
          setCurrentView("login");
        }}
        onOpenTeacherPortal={handleOpenTeacherPortal}
      />

      {/* Confetti celebration for lesson mastery */}
      <Confetti trigger={confettiTrigger} onComplete={() => setConfettiTrigger(false)} />

      {/* Teacher PIN Modal (Protected owner access, no PIN printed anywhere) */}
      <TeacherPinModal
        isOpen={showTeacherPinModal}
        onClose={() => setShowTeacherPinModal(false)}
        onSuccess={handleTeacherPinSuccess}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === "login" && (
          <StudentLogin
            students={students}
            onSelectStudent={handleSelectStudent}
            onOpenTeacher={handleOpenTeacherPortal}
          />
        )}

        {currentView === "dashboard" && activeStudent && (
          <StudentDashboard
            student={activeStudent}
            onStartLesson={handleStartLesson}
            onSwitchStudent={() => {
              setStudents(loadAllStudents());
              setCurrentView("login");
            }}
            onOpenTeacherPortal={handleOpenTeacherPortal}
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

        {currentView === "teacher" && (
          <TeacherDashboard
            onBackToApp={() => {
              const loaded = loadAllStudents();
              setStudents(loaded);
              const savedId = getActiveStudentId();
              const curr = loaded.find((s) => s.id === savedId) || loaded[0] || null;
              setActiveStudent(curr);
              setCurrentView(curr ? "dashboard" : "login");
            }}
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
