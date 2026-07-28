export function ExamFormPrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden;
        }
        .exam-form-print-root,
        .exam-form-print-root * {
          visibility: visible;
        }
        .exam-form-print-root {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .exam-form-screen-only {
          display: none !important;
        }
      }
    `}</style>
  );
}
