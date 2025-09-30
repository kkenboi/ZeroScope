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
  Pagination,
  TextField,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton
} from "@mui/material";
import {
  Add as AddIcon,
  Settings,
  UploadFile as UploadFileIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from "@mui/icons-material";
import AddEmissionFactorDialog from "../components/AddEmissionFactorDialog";

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

    // Add Emission Factor Dialog state
    const [addFactorDialogOpen, setAddFactorDialogOpen] = useState(false);

    const PAGE_SIZE = 20; // if this is changed, change the settings.py

    // Search and filter states
    const [search, setSearch] = useState("");
    const [pendingSearch, setPendingSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterScope, setFilterScope] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const searchDebounceRef = useRef(null);

    // Column resizing state
    const initialColumnWidths = {
      name: 220,
      category: 170,
      scopes: 170,
      ef: 150,
      unit: 90,
      year: 80,
      source: 160,
      notes: 360,
      uncertainty: 170,
    };
    const [columnWidths, setColumnWidths] = useState(initialColumnWidths);
    const resizeStateRef = useRef({ colId: null, startX: 0, startWidth: 0 });

    const handleResizeMouseDown = (e, colId) => {
      e.preventDefault();
      e.stopPropagation();
      const startWidth = columnWidths[colId];
      resizeStateRef.current = { colId, startX: e.clientX, startWidth };
      window.addEventListener('mousemove', handleResizeMouseMove);
      window.addEventListener('mouseup', handleResizeMouseUp);
    };
    const handleResizeMouseMove = (e) => {
      const { colId, startX, startWidth } = resizeStateRef.current;
      if (!colId) return;
      const delta = e.clientX - startX;
      setColumnWidths(prev => {
        const newWidth = Math.max(60, startWidth + delta);
        if (prev[colId] === newWidth) return prev;
        return { ...prev, [colId]: newWidth };
      });
    };
    const handleResizeMouseUp = () => {
      resizeStateRef.current = { colId: null, startX: 0, startWidth: 0 };
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
    };

    const columns = [
      { id: 'name', label: 'Name' },
      { id: 'category', label: 'Category' },
      { id: 'scopes', label: 'Applicable Scopes' },
      { id: 'ef', label: 'EF (kgCO₂e/unit)' },
      { id: 'unit', label: 'Unit' },
      { id: 'year', label: 'Year' },
      { id: 'source', label: 'Source' },
      { id: 'notes', label: 'Notes' },
      { id: 'uncertainty', label: 'Uncertainty' },
    ];

    const totalTableWidth = Object.values(columnWidths).reduce((a,b)=>a+b,0) + 40;

    useEffect(() => {
    fetch(`/api/emission-factors/?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}${filterCategory ? `&category=${encodeURIComponent(filterCategory)}` : ""}${filterScope ? `&scope=${encodeURIComponent(filterScope)}` : ""}${filterYear ? `&year=${encodeURIComponent(filterYear)}` : ""}`)
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
    }, [importSummary, page, search, filterCategory, filterScope, filterYear]);

    // Debounce the search input so typing doesn't spam the server
    useEffect(() => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        setSearch(pendingSearch.trim());
        setPage(1); // reset page when search changes
      }, 400);
      return () => clearTimeout(searchDebounceRef.current);
    }, [pendingSearch]);

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

            const response = await fetch("/api/emission-factors/import_excel/", {
                method: "POST",
                body: formData,
            });
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server returned non-JSON response. Check if backend is running.");
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                setImportStatus("Import successful!");
                setImportSummary(data.summary);
                // Reset import dialog state for next import
                setExcelFile(null);
            } else {
                setImportStatus("Import failed: " + (data.error || data.message || "Unknown error"));
                setImportSummary(data.summary || null);
            }
        } catch (err) {
            setImportStatus("Import failed: " + err.message);
            setImportSummary(null);
            console.error("Import error:", err);
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
            refreshEmissionFactors();
        } else {
            setImportStatus("Failed to delete emission factors.");
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    // Refresh emission factors data
    const refreshEmissionFactors = () => {
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
    };

    // Add Factor Dialog Functions
    const handleAddFactorClick = () => {
        setAddFactorDialogOpen(true);
    };

    const handleAddFactorDialogClose = () => {
        setAddFactorDialogOpen(false);
    };

    const handleAddFactorSuccess = (newFactor) => {
        setImportStatus('Emission factor created successfully!');
        refreshEmissionFactors();
    };

    const clearFilters = () => {
      setPendingSearch("");
      setSearch("");
      setFilterCategory("");
      setFilterScope("");
      setFilterYear("");
      setPage(1);
    };

    return (
        <div>
            <h1> Data </h1>

            {/* Import Status & File Button */}
            <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 2, mb: 2 }}
                    onClick={handleAddFactorClick}
                    color="primary"
                >
                    Add New Emission Factor
                </Button>
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

            {/* Search & Filters (moved below action buttons) */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, alignItems: 'flex-end' }}>
              <TextField
                label="Search"
                variant="outlined"
                size="small"
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />,
                  endAdornment: pendingSearch && (
                    <IconButton size="small" onClick={() => setPendingSearch("")}> 
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )
                }}
                sx={{ minWidth: 220 }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Category"
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                >
                  <MenuItem value=""><em>All</em></MenuItem>
                  <MenuItem value="stationary_combustion">Stationary Combustion</MenuItem>
                  <MenuItem value="mobile_combustion">Mobile Combustion</MenuItem>
                  <MenuItem value="fugitive_emissions">Fugitive Emissions</MenuItem>
                  <MenuItem value="process_emissions">Process Emissions</MenuItem>
                  <MenuItem value="purchased_electricity">Purchased Electricity</MenuItem>
                  <MenuItem value="purchased_heat_steam_cooling">Purchased Heat/Steam/Cooling</MenuItem>
                  <MenuItem value="purchased_goods_services">Purchased Goods & Services</MenuItem>
                  <MenuItem value="capital_goods">Capital Goods</MenuItem>
                  <MenuItem value="fuel_energy_related">Fuel & Energy Related</MenuItem>
                  <MenuItem value="upstream_transport">Upstream Transport</MenuItem>
                  <MenuItem value="waste_generated">Waste Generated</MenuItem>
                  <MenuItem value="business_travel">Business Travel</MenuItem>
                  <MenuItem value="employee_commuting">Employee Commuting</MenuItem>
                  <MenuItem value="upstream_leased_assets">Upstream Leased Assets</MenuItem>
                  <MenuItem value="downstream_transport">Downstream Transport</MenuItem>
                  <MenuItem value="processing_sold_products">Processing Sold Products</MenuItem>
                  <MenuItem value="use_sold_products">Use Sold Products</MenuItem>
                  <MenuItem value="end_of_life_sold_products">End-of-Life Sold Products</MenuItem>
                  <MenuItem value="downstream_leased_assets">Downstream Leased Assets</MenuItem>
                  <MenuItem value="franchises">Franchises</MenuItem>
                  <MenuItem value="investments">Investments</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Scope</InputLabel>
                <Select
                  value={filterScope}
                  label="Scope"
                  onChange={(e) => { setFilterScope(e.target.value); setPage(1); }}
                >
                  <MenuItem value=""><em>All</em></MenuItem>
                  <MenuItem value="1">Scope 1</MenuItem>
                  <MenuItem value="2">Scope 2</MenuItem>
                  <MenuItem value="3">Scope 3</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Year"
                variant="outlined"
                size="small"
                value={filterYear}
                onChange={(e) => { setFilterYear(e.target.value.replace(/[^0-9,]/g, '')); setPage(1); }}
                sx={{ width: 170 }}
              />
              <Button onClick={clearFilters} size="small" variant="text">Reset</Button>
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

            {/* Add New Emission Factor Dialog */}
            <AddEmissionFactorDialog
                open={addFactorDialogOpen}
                onClose={handleAddFactorDialogClose}
                onSuccess={handleAddFactorSuccess}
            />

            {/* Emission Factors Table */}
            <Box sx={{ mt: 6 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Emission Factors in Database</Typography>
              <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: totalTableWidth, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      {columns.map(col => (
                        <TableCell
                          key={col.id}
                          sx={{
                            position: 'relative',
                            width: columnWidths[col.id],
                            maxWidth: columnWidths[col.id],
                            minWidth: columnWidths[col.id],
                            userSelect: 'none',
                            pr: 0,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box component="span" sx={{ mr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</Box>
                            <Box
                              onMouseDown={(e) => handleResizeMouseDown(e, col.id)}
                              sx={{
                                cursor: 'col-resize',
                                width: 6,
                                flexShrink: 0,
                                alignSelf: 'stretch',
                                '&:hover': { backgroundColor: 'primary.main', opacity: 0.4 },
                                ml: 'auto'
                              }}
                            />
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emissionFactors.map((factor) => (
                      <TableRow key={factor.factor_id || factor.id}>
                        <TableCell sx={{ width: columnWidths.name, maxWidth: columnWidths.name, minWidth: columnWidths.name, overflow: 'hidden', textOverflow: 'ellipsis' }}>{factor.name}</TableCell>
                        <TableCell sx={{ width: columnWidths.category, maxWidth: columnWidths.category, minWidth: columnWidths.category, overflow: 'hidden', textOverflow: 'ellipsis' }}>{factor.category_display || factor.category}</TableCell>
                        <TableCell sx={{ width: columnWidths.scopes, maxWidth: columnWidths.scopes, minWidth: columnWidths.scopes }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(factor.applicable_scopes || []).map((scope) => (
                              <Chip 
                                key={scope}
                                label={`Scope ${scope}`} 
                                size="small" 
                                color={scope === 1 ? "error" : scope === 2 ? "warning" : "info"}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ width: columnWidths.ef, maxWidth: columnWidths.ef, minWidth: columnWidths.ef }}>
                          {factor.emission_factor_value !== undefined && factor.emission_factor_value !== null
                            ? Number(factor.emission_factor_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : ""}
                        </TableCell>
                        <TableCell sx={{ width: columnWidths.unit, maxWidth: columnWidths.unit, minWidth: columnWidths.unit }}>{factor.unit}</TableCell>
                        <TableCell sx={{ width: columnWidths.year, maxWidth: columnWidths.year, minWidth: columnWidths.year }}>{factor.year}</TableCell>
                        <TableCell sx={{ width: columnWidths.source, maxWidth: columnWidths.source, minWidth: columnWidths.source, overflow: 'hidden', textOverflow: 'ellipsis' }}>{factor.source}</TableCell>
                        <TableCell sx={{ width: columnWidths.notes, maxWidth: columnWidths.notes, minWidth: columnWidths.notes, whiteSpace: 'normal' }}>
                          <Typography 
                            variant="body2" 
                            title={factor.description || ''} 
                            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          >
                            {factor.description || ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: columnWidths.uncertainty, maxWidth: columnWidths.uncertainty, minWidth: columnWidths.uncertainty }}>
                          <Chip 
                            label={factor.uncertainty_type > 0 ? `Uncertainty: ${factor.uncertainty_type_display || 'Type ' + factor.uncertainty_type}` : 'No uncertainty'} 
                            size="small" 
                            variant="outlined"
                            color={factor.uncertainty_type > 0 ? "primary" : "default"}
                          />
                        </TableCell>
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