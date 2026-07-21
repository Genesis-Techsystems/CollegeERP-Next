"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { LibraryGridPage } from "../_components/LibraryGridPage";
import { QK } from "@/lib/query-keys";
import {
  generateBooksBarcode,
  listBooksWithoutGeneratedBarcodes,
  type LibraryRow,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";

const COL_DEFS = {
  accessionno: {
    field: "accessionno",
    headerName: "Accession No",
    minWidth: 120,
  } as ColDef<LibraryRow>,
  bookTitle: {
    field: "bookTitle",
    headerName: "Book",
    minWidth: 180,
  } as ColDef<LibraryRow>,
  authors: {
    headerName: "Author",
    minWidth: 140,
    valueGetter: (params) =>
      params.data?.authors ?? params.data?.bookAuthor ?? "",
  } as ColDef<LibraryRow>,
  libraryCode: {
    field: "libraryCode",
    headerName: "Library",
    minWidth: 110,
  } as ColDef<LibraryRow>,
  shelveName: {
    field: "shelveName",
    headerName: "Shelve",
    minWidth: 110,
  } as ColDef<LibraryRow>,
  bookPosition: {
    field: "bookPosition",
    headerName: "Book Position",
    minWidth: 120,
  } as ColDef<LibraryRow>,
  availabilityStatus: {
    field: "availabilityStatus",
    headerName: "Availability Status",
    minWidth: 140,
  } as ColDef<LibraryRow>,
  barcode: {
    headerName: "BarCode",
    minWidth: 150,
    flex: 0,
  } as ColDef<LibraryRow>,
};

function availabilityRenderer(params: ICellRendererParams<LibraryRow>) {
  const available =
    params.data?.availabilityStatus === 1 ||
    params.data?.availabilityStatus === true ||
    params.data?.availabilityStatus === "1";
  return (
    <StatusBadge
      status={available}
      label={available ? "Available" : "Not Available"}
    />
  );
}

function makeBarcodeRenderer(
  generate: (accessionNumber: string) => void,
  disabled: boolean,
) {
  return (params: ICellRendererParams<LibraryRow>) => {
    const accessionNumber = String(params.data?.accessionno ?? "").trim();
    return (
      <Button
        type="button"
        size="sm"
        className="h-7 px-2 text-[11px]"
        disabled={disabled || !accessionNumber}
        onClick={() => generate(accessionNumber)}
      >
        Generate Barcode
      </Button>
    );
  };
}

export default function BooksBarcodePage() {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerateBarcode = useCallback(
    async (accessionNumber?: string) => {
      setGenerating(true);
      try {
        await generateBooksBarcode(
          accessionNumber ? [accessionNumber] : undefined,
        );
        toastSuccess("Book barcodes generated");
        await queryClient.invalidateQueries({
          queryKey: QK.library.booksWithoutBarcode(),
        });
      } catch (e) {
        toastError(e, "Could not generate book barcodes");
      } finally {
        setGenerating(false);
      }
    },
    [queryClient],
  );

  const columns = useMemo<ColDef<LibraryRow>[]>(
    () => [
      COL_DEFS.accessionno,
      COL_DEFS.bookTitle,
      COL_DEFS.authors,
      COL_DEFS.libraryCode,
      COL_DEFS.shelveName,
      COL_DEFS.bookPosition,
      {
        ...COL_DEFS.availabilityStatus,
        cellRenderer: availabilityRenderer,
      },
      {
        ...COL_DEFS.barcode,
        cellRenderer: makeBarcodeRenderer(
          (accessionNumber) => void handleGenerateBarcode(accessionNumber),
          generating,
        ),
      },
    ],
    [generating, handleGenerateBarcode],
  );

  return (
    <LibraryGridPage
      title="Books Barcode"
      queryKey={QK.library.booksWithoutBarcode()}
      queryFn={listBooksWithoutGeneratedBarcodes}
      columns={columns}
      searchPlaceholder="Search by barcode or title…"
      showHeaderCard={false}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-[12px]"
          disabled={generating}
          onClick={() => void handleGenerateBarcode()}
        >
          Generate Barcode
        </Button>
      }
    />
  );
}
