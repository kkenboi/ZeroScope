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
import dagre from 'dagre';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    TextField,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Save as SaveIcon,
    Delete as DeleteIcon,
    Science as ScienceIcon,
    Calculate as CalculateIcon,
    Search as SearchIcon,
    AccountTree as GraphIcon,
    PlaylistAdd as ExpandIcon,
    Close as CloseIcon
} from '@mui/icons-material';

// --- Layout Helper ---

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Layout configuration
    // rankdir: 'LR' means Left-to-Right.
    // Sources (Inputs) will be on the Left. Targets (Products) will be on the Right.
    // This creates a natural supply chain flow -> [Input] -> [Product].
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 80,  // Vertical spacing between sibling nodes
        ranksep: 200, // Horizontal spacing between layers (generations)
        align: 'UR'   // Alignment heuristic
    });

    nodes.forEach((node) => {
        // Dimensions for compact nodes (match CSS width/height approximately)
        dagreGraph.setNode(node.id, { width: 240, height: 160 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Dagre provides center coordinates, ReactFlow needs top-left
        if (nodeWithPosition) {
            node.position = {
                x: nodeWithPosition.x - 120,
                y: nodeWithPosition.y - 80,
            };
        }

        // Force handle positions for Left-to-Right flow
        node.targetPosition = Position.Left;
        node.sourcePosition = Position.Right;

        return node;
    });

    return { nodes: layoutedNodes, edges };
};

// --- Custom Nodes ---

// 1. Product Node (The main output)
const ProductNode = ({ data }) => {
    return (
        <Card sx={{
            width: 200,
            border: '2px solid #2E7D32',
            bgcolor: '#E8F5E9',
            boxShadow: 3
        }}>
            <CardContent sx={{ p: '12px !important' }}>
                <Handle type="target" position={Position.Left} style={{ background: '#2E7D32' }} />

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{
                        bgcolor: 'success.main',
                        color: 'white',
                        borderRadius: '4px',
                        px: 0.5,
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        mr: 1
                    }}>
                        PRODUCT
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {data.location}
                    </Typography>
                </Box>

                <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2, mb: 1 }}>
                    {data.label}
                </Typography>

                <Typography variant="caption" display="block" color="text.secondary">
                    {data.unit} | {data.database}
                </Typography>
            </CardContent>
        </Card>
    );
};

// 2. Input Node (Compact)
const InputNode = ({ data, id }) => {
    const { setNodes } = useReactFlow();
    const [expanding, setExpanding] = useState(false);

    const handleDelete = () => {
        setNodes((nodes) => nodes.filter((n) => n.id !== id));
    };

    const handleQuantityChange = (e) => {
        const qty = e.target.value;
        data.onChange(id, qty);
    };

    const onExpandClick = async (e) => {
        e.stopPropagation();
        if (data.onExpand && !expanding) {
            setExpanding(true);
            await data.onExpand(id, data);
            setExpanding(false);
        }
    };

    const isTechnosphere = data.type === 'technosphere';

    return (
        <Card sx={{
            width: 220,
            border: '1px solid',
            borderColor: data.expanded ? 'primary.main' : '#e0e0e0',
            boxShadow: 1,
            transition: 'all 0.2s',
            '&:hover': { boxShadow: 3 }
        }}>
            {/* Header Strip */}
            <Box sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: '#f5f5f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #f0f0f0'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {data.type === 'biosphere' ?
                        <CalculateIcon sx={{ fontSize: 16, color: 'success.main' }} /> :
                        <ScienceIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    }
                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                        {data.type === 'biosphere' ? 'BIO' : 'TECH'}
                    </Typography>
                </Box>
                <Box>
                    {isTechnosphere && (
                        <Tooltip title="Expand Inputs">
                            <IconButton
                                size="small"
                                onClick={onExpandClick}
                                disabled={expanding || data.expanded}
                                color="primary"
                                sx={{ p: 0.5 }}
                            >
                                {expanding ? <CircularProgress size={14} /> : <GraphIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                        </Tooltip>
                    )}
                    <IconButton size="small" onClick={handleDelete} color="error" sx={{ p: 0.5 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>
            </Box>

            <CardContent sx={{ p: '10px !important' }}>
                <Typography
                    variant="body2"
                    fontWeight="500"
                    noWrap
                    title={data.label}
                    sx={{ mb: 1 }}
                >
                    {data.label}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        type="number"
                        value={data.quantity}
                        onChange={handleQuantityChange}
                        sx={{
                            width: 80,
                            '& .MuiInputBase-input': {
                                p: 0.5,
                                fontSize: '0.85rem'
                            }
                        }}
                        InputProps={{ inputProps: { step: "any" } }}
                    />
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 80 }}>
                        {data.unit}
                    </Typography>
                </Box>

                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.7rem' }} noWrap>
                    {data.location} | {data.database}
                </Typography>

                <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
                <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
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
    const { fitView, getNodes, getEdges } = useReactFlow();

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

    // Helper to apply layout to current nodes/edges
    const refreshLayout = useCallback((currentNodes, currentEdges) => {
        const layouted = getLayoutedElements(currentNodes, currentEdges, 'LR');
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);

        // Fit view to ensure new nodes (on the left) are visible
        window.requestAnimationFrame(() => {
            fitView({ padding: 0.2, duration: 800 });
        });
    }, [setNodes, setEdges, fitView]);


    const handleNodeExpand = useCallback(async (parentId, parentData) => {
        try {
            // Fetch inputs for this activity
            const response = await fetch(
                `/api/brightway2/get_exchanges/?database_name=${encodeURIComponent(parentData.input_database)}&activity_code=${encodeURIComponent(parentData.input_code)}`
            );
            const data = await response.json();

            if (data.success && data.exchanges && data.exchanges.length > 0) {
                const inputs = data.exchanges.filter(ex => ex.type !== 'production');
                const currentNodes = getNodes();
                const currentEdges = getEdges();

                if (inputs.length === 0) {
                    alert("This activity has no upstream inputs.");
                    return;
                }

                const newNodes = [];
                const newEdges = [];

                inputs.forEach((ex, index) => {
                    const nodeId = `node-exp-${parentId}-${index}-${Date.now()}`;
                    newNodes.push({
                        id: nodeId,
                        type: 'inputNode',
                        position: { x: 0, y: 0 }, // Position will be handled by layout
                        data: {
                            label: ex.input,
                            type: ex.type,
                            quantity: ex.amount,
                            unit: ex.unit,
                            input_database: ex.input_database,
                            input_code: ex.input_code,
                            location: 'Unknown',
                            database: ex.input_database,
                            onChange: handleNodeQuantityChange,
                            onExpand: handleNodeExpand,
                            expanded: false
                        }
                    });

                    newEdges.push({
                        id: `edge-${parentId}-${nodeId}`,
                        source: nodeId,
                        target: parentId,
                        animated: true,
                        style: { stroke: '#888' }
                    });
                });

                // Current Nodes + New Nodes (Mark parent expanded)
                const updatedNodes = currentNodes.map(n => n.id === parentId ? { ...n, data: { ...n.data, expanded: true } } : n).concat(newNodes);
                const updatedEdges = currentEdges.concat(newEdges);

                // Apply Layout
                refreshLayout(updatedNodes, updatedEdges);

            } else {
                alert("Could not load inputs for this activity.");
            }
        } catch (err) {
            console.error(err);
            alert("Error expanding node.");
        }
    }, [getNodes, getEdges, refreshLayout]);

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

    const loadGraph = async (act) => {
        setLoading(true);
        try {
            // 1. Create Main Node
            const mainNode = {
                id: 'main-product',
                type: 'productNode',
                position: { x: 0, y: 0 },
                data: {
                    label: act.name,
                    unit: act.unit,
                    location: act.location,
                    database: act.database
                },
            };

            const initialNodes = [mainNode];
            const initialEdges = [];

            // 2. Fetch Exchanges
            const response = await fetch(
                `/api/brightway2/get_exchanges/?database_name=${encodeURIComponent(act.database)}&activity_code=${encodeURIComponent(act.code)}`
            );
            const data = await response.json();

            if (data.success) {
                // Filter out production exchanges (outputs)
                const inputs = data.exchanges.filter(ex => ex.type !== 'production');

                inputs.forEach((ex, index) => {
                    const nodeId = `node-${index}-${Date.now()}`;
                    initialNodes.push({
                        id: nodeId,
                        type: 'inputNode',
                        position: { x: 0, y: 0 },
                        data: {
                            label: ex.input,
                            type: ex.type,
                            quantity: ex.amount,
                            unit: ex.unit,
                            input_database: ex.input_database,
                            input_code: ex.input_code,
                            location: 'Unknown',
                            database: ex.input_database,
                            onChange: handleNodeQuantityChange,
                            onExpand: handleNodeExpand,
                            expanded: false
                        }
                    });

                    initialEdges.push({
                        id: `edge-${index}`,
                        source: nodeId,
                        target: 'main-product',
                        animated: true,
                    });
                });

                // Apply initial layout
                refreshLayout(initialNodes, initialEdges);
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

            // Allow drag anywhere currently, but ideally we should re-layout
            // For now, let's just add it where dropped, but standard layout might overwrite this if refreshed

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
                    type: 'technosphere',
                    quantity: 1,
                    unit: itemData.unit,
                    input_database: itemData.database,
                    input_code: itemData.code,
                    location: itemData.location,
                    database: itemData.database,
                    onChange: handleNodeQuantityChange,
                    onExpand: handleNodeExpand,
                    expanded: false
                },
            };

            const newEdge = {
                id: `edge-${Date.now()}`,
                source: newNode.id,
                target: 'main-product',
                animated: true,
            };

            const updatedNodes = nodes.concat(newNode);
            const updatedEdges = edges.concat(newEdge);

            // Re-run layout to keeping things organized
            refreshLayout(updatedNodes, updatedEdges);
        },
        [nodes, edges, handleNodeQuantityChange, handleNodeExpand, refreshLayout]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError("");

        try {
            const mainEdges = edges.filter(e => e.target === 'main-product');
            const mainInputIds = mainEdges.map(e => e.source);

            const exchanges = nodes
                .filter(n => mainInputIds.includes(n.id) && n.type === 'inputNode')
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
