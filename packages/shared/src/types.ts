export type Priority = "P1" | "P2" | "P3";
export type ChapterStatus = "pending" | "theory" | "pyqs" | "revision" | "mastery" | "complete_weak";
export type Subject = "Physics" | "Chemistry" | "Mathematics";
export interface Chapter {
  id: string; subject: Subject; name: string; priority: Priority; sortOrder?: number;
  subtopics?: string[]; status: ChapterStatus; pyqAttempted: number;
  pyqIndependent: number; accuracy?: number; lastStudiedAt?: string;
  nextRevisionAt?: string;
}
export interface StudyEvent {
  id: string; title: string; type: "study" | "revision" | "mock" | "deadline";
  startsAt: string; endsAt: string; chapterId?: string; completed: boolean;
}
