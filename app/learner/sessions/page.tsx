import UnifiedHeader from "@/components/UnifiedHeader";

export function LearnerSessionList({ sessions }: { sessions: any[] }) {
  return (
    <>
     <UnifiedHeader />
     <div className="space-y-4">
      {sessions.map((s) => (
        <div key={s.sessionId} className="p-4 border rounded-xl shadow">
          <h3 className="text-lg font-bold">Mentor: {s.mentorName}</h3>
          <p>Skill: {s.skill}</p>
          <p>Date: {new Date(s.scheduledDate).toLocaleString()}</p>
          <p>Duration: {s.duration} mins</p>
          <p>Status: <strong>{s.status}</strong></p>
        </div>
      ))}
    </div>
    </>
    
  );
}
