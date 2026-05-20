'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaperSize = 'a4' | 'a3' | 'letter'

interface Employee {
  name: string
  department: string
  position: string
  salary: number
}

// ─── Sample data (mirrors Angular pdf-download component) ─────────────────────

const employees: Employee[] = [
  { name: 'Alice',   department: 'HR',        position: 'Manager',     salary: 65000 },
  { name: 'Bob',     department: 'IT',        position: 'Developer',   salary: 72000 },
  { name: 'Charlie', department: 'Finance',   position: 'Analyst',     salary: 58000 },
  { name: 'David',   department: 'Marketing', position: 'Executive',   salary: 54000 },
  { name: 'Eva',     department: 'IT',        position: 'Designer',    salary: 60000 },
  { name: 'Frank',   department: 'Sales',     position: 'Associate',   salary: 50000 },
  { name: 'Grace',   department: 'HR',        position: 'Recruiter',   salary: 55000 },
  { name: 'Henry',   department: 'Finance',   position: 'Accountant',  salary: 63000 },
  { name: 'Ivy',     department: 'IT',        position: 'Tester',      salary: 57000 },
  { name: 'Jack',    department: 'Marketing', position: 'Manager',     salary: 67000 },
  { name: 'Karen',   department: 'Sales',     position: 'Lead',        salary: 71000 },
  { name: 'Leo',     department: 'Finance',   position: 'Consultant',  salary: 64000 },
  { name: 'Mona',    department: 'HR',        position: 'Clerk',       salary: 48000 },
  { name: 'Nate',    department: 'IT',        position: 'Admin',       salary: 69000 },
  { name: 'Olivia',  department: 'Sales',     position: 'Executive',   salary: 53000 },
  { name: 'Paul',    department: 'Finance',   position: 'Manager',     salary: 75000 },
  { name: 'Quinn',   department: 'Marketing', position: 'Coordinator', salary: 62000 },
  { name: 'Rita',    department: 'HR',        position: 'Officer',     salary: 52000 },
  { name: 'Sam',     department: 'IT',        position: 'Engineer',    salary: 70000 },
  { name: 'Tina',    department: 'Sales',     position: 'Assistant',   salary: 46000 },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PdfDownloadPage() {
  const pdfContentRef = useRef<HTMLDivElement>(null)
  const [paperSize, setPaperSize] = useState<PaperSize>('a4')
  const [isLandscape, setIsLandscape] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!pdfContentRef.current) return
    setDownloading(true)
    try {
      // Dynamic import to avoid SSR issues
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const element = pdfContentRef.current
      const fullCanvas = await html2canvas(element, { scale: 2 })

      const orientation = isLandscape ? 'landscape' : 'portrait'
      const pdf = new jsPDF(orientation, 'mm', paperSize)

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const usableWidth = pageWidth - margin * 2
      const usableHeight = pageHeight - margin * 2

      const originalWidth = fullCanvas.width
      const originalHeight = fullCanvas.height
      const scale = usableWidth / originalWidth
      const pageHeightPx = usableHeight / scale

      const pageCanvas = document.createElement('canvas')
      const pageCtx = pageCanvas.getContext('2d')!

      let renderedHeight = 0
      let remainingHeight = originalHeight
      let pageIndex = 0

      while (remainingHeight > 0) {
        pageCanvas.width = originalWidth
        pageCanvas.height = Math.min(pageHeightPx, remainingHeight)
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height)
        pageCtx.drawImage(
          fullCanvas,
          0, renderedHeight, originalWidth, pageCanvas.height,
          0, 0, originalWidth, pageCanvas.height,
        )
        const imgData = pageCanvas.toDataURL('image/png')
        if (pageIndex > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, pageCanvas.height * scale)
        renderedHeight += pageHeightPx
        remainingHeight -= pageHeightPx
        pageIndex++
      }

      const totalPages = pageIndex
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(10)
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' })
      }

      pdf.save(`report-${paperSize}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="PDF Download"
        subtitle="Preview and download reports as PDF"
        action={
          <div className="flex items-center gap-3">
            {/* Paper size */}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Paper Size</Label>
              <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Orientation</Label>
              <Select
                value={isLandscape ? 'landscape' : 'portrait'}
                onValueChange={(v) => setIsLandscape(v === 'landscape')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4 mr-1" />
              {downloading ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        }
      />

      {/* Printable content */}
      <div
        ref={pdfContentRef}
        className="rounded-xl border border-slate-200 bg-white p-6 overflow-x-auto"
      >
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Employee Report</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-2 font-semibold text-slate-700">SI.No</th>
              <th className="text-left p-2 font-semibold text-slate-700">Name</th>
              <th className="text-left p-2 font-semibold text-slate-700">Department</th>
              <th className="text-left p-2 font-semibold text-slate-700">Position</th>
              <th className="text-right p-2 font-semibold text-slate-700">Salary</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2 text-slate-500">{i + 1}</td>
                <td className="p-2">{emp.name}</td>
                <td className="p-2">{emp.department}</td>
                <td className="p-2">{emp.position}</td>
                <td className="p-2 text-right">₹{emp.salary.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
