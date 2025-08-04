"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X, DollarSign, Star, Zap } from "lucide-react"

type Skill = {
  name: string
  rate: number
}

type MentorSkillInputProps = {
  value: Skill[]
  onChange: (skills: Skill[]) => void
}

export function MentorSkillInput({ value, onChange }: MentorSkillInputProps) {
  const [newSkill, setNewSkill] = useState("")
  const [newRate, setNewRate] = useState("")

  const addSkill = () => {
    if (newSkill && newRate) {
      const skills = [...value, { name: newSkill, rate: Number.parseInt(newRate) }]
      onChange(skills)
      setNewSkill("")
      setNewRate("")
    }
  }

  const removeSkill = (index: number) => {
    const skills = value.filter((_, i) => i !== index)
    onChange(skills)
  }

  return (
    <div className="space-y-8">
      {/* Add New Skill */}
      <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <span>Add Your Skills</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="skillName" className="text-base font-semibold text-gray-700">
                Skill Name
              </Label>
              <Input
                id="skillName"
                placeholder="e.g., JavaScript, React, UI/UX Design"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="h-12 text-base bg-white"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="skillRate" className="text-base font-semibold text-gray-700">
                Rate per Hour (Credits)
              </Label>
              <div className="relative">
                <Input
                  id="skillRate"
                  type="number"
                  placeholder="e.g., 50"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="h-12 text-base bg-white"
                  min="1"
                />
                {newRate && (
                  <div className="absolute -bottom-6 left-0 text-sm text-green-600 font-medium">
                    ≈ ${(Number.parseInt(newRate) / 5).toFixed(2)} USD
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            type="button"
            onClick={addSkill}
            disabled={!newSkill || !newRate}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </CardContent>
      </Card>

      {/* Skills List */}
      {value.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>Your Skills ({value.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {value.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border hover:shadow-md transition-all duration-300"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{skill.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center">
                        <Zap className="w-4 h-4 mr-1 text-blue-500" />
                        {skill.rate} credits/hour
                      </span>
                      <span className="flex items-center text-green-600 font-medium">
                        <DollarSign className="w-4 h-4 mr-1" />${(skill.rate / 5).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSkill(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Info */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Payment Information</h3>
              <p className="text-amber-800 text-sm leading-relaxed">
                You'll be paid in credits that learners purchase. SkillBridge takes a 20% platform fee from each
                session. Credits can be withdrawn to your bank account or PayPal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
