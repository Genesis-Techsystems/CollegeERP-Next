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
          color: rgb(0, 0, 0);
          font-family: "Times New Roman", Times, serif;
        }
        .certificate-screen-only {
          display: none !important;
        }
      }

      /* Angular .borderHeigt */
      .certificate-border {
        padding: 20px;
        height: 699px;
        max-height: 699px;
        width: 1000px;
        max-width: 1000px;
        border: 3px solid rgb(0, 0, 0);
        margin: 0 auto 10px;
        box-sizing: border-box;
        font-family: "Times New Roman", Times, serif;
        color: rgb(0, 0, 0);
      }

      /* Angular .borderHeigt-2 */
      .certificate-border-2 {
        padding: 20px;
        min-height: 850px;
        height: 850px;
        max-height: 850px;
        width: 1000px;
        max-width: 1000px;
        border: 3px solid rgb(0, 0, 0);
        margin: 0 auto;
        box-sizing: border-box;
        font-family: "Times New Roman", Times, serif;
        color: rgb(0, 0, 0);
      }

      /* Angular .p-1 */
      .certificate-p1 {
        font-size: 30px;
        margin: 3px;
        margin-bottom: -7px;
        color: rgb(0, 0, 0);
        text-align: center;
        font-weight: bold;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .p-5 */
      .certificate-p5 {
        font-size: 22px;
        margin: 3px;
        margin-bottom: -7px;
        color: rgb(0, 0, 0);
        text-align: center;
        font-weight: bold;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .p-3 */
      .certificate-p3 {
        display: inline-block;
        padding: 1px 0;
        font-size: 22px;
        color: rgb(0, 0, 0);
        font-weight: 500;
        margin: 17px 0;
        line-height: 2;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .p-date */
      .certificate-p-date {
        font-size: 24px;
        margin: 3px;
        margin-bottom: -7px;
        color: rgb(0, 0, 0);
        text-align: right;
        font-weight: bold;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .p-date1 */
      .certificate-p-date1 {
        font-size: 16px;
        margin: 3px;
        margin-bottom: -7px;
        color: rgb(0, 0, 0);
        text-align: right;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .span1–.span5 */
      .certificate-span {
        border-bottom: 1px dotted #000;
        text-decoration: none;
        text-align: center;
        text-transform: capitalize;
        font-weight: bold;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .data */
      .certificate-data {
        text-transform: capitalize;
        font-weight: bold;
        font-family: "Times New Roman", Times, serif;
      }

      /* Angular .img-logo + circular img rule */
      .certificate-img-logo {
        margin: 20px;
        height: 110px;
        width: 110px;
        max-width: 100%;
        object-fit: contain;
        vertical-align: top;
        border: none;
        border-radius: 50%;
      }

      .certificate-print-root {
        font-family: "Times New Roman", Times, serif;
        color: rgb(0, 0, 0);
      }

      .certificate-print-root p {
        margin: 3px;
        font-weight: 500;
        font-family: "Times New Roman", Times, serif;
      }
    `}</style>
  );
}
