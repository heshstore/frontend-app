import React from "react";

const printStyles = `
@media print {
  .no-print, nav, header, .sidebar, .action-buttons, .back-button {
    display: none !important;
  }
  body {
    background: white !important;
    color: black !important;
    font-family: Arial, sans-serif;
    font-size: 12pt;
  }
  .print-content {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 10mm;
  }
  @page {
    size: A4;
    margin: 15mm;
  }
}
`;

export default function PrintLayout({ children }) {
  return (
    <>
      <style>{printStyles}</style>
      <div className="print-content">{children}</div>
    </>
  );
}
