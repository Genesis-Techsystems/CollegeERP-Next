export function CertificatePrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden;
        }
        .certificate-print-root,
        .certificate-print-root * {
          visibility: visible;
        }
        .certificate-print-root {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .certificate-screen-only {
          display: none !important;
        }
      }

      .certificate-border {
        padding: 20px;
        height: 700px;
        max-height: 700px;
        width: 1000px;
        max-width: 1000px;
        border: double rgb(0, 0, 0) rgb(0, 0, 0);
        margin: 0 auto 10px;
      }

      .certificate-border-2 {
        padding: 20px;
        min-height: 850px;
        width: 1000px;
        max-width: 1000px;
        border: 3px solid rgb(0, 0, 0);
        margin: 0 auto;
      }

      .certificate-p1 {
        font-size: 30px;
        margin-bottom: -7px;
        color: rgb(0, 0, 0);
        text-align: center;
        font-weight: bold;
      }

      .certificate-p3 {
        display: inline-block;
        font-size: 22px;
        color: rgb(0, 0, 0);
        font-weight: 500;
        margin: 17px 0;
        line-height: 2;
      }

      .certificate-p-date {
        text-align: right;
        font-size: 18px;
        font-weight: 500;
      }

      .certificate-span {
        border-bottom: 1px dotted #000;
        text-align: center;
        text-transform: capitalize;
        font-weight: bold;
      }

      .certificate-data {
        text-transform: capitalize;
        font-weight: bold;
      }
    `}</style>
  );
}
