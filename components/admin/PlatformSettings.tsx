"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings, Globe, DollarSign, Users, Shield, Plus, X, Save } from "lucide-react"

export default function PlatformSettings() {
  const [settings, setSettings] = useState({
    // General Settings
    platformName: "SkillBridge",
    platformDescription: "An Interactive Web Platform for Connecting Learners with Freelancing Professionals",
    defaultTimezone: "UTC",
    maintenanceMode: false,
    registrationEnabled: true,

    // Financial Settings
    commissionRate: 15,
    supportedCurrencies: ["PHP", "USD", "EUR"],
    creditToPHPRate: 11.2,

    // Feature Toggles
    groupSessionsEnabled: true,
    skillExchangeEnabled: true,
    videoCallsEnabled: true,
    chatEnabled: true,
    reviewSystemEnabled: true,

    // Content Management
    featuredSkills: ["React", "Python", "UI/UX Design", "Data Science", "Node.js"],
    sessionTypes: ["Standard", "Intensive", "Group"],
    maxSessionDuration: 180,

    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    maintenanceNotifications: true,

    // Verification Requirements
    mentorVerificationRequired: true,
    portfolioRequired: true,
    linkedInRequired: false,
    minimumExperience: 1,

    // Admin Roles
    adminRoles: [
      { name: "Super Admin", permissions: ["all"] },
      { name: "Content Moderator", permissions: ["user_management", "content_review"] },
      { name: "Support Agent", permissions: ["user_support", "reports"] },
    ],
  })

  const [newSkill, setNewSkill] = useState("")
  const [newSessionType, setNewSessionType] = useState("")
  const [newRole, setNewRole] = useState({ name: "", permissions: [] })

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const addFeaturedSkill = () => {
    if (newSkill && !settings.featuredSkills.includes(newSkill)) {
      handleSettingChange("featuredSkills", [...settings.featuredSkills, newSkill])
      setNewSkill("")
    }
  }

  const removeFeaturedSkill = (skill: string) => {
    handleSettingChange(
      "featuredSkills",
      settings.featuredSkills.filter((s) => s !== skill),
    )
  }

  const addSessionType = () => {
    if (newSessionType && !settings.sessionTypes.includes(newSessionType)) {
      handleSettingChange("sessionTypes", [...settings.sessionTypes, newSessionType])
      setNewSessionType("")
    }
  }

  const removeSessionType = (type: string) => {
    handleSettingChange(
      "sessionTypes",
      settings.sessionTypes.filter((t) => t !== type),
    )
  }

  const saveSettings = () => {
    console.log("Saving settings:", settings)
    // Handle settings save
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600 mt-2">Configure global platform settings and features</p>
        </div>
        <Button onClick={saveSettings} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="admin">Admin Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                General Configuration
              </CardTitle>
              <CardDescription>Basic platform settings and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input
                    id="platform-name"
                    value={settings.platformName}
                    onChange={(e) => handleSettingChange("platformName", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select
                    value={settings.defaultTimezone}
                    onValueChange={(value) => handleSettingChange("defaultTimezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                      <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="platform-description">Platform Description</Label>
                <Textarea
                  id="platform-description"
                  value={settings.platformDescription}
                  onChange={(e) => handleSettingChange("platformDescription", e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Platform Status</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">Temporarily disable platform access for maintenance</p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => handleSettingChange("maintenanceMode", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="registration-enabled">User Registration</Label>
                    <p className="text-sm text-gray-500">Allow new users to register on the platform</p>
                  </div>
                  <Switch
                    id="registration-enabled"
                    checked={settings.registrationEnabled}
                    onCheckedChange={(checked) => handleSettingChange("registrationEnabled", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Configuration
              </CardTitle>
              <CardDescription>Payment processing and commission settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commission-rate">Platform Commission Rate (%)</Label>
                  <Input
                    id="commission-rate"
                    type="number"
                    value={settings.commissionRate}
                    onChange={(e) => handleSettingChange("commissionRate", Number.parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Percentage taken from mentor earnings</p>
                </div>
                <div>
                  <Label htmlFor="credit-rate">Credit to PHP Rate</Label>
                  <Input
                    id="credit-rate"
                    type="number"
                    step="0.1"
                    value={settings.creditToPHPRate}
                    onChange={(e) => handleSettingChange("creditToPHPRate", Number.parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">1 credit = ₱{settings.creditToPHPRate} PHP</p>
                </div>
              </div>


              <div>
                <Label>Supported Currencies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.supportedCurrencies.map((currency) => (
                    <Badge key={currency} variant="secondary">
                      {currency}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Feature Toggles
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="group-sessions">Group Sessions</Label>
                    <p className="text-sm text-gray-500">Allow mentors to host group mentoring sessions</p>
                  </div>
                  <Switch
                    id="group-sessions"
                    checked={settings.groupSessionsEnabled}
                    onCheckedChange={(checked) => handleSettingChange("groupSessionsEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="skill-exchange">Skill Exchange</Label>
                    <p className="text-sm text-gray-500">Enable peer-to-peer skill exchange between mentors</p>
                  </div>
                  <Switch
                    id="skill-exchange"
                    checked={settings.skillExchangeEnabled}
                    onCheckedChange={(checked) => handleSettingChange("skillExchangeEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="video-calls">Video Calls</Label>
                    <p className="text-sm text-gray-500">Enable video calling for mentoring sessions</p>
                  </div>
                  <Switch
                    id="video-calls"
                    checked={settings.videoCallsEnabled}
                    onCheckedChange={(checked) => handleSettingChange("videoCallsEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="chat">Chat System</Label>
                    <p className="text-sm text-gray-500">Enable real-time chat messaging</p>
                  </div>
                  <Switch
                    id="chat"
                    checked={settings.chatEnabled}
                    onCheckedChange={(checked) => handleSettingChange("chatEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reviews">Review System</Label>
                    <p className="text-sm text-gray-500">Allow users to rate and review sessions</p>
                  </div>
                  <Switch
                    id="reviews"
                    checked={settings.reviewSystemEnabled}
                    onCheckedChange={(checked) => handleSettingChange("reviewSystemEnabled", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Featured Skills</CardTitle>
              <CardDescription>Manage skills that appear prominently on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add new featured skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                />
                <Button onClick={addFeaturedSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.featuredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center space-x-1">
                    <span>{skill}</span>
                    <button onClick={() => removeFeaturedSkill(skill)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Configuration</CardTitle>
              <CardDescription>Configure session types and duration limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max-duration">Maximum Session Duration (minutes)</Label>
                <Input
                  id="max-duration"
                  type="number"
                  value={settings.maxSessionDuration}
                  onChange={(e) => handleSettingChange("maxSessionDuration", Number.parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label>Session Types</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    placeholder="Add new session type..."
                    value={newSessionType}
                    onChange={(e) => setNewSessionType(e.target.value)}
                  />
                  <Button onClick={addSessionType}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.sessionTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="flex items-center space-x-1">
                      <span>{type}</span>
                      <button onClick={() => removeSessionType(type)} className="ml-1 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Verification Requirements
              </CardTitle>
              <CardDescription>Configure mentor verification and approval requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mentor-verification">Mentor Verification Required</Label>
                  <p className="text-sm text-gray-500">Require admin approval for new mentors</p>
                </div>
                <Switch
                  id="mentor-verification"
                  checked={settings.mentorVerificationRequired}
                  onCheckedChange={(checked) => handleSettingChange("mentorVerificationRequired", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="portfolio-required">Portfolio Required</Label>
                  <p className="text-sm text-gray-500">Require mentors to submit a portfolio</p>
                </div>
                <Switch
                  id="portfolio-required"
                  checked={settings.portfolioRequired}
                  onCheckedChange={(checked) => handleSettingChange("portfolioRequired", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="linkedin-required">LinkedIn Profile Required</Label>
                  <p className="text-sm text-gray-500">Require LinkedIn profile for verification</p>
                </div>
                <Switch
                  id="linkedin-required"
                  checked={settings.linkedInRequired}
                  onCheckedChange={(checked) => handleSettingChange("linkedInRequired", checked)}
                />
              </div>

              <div>
                <Label htmlFor="min-experience">Minimum Experience (years)</Label>
                <Input
                  id="min-experience"
                  type="number"
                  value={settings.minimumExperience}
                  onChange={(e) => handleSettingChange("minimumExperience", Number.parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum years of experience required for mentors</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Admin Roles & Permissions
              </CardTitle>
              <CardDescription>Manage administrator roles and their permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {settings.adminRoles.map((role, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{role.name}</h4>
                      <Badge variant="outline">{role.permissions.length} permissions</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
