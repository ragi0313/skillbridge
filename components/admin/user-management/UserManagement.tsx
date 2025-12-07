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
import { Search, Ban, Clock, AlertTriangle, CheckCircle, Mail, Calendar, Shield, RotateCcw } from "lucide-react"
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
  type: "suspend" | "blacklist" | "unsuspend" | "unblacklist"
  userId: number
  reason: string
  duration?: number // for suspension in days
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all") // New: status filter
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "suspend" | "blacklist" | "unsuspend" | "unblacklist" | null
  }>({
    open: false,
    type: null,
  })
  const [actionReason, setActionReason] = useState("")
  const [suspensionDays, setSuspensionDays] = useState(30)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
    // Check blacklisted first
    if (user.blacklistedAt) {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="destructive" className="flex items-center gap-1 w-fit cursor-help" title={user.blacklistReason || "No reason provided"}>
            <Ban className="w-3 h-3" />
            Blacklisted
          </Badge>
          {user.blacklistReason && (
            <span className="text-xs text-gray-600 bg-red-50 p-2 rounded border border-red-100">
              {user.blacklistReason}
            </span>
          )}
        </div>
      )
    }

    // Check suspended second
    if (user.suspendedAt && (!user.suspensionEndsAt || new Date(user.suspensionEndsAt) > new Date())) {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-orange-100 text-orange-800 cursor-help" title={user.suspensionReason || "No reason provided"}>
            <Clock className="w-3 h-3" />
            Suspended
          </Badge>
          {user.suspensionReason && (
            <span className="text-xs text-gray-600 bg-orange-50 p-2 rounded border border-orange-100">
              {user.suspensionReason}
            </span>
          )}
        </div>
      )
    }

    // Determine online/offline based on lastLoginAt
    // Consider user online if they logged in within the last 10 minutes
    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
    const isOnline = user.lastLoginAt && new Date(user.lastLoginAt) > tenMinutesAgo

    if (isOnline) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          Online
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-gray-600">
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          Offline
        </Badge>
      )
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

    const matchesRole = roleFilter === "all" || user.role === roleFilter

    // Status filter logic
    let matchesStatus = true
    if (statusFilter === "all") {
      matchesStatus = true
    } else if (statusFilter === "active") {
      matchesStatus = !user.blacklistedAt && !user.suspendedAt
    } else if (statusFilter === "suspended") {
      matchesStatus = user.suspendedAt && !user.blacklistedAt
    } else if (statusFilter === "blacklisted") {
      matchesStatus = user.blacklistedAt
    }

    return matchesSearch && matchesRole && matchesStatus
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter])

  const openActionDialog = (user: AdminUser, type: "suspend" | "blacklist" | "unsuspend" | "unblacklist") => {
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
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
                  {paginatedUsers.map((user) => (
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
                        <div className="flex gap-2 flex-wrap">
                          {/* Show suspend/blacklist for active users */}
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
                          {/* Show unsuspend for suspended users */}
                          {user.suspendedAt && !user.blacklistedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openActionDialog(user, "unsuspend")}
                              className="text-green-600 hover:text-green-700"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Unsuspend
                            </Button>
                          )}
                          {/* Show unblacklist for blacklisted users */}
                          {user.blacklistedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openActionDialog(user, "unblacklist")}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Unblacklist
                            </Button>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, type: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === "suspend" && (
                <>
                  <Clock className="w-5 h-5 text-orange-600" />
                  Suspend User
                </>
              )}
              {actionDialog.type === "blacklist" && (
                <>
                  <Ban className="w-5 h-5 text-red-600" />
                  Blacklist User
                </>
              )}
              {actionDialog.type === "unsuspend" && (
                <>
                  <RotateCcw className="w-5 h-5 text-green-600" />
                  Unsuspend User
                </>
              )}
              {actionDialog.type === "unblacklist" && (
                <>
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                  Unblacklist User
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
                  Reason for{" "}
                  {actionDialog.type === "suspend" && "Suspension"}
                  {actionDialog.type === "blacklist" && "Blacklisting"}
                  {actionDialog.type === "unsuspend" && "Unsuspension"}
                  {actionDialog.type === "unblacklist" && "Unblacklisting"} *
                </label>
                <Textarea
                  placeholder="Provide a detailed reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div
                className={`flex items-start gap-2 p-3 border rounded-lg ${
                  actionDialog.type === "unsuspend" || actionDialog.type === "unblacklist"
                    ? "bg-green-50 border-green-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                {actionDialog.type === "unsuspend" || actionDialog.type === "unblacklist" ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                <div
                  className={`text-sm ${
                    actionDialog.type === "unsuspend" || actionDialog.type === "unblacklist"
                      ? "text-green-800"
                      : "text-yellow-800"
                  }`}
                >
                  <p className="font-medium">
                    {actionDialog.type === "unsuspend" || actionDialog.type === "unblacklist" ? "Note:" : "Warning:"}
                  </p>
                  <p>
                    {actionDialog.type === "suspend" &&
                      `This user will be suspended for ${suspensionDays} days and will receive an email notification. They won't be able to log in during this period.`}
                    {actionDialog.type === "blacklist" &&
                      "This user will be permanently blacklisted and will receive an email notification. They will not be able to log in again."}
                    {actionDialog.type === "unsuspend" &&
                      "This user will be unsuspended and will receive an email notification. They will regain access to their account immediately."}
                    {actionDialog.type === "unblacklist" &&
                      "This user will be removed from the blacklist and will receive an email notification. They will regain access to their account immediately."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={confirmAction}
                  className={
                    actionDialog.type === "suspend"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : actionDialog.type === "blacklist"
                        ? "bg-red-600 hover:bg-red-700"
                        : actionDialog.type === "unsuspend"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-blue-600 hover:bg-blue-700"
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
