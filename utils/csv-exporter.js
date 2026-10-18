// ReviewSpy AI - CSV Exporter Utility
export class CsvExporter {
  static sanitizeCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  static exportReviews(reviews, filename = 'product_reviews.csv') {
    if (!reviews || reviews.length === 0) {
      throw new Error('No reviews to export.');
    }

    const headers = ['ID', 'Rating', 'Title', 'Review Body', 'Date', 'Verified Purchase'];
    const rows = reviews.map(r => [
      CsvExporter.sanitizeCell(r.id),
      CsvExporter.sanitizeCell(r.rating),
      CsvExporter.sanitizeCell(r.title),
      CsvExporter.sanitizeCell(r.body),
      CsvExporter.sanitizeCell(r.date),
      CsvExporter.sanitizeCell(r.verified ? 'Yes' : 'No')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
