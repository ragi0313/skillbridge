import { Badge } from "@/components/ui/badge"

interface MentorApplicationHeaderProps {
  pendingCount: number
}

export function MentorApplicationHeader({ pendingCount }: MentorApplicationHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Mentor Approvals</h1>
            <p className="text-gray-600">Review and approve new mentor applications to join the platform</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-blue-100 text-blue-800 border-blue-200">
              {pendingCount} Pending
            </Badge>
            <p className="text-sm text-gray-500 mt-1">Applications awaiting review</p>
          </div>
        </div>
      </div>
    </div>
  )
}
