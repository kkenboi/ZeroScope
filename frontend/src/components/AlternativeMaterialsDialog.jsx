import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Box,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Chip,
    Alert,
    Divider,
    Grid
} from '@mui/material';
import {
    Public as LocationIcon,
    Science as MaterialIcon,
    CompareArrows as CompareIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index} style={{ paddingTop: 16 }}>
            {value === index && children}
        </div>
    );
}

function AlternativeMaterialsDialog({ open, onClose, selectedActivity, onSelectAlternative }) {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && selectedActivity) {
            fetchAlternatives();
        } else {
            // Reset state when closed
            setData(null);
            setError(null);
            setTabValue(0);
        }
    }, [open, selectedActivity]);

    const fetchAlternatives = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                database_name: selectedActivity.database,
                activity_code: selectedActivity.code
            });
            const response = await fetch(`/api/brightway2/get_alternatives/?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch alternatives');
            }

            const result = await response.json();
            if (result.success) {
                setData(result);
            } else {
                throw new Error(result.error || 'Failed to analyze alternatives');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (alt) => {
        onSelectAlternative({
            type: 'lca', // keeping consistency with existing formats
            database: alt.database,
            code: alt.code,
            name: alt.name,
            location: alt.location,
            unit: alt.unit,
            impact: alt.impact // can be useful to show
        });
        onClose();
    };

    const formatImpact = (val) => {
        if (val === undefined || val === null) return 'N/A';
        return `${val.toExponential(2)} kgCO₂e`;
    };

    const formatDiff = (diff) => {
        if (diff === undefined || diff === null) return null;
        if (diff < 0) {
            return <Chip size="small" color="success" label={`▼ ${Math.abs(diff).toExponential(2)}`} />;
        } else if (diff > 0) {
            return <Chip size="small" color="error" label={`▲ ${diff.toExponential(2)}`} />;
        }
        return <Chip size="small" label="No change" />;
    };

    const originalImpact = data?.original?.impact;

    const renderAlternativesList = (alternatives, isMaterial = false) => {
        if (!alternatives || alternatives.length === 0) {
            return (
                <Alert severity="info" sx={{ mt: 2 }}>
                    No alternatives found.
                </Alert>
            );
        }

        return (
            <List sx={{ mt: 2 }}>
                {alternatives.map((alt, idx) => {
                    const isBetter = alt.impact_diff < 0;
                    return (
                        <ListItem
                            key={idx}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                mb: 2,
                                bgcolor: isBetter ? 'success.50' : 'background.paper'
                            }}
                        >
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={8}>
                                    {isMaterial && (
                                        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>
                                            Suggested AI Substitute: {alt.suggested_material}
                                        </Typography>
                                    )}
                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                        {alt.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                        <Chip label={alt.location} size="small" icon={<LocationIcon />} />
                                        <Chip label={alt.database} size="small" variant="outlined" />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Emission: <strong>{formatImpact(alt.impact)}</strong>
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Difference:
                                        </Typography>
                                        {formatDiff(alt.impact_diff)}
                                    </Box>
                                    <Button
                                        variant={isBetter ? "contained" : "outlined"}
                                        color={isBetter ? "success" : "primary"}
                                        startIcon={<CheckCircleIcon />}
                                        onClick={() => handleSelect(alt)}
                                        size="small"
                                    >
                                        Select Alternative
                                    </Button>
                                </Grid>
                            </Grid>
                        </ListItem>
                    );
                })}
            </List>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: '60vh' } }}>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompareIcon color="primary" />
                    <Typography variant="h6">Explore Alternatives</Typography>
                </Box>
                {selectedActivity && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Finding lower-emission alternatives for: <strong>{selectedActivity.name}</strong>
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                            Analyzing lifecycle database and generating AI recommendations...
                        </Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : data ? (
                    <Box>
                        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" gutterBottom>Original Selection</Typography>
                            <Typography variant="body1"><strong>{data.original.name}</strong></Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Location: {data.original.location}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Base Emission: <strong>{formatImpact(originalImpact)}</strong>
                                </Typography>
                            </Box>
                        </Box>

                        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tab label="Alternative Locations" icon={<LocationIcon />} iconPosition="start" />
                            <Tab label="Alternative Materials" icon={<MaterialIcon />} iconPosition="start" />
                        </Tabs>

                        <TabPanel value={tabValue} index={0}>
                            <Typography variant="body2" gutterBottom color="text.secondary">
                                Compare the exact same material/process from different geographic regions. Often, regions with greener energy grids produce lower emissions.
                            </Typography>
                            {renderAlternativesList(data.location_alternatives, false)}
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <Typography variant="body2" gutterBottom color="text.secondary">
                                AI-suggested material substitutes that may have a fundamentally lower carbon footprint, matched with available database processes.
                            </Typography>
                            {renderAlternativesList(data.material_alternatives, true)}
                        </TabPanel>
                    </Box>
                ) : null}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AlternativeMaterialsDialog;
