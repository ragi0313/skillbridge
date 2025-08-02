"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MentorSessionList({ sessions }: { sessions: any[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusUpdate = async (id: number, status: string) => {
    setLoading(true);
    await fetch("/api/bookings/mentor/update-status", {
      method: "POST",
      body: JSON.stringify({ sessionId: id, status }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {sessions.map((s) => (
        <div key={s.sessionId} className="p-4 border rounded-xl shadow">
          <h3 className="text-lg font-bold">Skill: {s.skill}</h3>
          <p>Learner: {s.learnerName}</p>
          <p>Date: {new Date(s.scheduledDate).toLocaleString()}</p>
          <p>Duration: {s.duration} mins</p>
          <p>Status: <strong>{s.status}</strong></p>
          {s.status === "pending" && (
            <div className="mt-2 space-x-2">
              <button
                className="bg-green-600 text-white px-3 py-1 rounded"
                onClick={() => handleStatusUpdate(s.sessionId, "accepted")}
                disabled={loading}
              >
                Accept
              </button>
              <button
                className="bg-red-600 text-white px-3 py-1 rounded"
                onClick={() => handleStatusUpdate(s.sessionId, "rejected")}
                disabled={loading}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
