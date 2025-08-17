"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Award,
  Search,
  Layers,
  BarChart3,
  AlertCircle,
  Tags,
  List,
} from "lucide-react"

interface SkillCategory {
  id: number
  name: string
  description?: string
  mentorCount: number
  skills: string[]
  createdAt: string
  updatedAt: string
}

interface UnassignedSkill {
  skillName: string
  mentorCount: number
  mentorNames: string[]
}

interface AllSkill {
  skillName: string
  mentorCount: number
  mentorNames: string[]
  categoryCount: number
  categories: string[]
  isUnassigned: boolean
}

interface CategoryStats {
  totalCategories: number
  totalAssignments: number
  unassignedSkills: number
  averageMentorsPerCategory: number
  mostPopularCategory: string
}

export default function SkillCategoriesManagementPage() {
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [unassignedSkills, setUnassignedSkills] = useState<UnassignedSkill[]>([])
  const [allSkills, setAllSkills] = useState<AllSkill[]>([])
  const [stats, setStats] = useState<CategoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState("")
  const [allSkillsSearchQuery, setAllSkillsSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMultiAssignDialogOpen, setIsMultiAssignDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/skill-categories")
      if (response.ok) {
        const data = await response.json()
        const categoriesData = data.categories || []
        setCategories(categoriesData)

        // Calculate stats with proper initial values
        const totalCategories = categoriesData.length
        const totalAssignments = categoriesData.reduce((sum: number, cat: SkillCategory) => sum + cat.skills.length, 0)
        const totalMentors = categoriesData.reduce((sum: number, cat: SkillCategory) => sum + cat.mentorCount, 0)
        const averageMentorsPerCategory = totalCategories > 0 ? Math.round(totalMentors / totalCategories) : 0
        const mostPopular =
          categoriesData.length > 0
            ? categoriesData.reduce((prev: SkillCategory, current: SkillCategory) =>
                prev.mentorCount > current.mentorCount ? prev : current,
              )
            : null

        setStats({
          totalCategories,
          totalAssignments,
          unassignedSkills: 0, // Will be updated when unassigned skills are fetched
          averageMentorsPerCategory,
          mostPopularCategory: mostPopular?.name || "N/A",
        })
      } else {
        toast.error("Failed to fetch categories")
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Error loading categories")
    }
  }

  // Fetch unassigned skills
  const fetchUnassignedSkills = async () => {
    try {
      const response = await fetch("/api/admin/skill-categories/unassigned")
      if (response.ok) {
        const data = await response.json()
        setUnassignedSkills(data.unassignedSkills || [])

        // Update stats with unassigned skills count
        setStats((prev) =>
          prev
            ? {
                ...prev,
                unassignedSkills: data.unassignedSkills?.length || 0,
              }
            : null,
        )
      } else {
        console.error("Failed to fetch unassigned skills")
      }
    } catch (error) {
      console.error("Error fetching unassigned skills:", error)
    }
  }

  // Fetch all skills
  const fetchAllSkills = async () => {
    try {
      const response = await fetch("/api/admin/skill-categories/all-skills")
      if (response.ok) {
        const data = await response.json()
        setAllSkills(data.allSkills || [])
      } else {
        console.error("Failed to fetch all skills")
      }
    } catch (error) {
      console.error("Error fetching all skills:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchCategories(), fetchUnassignedSkills(), fetchAllSkills()])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Create category
  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      const response = await fetch("/api/admin/skill-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Category created successfully")
        setIsCreateDialogOpen(false)
        setFormData({ name: "", description: "" })
        await Promise.all([fetchCategories(), fetchUnassignedSkills(), fetchAllSkills()])
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create category")
      }
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Error creating category")
    }
  }

  // Update category
  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      const response = await fetch(`/api/admin/skill-categories`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingCategory.id,
          ...formData,
        }),
      })

      if (response.ok) {
        toast.success("Category updated successfully")
        setIsEditDialogOpen(false)
        setEditingCategory(null)
        setFormData({ name: "", description: "" })
        await Promise.all([fetchCategories(), fetchUnassignedSkills(), fetchAllSkills()])
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update category")
      }
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Error updating category")
    }
  }

  // Delete category
  const handleDeleteCategory = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/admin/skill-categories`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: categoryId }),
      })

      if (response.ok) {
        toast.success("Category deleted successfully")
        await Promise.all([fetchCategories(), fetchUnassignedSkills(), fetchAllSkills()])
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to delete category")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Error deleting category")
    }
  }

  // Assign skills to single category
  const handleAssignSkills = async (categoryId: number, skillNames: string[]) => {
    try {
      const response = await fetch("/api/admin/skill-categories/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          skillNames,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)

        if (result.alreadyAssigned && result.alreadyAssigned.length > 0) {
          toast.info(`${result.alreadyAssigned.length} skill(s) were already assigned to this category`)
        }

        setSelectedSkills([])
        await Promise.all([fetchCategories(), fetchUnassignedSkills(), fetchAllSkills()])
      } else {
        const error = await response.json()
        if (error.alreadyAssigned) {
          toast.error(`${error.error}. Skills: ${error.alreadyAssigned.join(", ")}`)
        } else {
          toast.error(error.error || "Failed to assign skills")
        }
      }
    } catch (error) {
      console.error("Error assigning skills:", error)
      toast.error("Error assigning skills")
    }
  }

  // Assign skills to multiple categories
  const handleMultiAssignSkills = async () => {
    if (selectedCategories.length === 0 || selectedSkills.length === 0) {
      toast.error("Please select both skills and categories")
      return
    }

    try {
      let successCount = 0
      let errorCount = 0

      // Assign to each selected category
      for (const categoryId of selectedCategories) {
        try {
          const response = await fetch("/api/admin/skill-categories/assign", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              categoryId,
              skillNames: selectedSkills,
            }),
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully assigned skills to ${successCount} categor${successCount === 1 ? "y" : "ies"}`)
      }

      if (errorCount > 0) {
        toast.error(`Failed to assign to ${errorCount} categor${errorCount === 1 ? "y" : "ies"}`)
      }

      setIsMultiAssignDialogOpen(false)
      setSelectedSkills([])
      setSelectedCategories([])
      await Promise.all([fetchCategories(), fetchUnassignedSkills(), fetchAllSkills()])
    } catch (error) {
      console.error("Error in multi-assign:", error)
      toast.error("Error assigning skills to multiple categories")
    }
  }

  // Open edit dialog
  const openEditDialog = (category: SkillCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
    })
    setIsEditDialogOpen(true)
  }

  // Filter categories based on search
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Filter unassigned skills based on search
  const filteredUnassignedSkills = unassignedSkills.filter((skill) =>
    skill.skillName.toLowerCase().includes(unassignedSearchQuery.toLowerCase()),
  )

  // Filter all skills based on search
  const filteredAllSkills = allSkills.filter((skill) =>
    skill.skillName.toLowerCase().includes(allSkillsSearchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Skill Categories
          </h1>
          <p className="text-gray-600 mt-2">Manage and organize mentor skills into multiple categories</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>Add a new skill category to organize mentor expertise</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Frontend Development"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCategory}>Create Category</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unassignedSkills}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Mentors/ {" "}Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageMentorsPerCategory}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">{stats.mostPopularCategory}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Categories, Unassigned Skills, and All Skills */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned Skills ({unassignedSkills.length})</TabsTrigger>
          <TabsTrigger value="all-skills">All Skills ({allSkills.length})</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search categories, descriptions, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Categories Overview
              </CardTitle>
              <CardDescription>
                Manage your skill categories and view their statistics. Skills can belong to multiple categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery
                      ? "No categories match your search."
                      : "Get started by creating your first skill category."}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Category
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Mentors</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="font-medium">{category.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {category.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {category.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {category.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{category.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{category.mentorCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {new Date(category.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{category.name}"? This will remove all skill
                                    assignments for this category. Skills may still belong to other categories. This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unassigned Skills Tab */}
        <TabsContent value="unassigned" className="space-y-6">
          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search unassigned skills..."
                value={unassignedSearchQuery}
                onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedSkills.length} selected</span>

                {/* Single Category Assignment */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Award className="mr-2 h-4 w-4" />
                      Assign to One
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Skills to Single Category</DialogTitle>
                      <DialogDescription>
                        Select a category to assign the {selectedSkills.length} selected skill(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selected Skills:</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Choose Category:</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                          {categories.map((category) => (
                            <Button
                              key={category.id}
                              variant="outline"
                              className="justify-start bg-transparent"
                              onClick={() => handleAssignSkills(category.id, selectedSkills)}
                            >
                              <Layers className="mr-2 h-4 w-4" />
                              {category.name}
                              <Badge variant="secondary" className="ml-auto">
                                {category.skills.length} skills
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Multiple Categories Assignment */}
                <Dialog open={isMultiAssignDialogOpen} onOpenChange={setIsMultiAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Tags className="mr-2 h-4 w-4" />
                      Assign to Multiple
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Assign Skills to Multiple Categories</DialogTitle>
                      <DialogDescription>
                        Select multiple categories to assign the {selectedSkills.length} selected skill(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selected Skills:</Label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {selectedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Select Categories:</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category.id}`}
                                checked={selectedCategories.includes(category.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCategories([...selectedCategories, category.id])
                                  } else {
                                    setSelectedCategories(selectedCategories.filter((id) => id !== category.id))
                                  }
                                }}
                              />
                              <label
                                htmlFor={`category-${category.id}`}
                                className="flex-1 flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium">{category.name}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {category.skills.length} skills
                                </Badge>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsMultiAssignDialogOpen(false)
                            setSelectedCategories([])
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleMultiAssignSkills} disabled={selectedCategories.length === 0}>
                          Assign to {selectedCategories.length} Categor{selectedCategories.length === 1 ? "y" : "ies"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Unassigned Skills Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Completely Unassigned Skills
              </CardTitle>
              <CardDescription>
                Skills that haven't been assigned to any category yet. Skills can be assigned to multiple categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUnassignedSkills.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {unassignedSearchQuery ? "No matching skills found" : "All skills are assigned!"}
                  </h3>
                  <p className="text-gray-600">
                    {unassignedSearchQuery
                      ? "Try adjusting your search terms."
                      : "Great job! All mentor skills have been categorized."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedSkills.length === filteredUnassignedSkills.length &&
                            filteredUnassignedSkills.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSkills(filteredUnassignedSkills.map((skill) => skill.skillName))
                            } else {
                              setSelectedSkills([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Skill Name</TableHead>
                      <TableHead>Mentor Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnassignedSkills.map((skill) => (
                      <TableRow key={skill.skillName}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSkills.includes(skill.skillName)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSkills([...selectedSkills, skill.skillName])
                              } else {
                                setSelectedSkills(selectedSkills.filter((s) => s !== skill.skillName))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{skill.skillName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{skill.mentorCount}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Skills Tab */}
        <TabsContent value="all-skills" className="space-y-6">
          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search all skills..."
                value={allSkillsSearchQuery}
                onChange={(e) => setAllSkillsSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedSkills.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedSkills.length} selected</span>

                {/* Single Category Assignment */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Award className="mr-2 h-4 w-4" />
                      Assign to One
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Skills to Single Category</DialogTitle>
                      <DialogDescription>
                        Select a category to assign the {selectedSkills.length} selected skill(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selected Skills:</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Choose Category:</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                          {categories.map((category) => (
                            <Button
                              key={category.id}
                              variant="outline"
                              className="justify-start bg-transparent"
                              onClick={() => handleAssignSkills(category.id, selectedSkills)}
                            >
                              <Layers className="mr-2 h-4 w-4" />
                              {category.name}
                              <Badge variant="secondary" className="ml-auto">
                                {category.skills.length} skills
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Multiple Categories Assignment */}
                <Dialog open={isMultiAssignDialogOpen} onOpenChange={setIsMultiAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Tags className="mr-2 h-4 w-4" />
                      Assign to Multiple
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Assign Skills to Multiple Categories</DialogTitle>
                      <DialogDescription>
                        Select multiple categories to assign the {selectedSkills.length} selected skill(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selected Skills:</Label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {selectedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Select Categories:</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`all-category-${category.id}`}
                                checked={selectedCategories.includes(category.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCategories([...selectedCategories, category.id])
                                  } else {
                                    setSelectedCategories(selectedCategories.filter((id) => id !== category.id))
                                  }
                                }}
                              />
                              <label
                                htmlFor={`all-category-${category.id}`}
                                className="flex-1 flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium">{category.name}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {category.skills.length} skills
                                </Badge>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsMultiAssignDialogOpen(false)
                            setSelectedCategories([])
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleMultiAssignSkills} disabled={selectedCategories.length === 0}>
                          Assign to {selectedCategories.length} Categor{selectedCategories.length === 1 ? "y" : "ies"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* All Skills Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5 text-blue-600" />
                All Skills
              </CardTitle>
              <CardDescription>
                View and manage all mentor skills. Assign skills to additional categories even if they're already
                categorized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAllSkills.length === 0 ? (
                <div className="text-center py-12">
                  <List className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {allSkillsSearchQuery ? "No matching skills found" : "No skills available"}
                  </h3>
                  <p className="text-gray-600">
                    {allSkillsSearchQuery
                      ? "Try adjusting your search terms."
                      : "No mentor skills found in the system."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSkills.length === filteredAllSkills.length && filteredAllSkills.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSkills(filteredAllSkills.map((skill) => skill.skillName))
                            } else {
                              setSelectedSkills([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Skill Name</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Mentors</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllSkills.map((skill) => (
                      <TableRow key={skill.skillName}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSkills.includes(skill.skillName)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSkills([...selectedSkills, skill.skillName])
                              } else {
                                setSelectedSkills(selectedSkills.filter((s) => s !== skill.skillName))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{skill.skillName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {skill.categories.length > 0 ? (
                              <>
                                {skill.categories.slice(0, 2).map((category, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {category}
                                  </Badge>
                                ))}
                                {skill.categories.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{skill.categories.length - 2} more
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge className="text-xs">
                                None
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{skill.mentorCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {skill.isUnassigned ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unassigned
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                {skill.categoryCount} categor{skill.categoryCount === 1 ? "y" : "ies"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Frontend Development"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCategory}>Update Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
