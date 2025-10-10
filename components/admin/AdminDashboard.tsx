"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserCheck,
  BookOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Star,
  MessageSquare
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface DashboardStats {
  totalUsers: number
  totalMentors: number
  totalLearners: number
  pendingMentors: number
  activeSessions: number
  completedSessions: number
  totalRevenue: number
  monthlyRevenue: number
  averageRating: number
  totalReports: number
  pendingReports: number
  systemHealth: "excellent" | "good" | "warning" | "critical"
}

interface ChartData {
  userGrowth: Array<{ month: string; users: number; mentors: number; learners: number }>
  sessionStats: Array<{ month: string; sessions: number; revenue: number }>
  reportsData: Array<{ category: string; count: number; color: string }>
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [timeRange, setTimeRange] = useState("30") // days
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsResponse, chartsResponse] = await Promise.all([
        fetch("/api/admin/dashboard/stats"),
        fetch(`/api/admin/dashboard/charts?days=${timeRange}`)
      ])

      if (statsResponse.ok && chartsResponse.ok) {
        const statsData = await statsResponse.json()
        const chartsData = await chartsResponse.json()
        setStats(statsData)
        setChartData(chartsData)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthBadge = (health: string) => {
    const variants = {
      excellent: "bg-green-100 text-green-800 border-green-200",
      good: "bg-blue-100 text-blue-800 border-blue-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    }
    const icons = {
      excellent: <CheckCircle className="w-4 h-4" />,
      good: <CheckCircle className="w-4 h-4" />,
      warning: <AlertTriangle className="w-4 h-4" />,
      critical: <XCircle className="w-4 h-4" />,
    }

    return (
      <Badge className={`flex items-center space-x-1 ${variants[health as keyof typeof variants]}`}>
        {icons[health as keyof typeof icons]}
        <span>{health.toUpperCase()}</span>
      </Badge>
    )
  }

  if (loading || !stats || !chartData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Mentors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMentors.toLocaleString()}</p>
                {stats.pendingMentors > 0 && (
                  <p className="text-sm text-orange-600">{stats.pendingMentors} pending approval</p>
                )}
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeSessions}</p>
                <p className="text-sm text-gray-500">{stats.completedSessions} completed</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900">₱{stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-600">₱{stats.totalRevenue.toLocaleString()} total</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(stats.averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reports</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReports}</p>
                {stats.pendingReports > 0 && (
                  <p className="text-sm text-red-600">{stats.pendingReports} pending review</p>
                )}
              </div>
              <MessageSquare className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <div className="mt-2">
                  {getHealthBadge(stats.systemHealth)}
                </div>
              </div>
              <Eye className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleTimeString()}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} name="Total Users" />
                <Line type="monotone" dataKey="mentors" stroke="#10B981" strokeWidth={2} name="Mentors" />
                <Line type="monotone" dataKey="learners" stroke="#F59E0B" strokeWidth={2} name="Learners" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Session & Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.sessionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="sessions" fill="#3B82F6" name="Sessions" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue (₱)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reports Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.reportsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.reportsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <UserCheck className="w-5 h-5 mb-1" />
                <span className="text-sm">Review Mentors</span>
                {stats.pendingMentors > 0 && (
                  <Badge className="mt-1 bg-orange-500">{stats.pendingMentors}</Badge>
                )}
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <MessageSquare className="w-5 h-5 mb-1" />
                <span className="text-sm">Review Reports</span>
                {stats.pendingReports > 0 && (
                  <Badge className="mt-1 bg-red-500">{stats.pendingReports}</Badge>
                )}
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <BookOpen className="w-5 h-5 mb-1" />
                <span className="text-sm">Monitor Sessions</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <Eye className="w-5 h-5 mb-1" />
                <span className="text-sm">System Health</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}