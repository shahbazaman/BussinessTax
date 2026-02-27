export const exportToCSV = (data, fileName) => {
  if (!data || !data.length) return alert("No data to export");
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row => 
    Object.values(row).map(value => `"${value}"`).join(",") 
  ).join("\n");
  const blob = new Blob([[headers, rows].join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
};