"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Layers, Tag, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { SkillCategory, SkillCategoryAssignment } from "./types"

interface SkillCategoryManagerProps {
  mentorSkills: Array<{
    skillName: string
    ratePerHour: number
  }>
  onAssignmentsChange: (assignments: SkillCategoryAssignment[]) => void
}

export function SkillCategoryManager({ mentorSkills, onAssignmentsChange }: SkillCategoryManagerProps) {
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [assignments, setAssignments] = useState<SkillCategoryAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Fetch existing categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/admin/skill-categories")
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        } else {
          console.error("Failed to fetch categories")
          toast.error("Failed to load skill categories")
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast.error("Error loading skill categories")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Update parent component when assignments change
  useEffect(() => {
    onAssignmentsChange(assignments)
  }, [assignments, onAssignmentsChange])

  const handleSkillCategoryChange = (skillName: string, categoryId: string) => {
    if (categoryId === "none") {
      // Remove assignment
      setAssignments((prev) => prev.filter((a) => a.skillName !== skillName))
    } else {
      // Add or update assignment
      setAssignments((prev) => {
        const filtered = prev.filter((a) => a.skillName !== skillName)
        return [...filtered, { skillName, categoryId: Number.parseInt(categoryId) }]
      })
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/admin/skill-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCategories((prev) => [...prev, data.category])
        setNewCategoryName("")
        setNewCategoryDescription("")
        setIsCreateDialogOpen(false)
        toast.success("Category created successfully")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create category")
      }
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Error creating category")
    } finally {
      setIsCreating(false)
    }
  }

  const getAssignedCategory = (skillName: string) => {
    const assignment = assignments.find((a) => a.skillName === skillName)
    return assignment ? assignment.categoryId.toString() : "none"
  }

  const getAssignmentSummary = () => {
    const assignedSkills = assignments.length
    const totalSkills = mentorSkills.length
    const unassignedSkills = totalSkills - assignedSkills

    return { assignedSkills, totalSkills, unassignedSkills }
  }

  const { assignedSkills, totalSkills, unassignedSkills } = getAssignmentSummary()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-600" />
            Assignment Summary
          </CardTitle>
          <CardDescription>Track the progress of skill categorization for this mentor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignedSkills}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unassignedSkills}</div>
              <div className="text-sm text-gray-600">Unassigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalSkills}</div>
              <div className="text-sm text-gray-600">Total Skills</div>
            </div>
          </div>
          {assignedSkills === totalSkills && totalSkills > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">All skills have been categorized!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Category */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Skill Category Assignments</h3>
          <p className="text-sm text-gray-600">Assign each skill to an appropriate category</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>Add a new skill category that can be used to organize mentor skills</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Web Development & Programming"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category-description">Description (Optional)</Label>
                <Textarea
                  id="category-description"
                  placeholder="Brief description of this category..."
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCategory} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Skills Assignment */}
      <div className="space-y-4">
        {mentorSkills.map((skill, index) => {
          const assignedCategoryId = getAssignedCategory(skill.skillName)
          const assignedCategory = categories.find((c) => c.id.toString() === assignedCategoryId)

          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-medium">
                      {skill.skillName}
                    </Badge>
                    <span className="text-sm text-gray-500">{skill.ratePerHour} credits/hour</span>
                  </div>
                  {assignedCategory && (
                    <div className="mt-2 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-purple-700 font-medium">{assignedCategory.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={assignedCategoryId}
                    onValueChange={(value) => handleSkillCategoryChange(skill.skillName, value)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-gray-500">No category</span>
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-500" />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignedCategoryId !== "none" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Warning for unassigned skills */}
      {unassignedSkills > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="text-orange-800 font-medium">
              {unassignedSkills} skill{unassignedSkills === 1 ? "" : "s"} not categorized
            </p>
            <p className="text-orange-700 text-sm mt-1">
              Consider assigning all skills to categories to help learners find this mentor more easily.
            </p>
          </div>
        </div>
      )}

      <Separator />

      <div className="text-sm text-gray-600">
        <p>
          <strong>Note:</strong> Category assignments will be saved when you approve this mentor application. Skills
          without categories will still be available but may be harder for learners to discover.
        </p>
      </div>
    </div>
  )
}
