import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type InvoiceData = {
  invoiceNumber: string;
  date: string;
  customer: { name?: string | null; email?: string | null; company?: string | null; address?: string | null };
  items: Array<{ name: string; quantity: number; priceUsd: number }>;
  totalUsd: number;
  notes?: string | null;
};

export function downloadInvoicePdf(d: InvoiceData) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("INVOICE", 14, 20);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${d.invoiceNumber}`, 14, 30);
  doc.text(`Date: ${d.date}`, 14, 36);

  doc.setFontSize(11);
  doc.text("Jelfie Jewellers", 140, 20);
  doc.setFontSize(9);
  doc.text("hello@jelfie.com", 140, 26);

  doc.setFontSize(10);
  doc.text("Bill To:", 14, 50);
  let y = 56;
  if (d.customer.company) { doc.text(d.customer.company, 14, y); y += 5; }
  if (d.customer.name) { doc.text(d.customer.name, 14, y); y += 5; }
  if (d.customer.email) { doc.text(d.customer.email, 14, y); y += 5; }
  if (d.customer.address) { doc.text(d.customer.address, 14, y); y += 5; }

  autoTable(doc, {
    startY: y + 6,
    head: [["Item", "Qty", "Unit Price", "Amount"]],
    body: d.items.map((i) => [
      i.name,
      String(i.quantity),
      `$${i.priceUsd.toFixed(2)}`,
      `$${(i.priceUsd * i.quantity).toFixed(2)}`,
    ]),
    foot: [["", "", "Total", `$${d.totalUsd.toFixed(2)}`]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 20, 20] },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
  });

  if (d.notes) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(9);
    doc.text("Notes:", 14, finalY + 10);
    doc.text(doc.splitTextToSize(d.notes, 180), 14, finalY + 16);
  }

  doc.save(`invoice-${d.invoiceNumber}.pdf`);
}
