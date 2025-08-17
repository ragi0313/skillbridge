"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Ban, Clock, AlertTriangle, CheckCircle, Mail, Calendar, Shield } from "lucide-react"
import { toast } from "sonner"

interface AdminUser {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  status: string
  lastLoginAt: string | null
  suspendedAt: string | null
  suspensionEndsAt: string | null
  suspensionReason: string | null
  blacklistedAt: string | null
  blacklistReason: string | null
  createdAt: string
}

interface UserAction {
  type: "suspend" | "blacklist"
  userId: number
  reason: string
  duration?: number // for suspension in days
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: "suspend" | "blacklist" | null }>({
    open: false,
    type: null,
  })
  const [actionReason, setActionReason] = useState("")
  const [suspensionDays, setSuspensionDays] = useState(30)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast.error("Failed to fetch users")
      }
    } catch (error) {
      toast.error("Error fetching users")
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (action: UserAction) => {
    try {
      const response = await fetch("/api/admin/users/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchUsers() // Refresh the user list
        setActionDialog({ open: false, type: null })
        setActionReason("")
        setSelectedUser(null)
      } else {
        const error = await response.json()
        toast.error(error.message || "Action failed")
      }
    } catch (error) {
      toast.error("Error performing action")
    }
  }

  const getStatusBadge = (user: AdminUser) => {
    if (user.blacklistedAt) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Ban className="w-3 h-3" />
          Blacklisted
        </Badge>
      )
    }

    if (user.suspendedAt && (!user.suspensionEndsAt || new Date(user.suspensionEndsAt) > new Date())) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
          <Clock className="w-3 h-3" />
          Suspended
        </Badge>
      )
    }

    switch (user.status) {
      case "online":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Online
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Offline
          </Badge>
        )
      default:
        return <Badge variant="outline">{user.status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800",
      mentor: "bg-blue-100 text-blue-800",
      learner: "bg-green-100 text-green-800",
    }

    return (
      <Badge className={colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        <Shield className="w-3 h-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    )
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      user.status === statusFilter ||
      (statusFilter === "suspended" &&
        user.suspendedAt &&
        (!user.suspensionEndsAt || new Date(user.suspensionEndsAt) > new Date())) ||
      (statusFilter === "blacklisted" && user.blacklistedAt)

    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const openActionDialog = (user: AdminUser, type: "suspend" | "blacklist") => {
    setSelectedUser(user)
    setActionDialog({ open: true, type })
    setActionReason("")
  }

  const confirmAction = () => {
    if (!selectedUser || !actionDialog.type || !actionReason.trim()) {
      toast.error("Please provide a reason for this action")
      return
    }

    const action: UserAction = {
      type: actionDialog.type,
      userId: selectedUser.id,
      reason: actionReason.trim(),
    }

    if (actionDialog.type === "suspend") {
      action.duration = suspensionDays
    }

    handleUserAction(action)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, status, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Total Users: {users.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="learner">Learners</SelectItem>
                <SelectItem value="mentor">Mentors</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!user.blacklistedAt && !user.suspendedAt && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(user, "suspend")}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Suspend
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(user, "blacklist")}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Blacklist
                              </Button>
                            </>
                          )}
                          {(user.suspendedAt || user.blacklistedAt) && (
                            <Badge variant="secondary" className="text-xs">
                              Action Applied
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, type: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === "suspend" ? (
                <>
                  <Clock className="w-5 h-5 text-orange-600" />
                  Suspend User
                </>
              ) : (
                <>
                  <Ban className="w-5 h-5 text-red-600" />
                  Blacklist User
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>

              {actionDialog.type === "suspend" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Suspension Duration</label>
                  <Select
                    value={suspensionDays.toString()}
                    onValueChange={(value) => setSuspensionDays(Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for {actionDialog.type === "suspend" ? "Suspension" : "Blacklisting"} *
                </label>
                <Textarea
                  placeholder="Provide a detailed reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Warning:</p>
                  <p>
                    {actionDialog.type === "suspend"
                      ? `This user will be suspended for ${suspensionDays} days and will receive an email notification. They won't be able to log in during this period.`
                      : "This user will be permanently blacklisted and will receive an email notification. They will not be able to log in again."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={confirmAction}
                  className={
                    actionDialog.type === "suspend"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                  disabled={!actionReason.trim()}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Confirm & Send Email
                </Button>
                <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null })}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
