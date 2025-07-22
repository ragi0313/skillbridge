import { Card, CardContent } from "@/components/ui/card"
import { User } from "lucide-react"

export function EmptyState() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">No pending applications</h3>
            <p className="text-gray-500">All mentor applications have been reviewed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
