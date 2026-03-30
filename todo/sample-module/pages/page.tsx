'use client'

import { useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Page ────────────────────────────────────────────────────────────────────
// Mirrors the Angular sample.component.html which showcases all input types.

export default function SamplePage() {
  const [color, setColor] = useState('#136bd0')

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Sample Components"
        subtitle="A showcase of all available input types and form elements"
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Inputs</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Input */}
          <div className="space-y-1">
            <p className="text-sm text-slate-500">Basic Input</p>
            <Input type="text" id="input" />
          </div>

          {/* With Label */}
          <div className="space-y-1">
            <Label htmlFor="input-label">Form Input With Label</Label>
            <Input type="text" id="input-label" />
          </div>

          {/* With Placeholder */}
          <div className="space-y-1">
            <Label htmlFor="input-placeholder">Form Input With Placeholder</Label>
            <Input type="text" id="input-placeholder" placeholder="Placeholder" />
          </div>

          {/* Text */}
          <div className="space-y-1">
            <Label htmlFor="input-text">Type Text</Label>
            <Input type="text" id="input-text" placeholder="Text" />
          </div>

          {/* Number */}
          <div className="space-y-1">
            <Label htmlFor="input-number">Type Number</Label>
            <Input type="number" id="input-number" placeholder="Number" />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="input-password">Type Password</Label>
            <Input type="password" id="input-password" placeholder="Password" />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="input-email">Type Email</Label>
            <Input type="email" id="input-email" placeholder="email@xyz.com" />
          </div>

          {/* Tel */}
          <div className="space-y-1">
            <Label htmlFor="input-tel">Type Tel</Label>
            <Input type="tel" id="input-tel" placeholder="+1100-2031-1233" />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="input-date">Type Date</Label>
            <Input type="date" id="input-date" />
          </div>

          {/* Week */}
          <div className="space-y-1">
            <Label htmlFor="input-week">Type Week</Label>
            <Input type="week" id="input-week" />
          </div>

          {/* Month */}
          <div className="space-y-1">
            <Label htmlFor="input-month">Type Month</Label>
            <Input type="month" id="input-month" />
          </div>

          {/* Time */}
          <div className="space-y-1">
            <Label htmlFor="input-time">Type Time</Label>
            <Input type="time" id="input-time" />
          </div>

          {/* Datetime-local */}
          <div className="space-y-1">
            <Label htmlFor="input-datetime-local">Type datetime-local</Label>
            <Input type="datetime-local" id="input-datetime-local" />
          </div>

          {/* Search */}
          <div className="space-y-1">
            <Label htmlFor="input-search">Type Search</Label>
            <Input type="search" id="input-search" placeholder="Search" />
          </div>

          {/* Submit */}
          <div className="space-y-1">
            <Label htmlFor="input-submit">Type Submit</Label>
            <Button type="submit" className="w-full">Submit</Button>
          </div>

          {/* Reset */}
          <div className="space-y-1">
            <Label>Type Reset</Label>
            <Button type="reset" variant="outline" className="w-full">Reset</Button>
          </div>

          {/* Button */}
          <div className="space-y-1">
            <Label>Type Button</Label>
            <Button type="button" className="w-full">Button</Button>
          </div>

          {/* Color + Checkbox + Radio row */}
          <div className="space-y-3">
            <div>
              <Label>Type Color</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-1 h-9 w-16 rounded-md border border-slate-200 cursor-pointer p-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="sample-checkbox" defaultChecked />
              <Label htmlFor="sample-checkbox">Type Checkbox</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="sample-radio" defaultChecked className="h-4 w-4" />
              <Label htmlFor="sample-radio">Type Radio</Label>
            </div>
          </div>

          {/* File */}
          <div className="space-y-1">
            <Label htmlFor="file-input">Type File</Label>
            <Input type="file" id="file-input" />
          </div>

          {/* URL */}
          <div className="space-y-1">
            <Label htmlFor="input-url">Type Url</Label>
            <Input type="url" id="input-url" placeholder="http://example.com" />
          </div>

          {/* Disabled */}
          <div className="space-y-1">
            <Label htmlFor="input-disabled">Type Disabled</Label>
            <Input type="text" id="input-disabled" placeholder="Disabled input" disabled />
          </div>

          {/* Readonly */}
          <div className="space-y-1">
            <Label htmlFor="input-readonlytext">Input Readonly Text</Label>
            <Input type="text" id="input-readonlytext" readOnly defaultValue="email@example.com" />
          </div>

          {/* Disabled + Readonly */}
          <div className="space-y-1">
            <Label htmlFor="disabled-readonlytext">Disabled Readonly Input</Label>
            <Input
              type="text"
              id="disabled-readonlytext"
              defaultValue="Disabled readonly input"
              disabled
              readOnly
            />
          </div>

          {/* Textarea */}
          <div className="space-y-1">
            <Label htmlFor="text-area">Textarea</Label>
            <textarea
              id="text-area"
              rows={3}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Datalist */}
          <div className="space-y-1">
            <Label htmlFor="input-DataList">Datalist Example</Label>
            <input
              type="text"
              list="datalistOptions"
              id="input-DataList"
              placeholder="Type to search..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="datalistOptions">
              <option value="San Francisco" />
              <option value="New York" />
              <option value="Seattle" />
              <option value="Los Angeles" />
              <option value="Chicago" />
            </datalist>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
