import { useState } from "react";
import {
  Box,
  Typography,
  Button,
} from "@mui/material";
import {
  Add as AddIcon,
} from "@mui/icons-material";

function Data() {
    const [importStatus, setImportStatus] = useState("");
    const [importSummary, setImportSummary] = useState(null);
    const [excelFile, setExcelFile] = useState(null);

    const handleFileChange = (e) => {
        setExcelFile(e.target.files[0]);
    };

    const handleImportClick = async () => {
        if (!excelFile) {
            setImportStatus("Please select an Excel file.");
            return;
        }
        setImportStatus("Importing...");
        setImportSummary(null);
        try {
            const formData = new FormData();
            formData.append("file", excelFile);

            const response = await fetch("/api/import-sefr/", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                setImportStatus("Import successful!");
                setImportSummary(data.summary);
            } else {
                setImportStatus("Import failed: " + (data.error || "Unknown error"));
                setImportSummary(null);
            }
        } catch (err) {
            setImportStatus("Import failed: " + err.message);
            setImportSummary(null);
        }
    };
    
    
    return <div>
        <h1> Data </h1>

        {/* Import Status */}
        <Box sx={{ mt: 4 }}>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          <Button
            variant="outlined"
            onClick={handleImportClick}
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2, mb: 2 }}
          >
            Import SEFR Excel
          </Button>
          {importStatus && (
            <Typography variant="body2" color="text.secondary">
              {importStatus}
            </Typography>
          )}
          {importSummary && (
            <div>
                <h4>Import Summary</h4>
                <ul>
                    <li>Total rows processed: {importSummary.total_rows}</li>
                    <li>Successfully imported: {importSummary.success_count}</li>
                    <li>Skipped (duplicates): {importSummary.skipped_count}</li>
                    <li>Errors: {importSummary.error_count}</li>
                </ul>
                {importSummary.imported_factors && importSummary.imported_factors.length > 0 && (
                    <div>
                        <strong>Imported Emission Factors:</strong>
                        <ul>
                            {importSummary.imported_factors.map((name, idx) => (
                                <li key={idx}>{name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {importSummary.errors && importSummary.errors.length > 0 && (
                    <div>
                        <strong>Errors:</strong>
                        <ul>
                            {importSummary.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
          )}
        </Box>
    </div>
}

export default Data