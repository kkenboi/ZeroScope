import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    Handle,
    Position,
    useReactFlow,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    TextField,
    Button,
    Divider,
    IconButton,
    Card,
    CardContent,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Science as ScienceIcon,
    Calculate as CalculateIcon,
    Search as SearchIcon
} from '@mui/icons-material';

// --- Custom Nodes ---

// 1. Product Node (The main output)
const ProductNode = ({ data }) => {
    return (
        <Card sx={{ minWidth: 200, border: '2px solid #2E7D32', bgcolor: '#E8F5E9' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Handle type="target" position={Position.Left} />
                <Typography variant="subtitle2" color="success.main" fontWeight="bold">
                    MAIN PRODUCT
                </Typography>
                <Typography variant="h6">{data.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {data.location} | {data.unit}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" display="block">
                    Database: {data.database}
                </Typography>
            </CardContent>
        </Card>
    );
};

// 2. Input Node (Activity Input)
const InputNode = ({ data, id }) => {
    const { setNodes } = useReactFlow();

    const handleDelete = () => {
        setNodes((nodes) => nodes.filter((n) => n.id !== id));
    };

    const handleQuantityChange = (e) => {
        const qty = e.target.value;
        data.onChange(id, qty);
    };

    return (
        <Card sx={{ minWidth: 240, border: '1px solid #ddd' }}>
            <Box sx={{ p: 1, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {data.type === 'biosphere' ? <CalculateIcon fontSize="small" color="success" /> : <ScienceIcon fontSize="small" color="primary" />}
                    <Typography variant="caption" fontWeight="bold">
                        {data.type === 'biosphere' ? 'BIOSPHERE' : 'TECHNOSPHERE'}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={handleDelete} color="error">
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Box>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom noWrap title={data.label}>
                    {data.label}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                    {data.location} | {data.database}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                    <TextField
                        label="Amount"
                        size="small"
                        type="number"
                        value={data.quantity}
                        onChange={handleQuantityChange}
                        sx={{ width: 100 }}
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        {data.unit}
                    </Typography>
                </Box>

                <Handle type="source" position={Position.Right} />
            </CardContent>
        </Card>
    );
};

const nodeTypes = {
    productNode: ProductNode,
    inputNode: InputNode,
};

// --- Main Component ---

const CustomProductEditor = ({ activity, onClose, onSaveSuccess }) => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sidebar state
    const [searchResults, setSearchResults] = useState([]);
    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);

    // Editor state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Initialize graph from activity data
    useEffect(() => {
        if (activity) {
            loadGraph(activity);
        }
    }, [activity]);

    const loadGraph = async (act) => {
        setLoading(true);
        try {
            // 1. Create Main Node
            const initialNodes = [
                {
                    id: 'main-product',
                    type: 'productNode',
                    position: { x: 600, y: 300 },
                    data: {
                        label: act.name,
                        unit: act.unit,
                        location: act.location,
                        database: act.database
                    },
                },
            ];

            // 2. Fetch Exchanges
            const response = await fetch(
                `/api/brightway2/get_exchanges/?database_name=${encodeURIComponent(act.database)}&activity_code=${encodeURIComponent(act.code)}`
            );
            const data = await response.json();

            if (data.success) {
                const initialEdges = [];
                let yOffset = 50;

                // Filter out production exchanges (outputs)
                const inputs = data.exchanges.filter(ex => ex.type !== 'production');

                inputs.forEach((ex, index) => {
                    const nodeId = `node-${index}-${Date.now()}`;
                    initialNodes.push({
                        id: nodeId,
                        type: 'inputNode',
                        position: { x: 200, y: yOffset },
                        data: {
                            label: ex.input, // Input name
                            type: ex.type,
                            quantity: ex.amount,
                            unit: ex.unit,
                            input_database: ex.input_database,
                            input_code: ex.input_code,
                            location: 'Unknown', // We might not have this from get_exchanges
                            database: ex.input_database,
                            onChange: handleNodeQuantityChange
                        }
                    });

                    initialEdges.push({
                        id: `edge-${index}`,
                        source: nodeId,
                        target: 'main-product',
                        animated: true,
                    });

                    yOffset += 180;
                });

                setNodes(initialNodes);
                setEdges(initialEdges);
            }
        } catch (err) {
            setError("Failed to load product graph");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Search for inputs
    const handleSearch = async () => {
        if (!search || search.length < 3) return;

        setSearching(true);
        try {
            const response = await fetch(
                `/api/brightway2/search_activities_for_inputs/?search_term=${encodeURIComponent(search)}&limit=20`
            );
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.activities || []);
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setSearching(false);
        }
    };

    const handleNodeQuantityChange = useCallback((id, qty) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: { ...node.data, quantity: qty },
                    };
                }
                return node;
            })
        );
    }, [setNodes]);

    const onDragStart = (event, nodeType, itemData) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/itemData', JSON.stringify(itemData));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const type = event.dataTransfer.getData('application/reactflow');
            const itemDataString = event.dataTransfer.getData('application/itemData');

            if (typeof type === 'undefined' || !type || !itemDataString) {
                return;
            }

            const itemData = JSON.parse(itemDataString);
            const position = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            };

            const newNode = {
                id: `node-${Date.now()}`,
                type: 'inputNode',
                position,
                data: {
                    label: itemData.name,
                    type: 'technosphere', // Default to technosphere for dragged items
                    quantity: 1,
                    unit: itemData.unit,
                    input_database: itemData.database,
                    input_code: itemData.code,
                    location: itemData.location,
                    database: itemData.database,
                    onChange: handleNodeQuantityChange
                },
            };

            setNodes((nds) => nds.concat(newNode));

            // Auto connect to main product
            const newEdge = {
                id: `edge-${Date.now()}`,
                source: newNode.id,
                target: 'main-product',
                animated: true,
            };
            setEdges((eds) => eds.concat(newEdge));
        },
        [setNodes, setEdges, handleNodeQuantityChange]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError("");

        try {
            const exchanges = nodes
                .filter(n => n.type === 'inputNode')
                .map(n => ({
                    input_database: n.data.input_database,
                    input_code: n.data.input_code,
                    amount: Number(n.data.quantity),
                    type: n.data.type,
                    unit: n.data.unit
                }));

            const response = await fetch("/api/brightway2/update_custom_product/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    database_name: activity.database,
                    activity_code: activity.code,
                    exchanges: exchanges
                }),
            });

            const data = await response.json();

            if (data.success) {
                if (onSaveSuccess) onSaveSuccess();
                onClose();
            } else {
                setError(data.error || "Failed to save product");
            }
        } catch (err) {
            setError(`Error saving: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ width: '100%', height: '80vh', display: 'flex' }}>
            {/* Sidebar */}
            <Paper sx={{ width: 320, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>Add Inputs</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Search activities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <IconButton onClick={handleSearch} disabled={searching}>
                            {searching ? <CircularProgress size={20} /> : <SearchIcon />}
                        </IconButton>
                    </Box>
                </Box>

                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {searchResults.length === 0 && !searching && (
                        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2">
                                Search for activities to add as inputs.
                            </Typography>
                        </Box>
                    )}
                    {searchResults.map((item) => (
                        <ListItem
                            key={`${item.database}-${item.code}`}
                            sx={{
                                cursor: 'grab',
                                '&:hover': { bgcolor: 'action.hover' },
                                borderBottom: '1px solid #eee'
                            }}
                            draggable
                            onDragStart={(event) => onDragStart(event, 'inputNode', item)}
                        >
                            <ListItemText
                                primary={item.name}
                                secondary={`${item.location} | ${item.unit} | ${item.database}`}
                                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            {/* Canvas */}
            <Box sx={{ flexGrow: 1, height: '100%', position: 'relative' }} ref={reactFlowWrapper}>
                {loading && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: '80%' }}>
                        <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
                    </Box>
                )}

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background />
                    <Controls />
                    <Panel position="top-right">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={handleSave}
                                disabled={saving || loading}
                            >
                                {saving ? "Saving..." : "Save Graph"}
                            </Button>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Close
                            </Button>
                        </Box>
                    </Panel>
                </ReactFlow>
            </Box>
        </Box>
    );
};

export default function CustomProductEditorWrapper(props) {
    return (
        <ReactFlowProvider>
            <CustomProductEditor {...props} />
        </ReactFlowProvider>
    );
}
