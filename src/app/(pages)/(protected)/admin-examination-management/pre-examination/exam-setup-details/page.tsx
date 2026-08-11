"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { ColDef } from "ag-grid-community";
import {
  domainList,
  buildQuery,
  getExamSetupDetailsList,
  getExamSetupMasterList,
  saveExamSetupDetail,
} from "@/services";

type AnyRow = Record<string, any>;

export default function ExamSetupDetailsPage() {
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [collegeId, setCollegeId] = useState<string | null>(null);

  const [rowData, setRowData] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnyRow | null>(null);
  const [setupMasters, setSetupMasters] = useState<AnyRow[]>([]);
  const [internalPatternCategories, setInternalPatternCategories] = useState<
    AnyRow[]
  >([]);

  // Modal Form State
  const [question, setQuestion] = useState("");
  const [optionName, setOptionName] = useState("");
  const [detailCode, setDetailCode] = useState("");
  const [internalpatternCatId, setInternalpatternCatId] = useState<
    string | null
  >(null);
  const [marks, setMarks] = useState<number>(0);
  const [examFCARSetMasterId, setExamFCARSetMasterId] = useState<
    string | null
  >(null);
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");
  const [submitting, setSubmitting] = useState(false);

  // Load Colleges
  useEffect(() => {
    domainList<AnyRow>("College", buildQuery({ isActive: true }))
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setColleges(list);
        if (list.length > 0) {
          const firstId = String(list[0].collegeId);
          setCollegeId(firstId);
          void loadSetupDetails(firstId);
        }
      })
      .catch((err) => {
        setColleges([]);
        toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
      });
  }, []);

  const loadSetupDetails = async (cid: string) => {
    setLoading(true);
    try {
      const data = await getExamSetupDetailsList(Number(cid));
      setRowData(Array.isArray(data) ? data : []);
    } catch (err) {
      setRowData([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeChange = (val: string | null) => {
    setCollegeId(val);
    if (val) void loadSetupDetails(val);
    else setRowData([]);
  };

  const selectedCollegeCode = useMemo(() => {
    if (!collegeId) return "";
    const found = colleges.find((c) => String(c.collegeId) === collegeId);
    return found?.collegeCode ?? collegeId;
  }, [colleges, collegeId]);

  const openAddModal = async () => {
    if (!collegeId) {
      toastError("Please select a college first.");
      return;
    }
    setEditingItem(null);
    setQuestion("");
    setOptionName("");
    setDetailCode("");
    setInternalpatternCatId(null);
    setMarks(0);
    setExamFCARSetMasterId(null);
    setIsActive(true);
    setReason("active");

    const masters = await getExamSetupMasterList(Number(collegeId)).catch(() => []);
    setSetupMasters(masters);

    const patterns = await domainList<AnyRow>(
      "GeneralDetail",
      buildQuery({ generalMasterCode: "INTERNALPATTERN", isActive: true }),
    ).catch(() => []);
    setInternalPatternCategories(Array.isArray(patterns) ? patterns : []);

    setModalOpen(true);
  };

  const openEditModal = async (item: AnyRow) => {
    setEditingItem(item);
    setQuestion(item.question ?? "");
    setOptionName(item.optionName ?? "");
    setDetailCode(item.detailCode ?? "");
    setInternalpatternCatId(
      item.internalpatternCatId ? String(item.internalpatternCatId) : null,
    );
    setMarks(Number(item.marks) || 0);
    setExamFCARSetMasterId(
      item.examFCARSetMasterId ? String(item.examFCARSetMasterId) : null,
    );
    setIsActive(item.isActive !== false);
    setReason(item.reason ?? "active");

    if (collegeId) {
      const masters = await getExamSetupMasterList(Number(collegeId)).catch(() => []);
      setSetupMasters(masters);

      const patterns = await domainList<AnyRow>(
        "GeneralDetail",
        buildQuery({ generalMasterCode: "INTERNALPATTERN", isActive: true }),
      ).catch(() => []);
      setInternalPatternCategories(Array.isArray(patterns) ? patterns : []);
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!question) {
      toastError("Question is required.");
      return;
    }
    if (!collegeId) {
      toastError("Please select a college.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: AnyRow = {
        question,
        optionName: optionName || null,
        detailCode: detailCode || null,
        internalpatternCatId: internalpatternCatId
          ? Number(internalpatternCatId)
          : null,
        marks,
        examFCARSetMasterId: examFCARSetMasterId
          ? Number(examFCARSetMasterId)
          : null,
        collegeId: Number(collegeId),
        isActive,
        reason: isActive ? "active" : reason,
      };

      if (editingItem) {
        payload.examFCARSetDetId = editingItem.examFCARSetDetId;
        payload.createdDt = editingItem.createdDt;
        payload.createdUser = editingItem.createdUser;
      }

      await saveExamSetupDetail(payload);
      toastSuccess(
        editingItem
          ? "Exam setup details updated successfully."
          : "Exam setup details added successfully.",
      );
      setModalOpen(false);
      void loadSetupDetails(collegeId);
    } catch (err) {
      toastError(getErrorMessage(err) || "Failed to save exam setup details.");
    } finally {
      setSubmitting(false);
    }
  };

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI No.",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: "question", headerName: "Question", minWidth: 200, flex: 1 },
      { field: "optionName", headerName: "Option", minWidth: 140 },
      { field: "markSetupName", headerName: "Marks Setup", minWidth: 160 },
      { field: "detailCode", headerName: "Detail Code", minWidth: 120 },
      {
        field: "internalpatternCatCode",
        headerName: "Internal Pattern",
        minWidth: 180,
      },
      { field: "marks", headerName: "Marks", width: 90, type: "rightAligned" },
      {
        field: "isActive",
        headerName: "Status",
        width: 120,
        cellRenderer: (p: any) => (
          <span
            className={`font-semibold ${
              p.value ? "text-green-700" : "text-red-600"
            }`}
          >
            {p.value ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        headerName: "Actions",
        width: 90,
        cellRenderer: (p: any) => (
          <button
            type="button"
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            onClick={() => void openEditModal(p.data)}
          >
            <Pencil className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [collegeId],
  );

  return (
    <>
      <FilteredListPage
        title="Exam Setup Details"
        loading={loading}
        rowData={rowData}
        columnDefs={columnDefs}
        filters={
          <div className="flex items-center gap-3">
            <div className="w-[240px]">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={(v) => handleCollegeChange(v)}
                options={colleges.map((c) => ({
                  value: String(c.collegeId),
                  label: c.collegeCode ?? String(c.collegeId),
                }))}
                placeholder="Select College"
              />
            </div>
          </div>
        }
        toolbarTrailing={
          <Button
            className="bg-[#0f2d59] text-white hover:bg-[#0c2340] h-9 px-4 text-xs font-semibold"
            onClick={() => void openAddModal()}
          >
            + Add Setup Details
          </Button>
        }
      />

      {/* Add/Edit Setup Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Exam Setup Details" : "Add Exam Setup Details"}
            </DialogTitle>
          </DialogHeader>

          <div className="bg-[#f8f9fa] p-3 rounded border mb-2 text-xs font-semibold text-[#0f2d59]">
            College : <span className="font-bold text-blue-600">{selectedCollegeCode}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-sm">
            <div className="space-y-1">
              <Select
                label="Exam Setup Master"
                value={examFCARSetMasterId}
                onChange={(v) => setExamFCARSetMasterId(v)}
                options={setupMasters.map((m) => ({
                  value: String(m.examFCARSetMasterId),
                  label: m.markSetupName ?? String(m.examFCARSetMasterId),
                }))}
                placeholder="Select Exam Setup Master"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700">
                Question <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter Question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700">Option</label>
              <Input
                placeholder="Enter Option Name"
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700">Detail Code</label>
              <Input
                placeholder="Enter Detail Code"
                value={detailCode}
                onChange={(e) => setDetailCode(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Internal Pattern"
                value={internalpatternCatId}
                onChange={(v) => setInternalpatternCatId(v)}
                options={internalPatternCategories.map((p) => ({
                  value: String(p.generalDetailId),
                  label: p.generalDetailDisplayName ?? p.generalDetailName ?? String(p.generalDetailId),
                }))}
                placeholder="Select Internal Pattern"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700">Marks</label>
              <Input
                type="number"
                placeholder="Enter Marks"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value) || 0)}
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4 items-center pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={(c) => setIsActive(!!c)}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
              {!isActive && (
                <div className="space-y-1">
                  <label className="font-medium text-gray-700">Reason</label>
                  <Input
                    placeholder="Enter Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-[#0f2d59] text-white hover:bg-[#0c2340]"
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
