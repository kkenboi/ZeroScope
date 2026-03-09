import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Chip,
    Stack,
    Collapse,
    useTheme,
    Avatar,
    Divider,
} from '@mui/material';
import {
    AutoAwesome as AutoAwesomeIcon,
    Psychology as PsychologyIcon,
    EnergySavingsLeaf as LeafIcon,
    Timeline as TimelineIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

export default function ReductionPlan({ projectId }) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState(null);
    const [error, setError] = useState(null);

    const handleGeneratePlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/projects/${projectId}/generate-reduction-plan/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate plan');
            }

            const data = await response.json();
            setPlan(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 48, height: 48 }}>
                    <PsychologyIcon />
                </Avatar>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        What's Next?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        AI-powered Reduction Plan
                    </Typography>
                </Box>
            </Box>

            {!plan && !loading && (
                <Card
                    variant="outlined"
                    sx={{
                        bgcolor: 'rgba(46, 125, 50, 0.04)', // subtle green bg
                        borderStyle: 'dashed',
                        borderColor: 'primary.main',
                        textAlign: 'center',
                        p: 4
                    }}
                >
                    <PsychologyIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                    <Typography variant="h6" gutterBottom>
                        Optimize your environmental impact
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                        Our AI engine can analyze your project's Life Cycle Assessment (LCA) results and emission factors to propose alternative materials, processes, or energy sources to lower your carbon footprint.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={handleGeneratePlan}
                        sx={{
                            borderRadius: 8,
                            px: 4,
                            py: 1.5,
                            textTransform: 'none',
                            fontSize: '1.05rem',
                            boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)',
                            '&:hover': {
                                boxShadow: '0 6px 20px rgba(46, 125, 50, 0.23)'
                            }
                        }}
                    >
                        Generate AI Reduction Plan
                    </Button>
                    {error && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                </Card>
            )}

            {loading && (
                <Card sx={{ p: 6, textAlign: 'center' }}>
                    <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main', mb: 3 }} />
                    <Typography variant="h6">
                        Analyzing emissions data...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Finding greener alternatives for your materials and processes.
                    </Typography>
                </Card>
            )}

            {plan && !loading && (
                <Box>
                    <Card
                        sx={{
                            mb: 3,
                            background: 'linear-gradient(135deg, #47c850ff 0%, #e2e7e3ff 100%)',
                            color: 'white'
                        }}
                    >
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="overline" sx={{ letterSpacing: 1.5, opacity: 1.0 }} color="black">
                                AI Analysis Summary
                            </Typography>
                            <Typography variant="h6" sx={{ mt: 1, fontWeight: 500, lineHeight: 1.4 }}>
                                {plan.summary}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon color="primary" /> Actionable Steps
                    </Typography>

                    <Stack spacing={2}>
                        {plan.actionable_steps?.map((step, index) => (
                            <Card
                                key={index}
                                sx={{
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 3
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                            <Avatar sx={{ bgcolor: 'rgba(46, 125, 50, 0.1)', color: 'primary.main', width: 40, height: 40 }}>
                                                {index + 1}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                                    {step.title}
                                                </Typography>
                                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                    {step.category && (
                                                        <Chip size="small" label={step.category} variant="outlined" sx={{ fontWeight: 500 }} />
                                                    )}
                                                    {step.impact && (
                                                        <Chip
                                                            size="small"
                                                            label={`${step.impact} Impact`}
                                                            color={step.impact.toLowerCase() === 'high' ? 'success' : 'default'}
                                                            sx={{ fontWeight: 500 }}
                                                        />
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Box>

                                        {step.estimated_reduction_percentage && (
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                                                    ~{step.estimated_reduction_percentage}%
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Reduction
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    <Typography variant="body1" color="text.secondary" sx={{ pl: 7 }}>
                                        {step.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>

                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Button
                            variant="outlined"
                            onClick={handleGeneratePlan}
                            startIcon={<AutoAwesomeIcon />}
                            sx={{ borderRadius: 8 }}
                        >
                            Regenerate Plan
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
