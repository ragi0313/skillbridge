import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface SessionStatsProps {
  total: number
  pending: number
  upcoming: number
  completed: number
  cancelled: number
}

export function SessionStats({ total, pending, upcoming, completed, cancelled }: SessionStatsProps) {
  const stats = [
    {
      title: "Total Sessions",
      value: total,
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      title: "Pending Requests",
      value: pending,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Upcoming",
      value: upcoming,
      icon: AlertCircle,
      color: "text-green-600"
    },
    {
      title: "Completed",
      value: completed,
      icon: CheckCircle,
      color: "text-emerald-600"
    },
    {
      title: "Cancelled",
      value: cancelled,
      icon: XCircle,
      color: "text-red-600"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const IconComponent = stat.icon
        return (
          <Card key={stat.title} className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${
                stat.title === 'Total Sessions' ? 'from-blue-100 to-blue-200' :
                stat.title === 'Pending Requests' ? 'from-yellow-100 to-yellow-200' :
                stat.title === 'Upcoming' ? 'from-green-100 to-green-200' :
                stat.title === 'Completed' ? 'from-emerald-100 to-emerald-200' :
                'from-red-100 to-red-200'
              }`}>
                <IconComponent className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-500 ${
                    stat.title === 'Total Sessions' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                    stat.title === 'Pending Requests' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    stat.title === 'Upcoming' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                    stat.title === 'Completed' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                    'bg-gradient-to-r from-red-400 to-red-600'
                  }`}
                  style={{ width: `${Math.min((stat.value / Math.max(...stats.map(s => s.value))) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}