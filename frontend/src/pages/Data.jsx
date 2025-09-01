import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Pagination
} from "@mui/material";
import {
  Add as AddIcon,
  Settings,
  UploadFile as UploadFileIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";

function Data() {
    const [importStatus, setImportStatus] = useState("");
    const [importSummary, setImportSummary] = useState(null);
    const [excelFile, setExcelFile] = useState(null);
    const [emissionFactors, setEmissionFactors] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [deleteAllDialog, setDeleteAllDialog] = useState(false);
    const fileInputRef = useRef();

    const PAGE_SIZE = 20; // if this is changed, change the settings.py

    useEffect(() => {
    fetch(`/api/emission-factors/?page=${page}`)
        .then(res => res.json())
        .then(data => {
        setEmissionFactors(data.results || []);
        setTotalCount(data.count || 0);

        const calculatedPageCount = Math.max(
            1,
            Math.ceil((data.count || 0) / PAGE_SIZE)
        );
        setPageCount(calculatedPageCount);

        if (page > calculatedPageCount) {
            setPage(calculatedPageCount);
        }
        })
        .catch(() => {
        setEmissionFactors([]);
        setPageCount(1);
        setTotalCount(0);
        });
    }, [importSummary, page]);

    const handleFileChange = (e) => {
        setExcelFile(e.target.files[0]);
        setImportStatus("");
        setImportSummary(null);
        setDialogOpen(true);

        // Reset file input value so selecting the same file triggers change event
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleChooseFileClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setExcelFile(null);
        setImportStatus("");
        setImportSummary(null);
    };

    const handleImportClick = async () => {
        if (!excelFile) {
            setImportStatus("Please select an Excel file.");
            return;
        }
        setImportLoading(true);
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
                // Reset import dialog state for next import
                setExcelFile(null);
            } else {
                setImportStatus("Import failed: " + (data.error || "Unknown error"));
                setImportSummary(null);
            }
        } catch (err) {
            setImportStatus("Import failed: " + err.message);
            setImportSummary(null);
        }
        setImportLoading(false);
    };

    const handleDeleteAllClick = () => {
        setDeleteAllDialog(true);
    };

    const handleConfirmDeleteAll = async () => {
        setDeleteAllDialog(false);
        // Send DELETE request to backend endpoint for deleting all emission factors
        const response = await fetch("/api/emission-factors/delete_all/", {
            method: "DELETE"
        });
        if (response.ok) {
            setImportStatus("All emission factors deleted.");
            setImportSummary(null);
            setPage(1); // Reset to first page
            // Refresh emission factors
            fetch(`/api/emission-factors/?page=1`)
                .then(res => res.json())
                .then(data => {
                    setEmissionFactors(data.results || []);
                    setTotalCount(data.count || 0);
                    setPageCount(Math.max(1, Math.ceil((data.count || 0) / (PAGE_SIZE || 1))));
                })
                .catch(() => {
                    setEmissionFactors([]);
                    setPageCount(1);
                    setTotalCount(0);
                });
        } else {
            setImportStatus("Failed to delete emission factors.");
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <div>
            <h1> Data </h1>

            {/* Import Status & File Button */}
            <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <Button
                    variant="contained"
                    startIcon={<UploadFileIcon />}
                    sx={{ borderRadius: 2, mb: 2 }}
                    onClick={handleChooseFileClick}
                >
                    Choose SEFR Excel File
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    sx={{ borderRadius: 2, mb: 2 }}
                    onClick={handleDeleteAllClick}
                >
                    Delete All Emission Factors
                </Button>
            </Box>

            {/* Import Dialog */}
            <Dialog open={dialogOpen} onClose={handleDialogClose}>
              <DialogTitle>Import SEFR Excel</DialogTitle>
              <DialogContent>
                <Typography>
                  {excelFile ? `Selected file: ${excelFile.name}` : "No file selected."}
                </Typography>
                {importLoading && (
                  <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography>Importing...</Typography>
                  </Box>
                )}
                {importStatus && !importLoading && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {importStatus}
                  </Typography>
                )}
                {importSummary && (
                  <Box sx={{ mt: 2 }}>
                    <h4>Import Summary</h4>
                    <ul>
                      <li>Total rows processed: {importSummary.total_rows}</li>
                      <li>Successfully imported: {importSummary.success_count}</li>
                      <li>Skipped (duplicates): {importSummary.skipped_count}</li>
                      <li>Errors: {importSummary.error_count}</li>
                    </ul>
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
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDialogClose} color="secondary">
                  Close
                </Button>
                <Button
                  onClick={handleImportClick}
                  variant="contained"
                  color="primary"
                  disabled={!excelFile || importLoading}
                  startIcon={<AddIcon />}
                >
                  Import
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete All Confirmation Dialog */}
            <Dialog open={deleteAllDialog} onClose={() => setDeleteAllDialog(false)}>
                <DialogTitle>Confirm Delete All</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>ALL</strong> emission factors? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteAllDialog(false)} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDeleteAll}
                        color="error"
                        variant="contained"
                        startIcon={<DeleteIcon />}
                    >
                        Yes, Delete All
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Emission Factors Table */}
            <Box sx={{ mt: 6 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Emission Factors in Database</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Sub-Category</TableCell>
                      <TableCell>CO2-eq/unit</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Year</TableCell>
                      <TableCell>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emissionFactors.map((factor) => (
                      <TableRow key={factor.factor_id || factor.id}>
                        <TableCell>{factor.name}</TableCell>
                        <TableCell>{factor.category}</TableCell>
                        <TableCell>{factor.sub_category}</TableCell>
                        <TableCell>
                          {factor.emission_factor_co2e !== undefined && factor.emission_factor_co2e !== null
                            ? Number(factor.emission_factor_co2e).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
                            : ""}
                        </TableCell>
                        <TableCell>{factor.base_unit}</TableCell>
                        <TableCell>{factor.year}</TableCell>
                        <TableCell>{factor.source}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  siblingCount={1}
                  boundaryCount={1}
                  disabled={pageCount <= 1}
                />
              </Box>
              <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 1 }}>
                Showing page {page} of {pageCount} ({totalCount} total emission factors)
              </Typography>
            </Box>
        </div>
    );
}

export default Data