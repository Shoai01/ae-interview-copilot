import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, Button, Select, MenuItem, CircularProgress, 
  IconButton, Tooltip, TablePagination, Menu, Checkbox, ListItemText, 
  Collapse, Avatar, TextField, InputAdornment 
} from '@mui/material';
import { adminService } from '@/services/api';
import Layout from '@/components/Layout';
import SyncIcon from '@mui/icons-material/Sync';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import toast from 'react-hot-toast';

const AVATAR_PALETTE = [
  '#0284c7', // sky
  '#7c3aed', // violet
  '#059669', // emerald
  '#d97706', // amber
  '#e11d48', // rose
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#ea580c', // orange
];

function getAvatarBgColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name = '') {
  if (!name) return '?';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function AssignedTraineesView({ trainees = [], successCount, failedCount }) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const getTraineeName = (item) => {
    if (typeof item === 'string') return item;
    return item?.name || item?.full_name || item?.trainee_full_name || item?.identifier || JSON.stringify(item);
  };

  const traineeNames = trainees.map(getTraineeName);

  const filtered = traineeNames.filter(name => 
    name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleCopyAll = () => {
    if (!traineeNames.length) return;
    navigator.clipboard.writeText(traineeNames.join('\n'));
    setCopied(true);
    toast.success(`Copied ${traineeNames.length} trainee names to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box 
      sx={{ 
        m: 1.5, 
        p: { xs: 1.5, sm: 2 }, 
        bgcolor: '#ffffff', 
        borderRadius: 2, 
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Header Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: 1.5, 
          pb: 1.5,
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          mb: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 32, 
              height: 32, 
              borderRadius: '8px', 
              bgcolor: 'rgba(242, 101, 34, 0.1)', 
              color: 'primary.main' 
            }}
          >
            <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'text.primary', fontSize: '0.9rem', lineHeight: 1.2 }}>
              Assigned Trainees
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'DM Sans, sans-serif', color: 'text.secondary', fontSize: '0.75rem' }}>
              Bulk enrollment recipient list
            </Typography>
          </Box>
          
          <Chip 
            label={`${trainees.length} Total`} 
            size="small" 
            sx={{ 
              height: 22, 
              fontSize: '11px', 
              fontWeight: 700, 
              fontFamily: 'DM Sans, sans-serif',
              bgcolor: 'rgba(242, 101, 34, 0.1)', 
              color: 'primary.main', 
              borderRadius: '6px' 
            }} 
          />
          {successCount !== undefined && successCount !== '-' && (
            <Chip 
              label={`${successCount} Successful`} 
              size="small" 
              sx={{ 
                height: 22, 
                fontSize: '11px', 
                fontWeight: 600, 
                fontFamily: 'DM Sans, sans-serif',
                bgcolor: 'rgba(74, 222, 128, 0.15)', 
                color: '#15803d', 
                borderRadius: '6px' 
              }} 
            />
          )}
          {failedCount !== undefined && failedCount !== '-' && Number(failedCount) > 0 && (
            <Chip 
              label={`${failedCount} Failed`} 
              size="small" 
              sx={{ 
                height: 22, 
                fontSize: '11px', 
                fontWeight: 600, 
                fontFamily: 'DM Sans, sans-serif',
                bgcolor: 'rgba(239, 68, 68, 0.12)', 
                color: 'error.main', 
                borderRadius: '6px' 
              }} 
            />
          )}
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {trainees.length > 5 && (
            <TextField
              size="small"
              placeholder="Search trainees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                width: { xs: 150, sm: 190 },
                '& .MuiOutlinedInput-root': {
                  height: 32,
                  fontSize: 12,
                  fontFamily: 'DM Sans, sans-serif',
                  bgcolor: '#f8fafc',
                  borderRadius: 1.5,
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.12)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main'
                  }
                }
              }}
            />
          )}

          <Tooltip title={copied ? "Copied to clipboard!" : "Copy all trainee names"}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleCopyAll}
              startIcon={copied ? <CheckIcon sx={{ fontSize: '15px !important' }} /> : <ContentCopyIcon sx={{ fontSize: '15px !important' }} />}
              sx={{
                height: 32,
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'none',
                fontWeight: 600,
                color: copied ? '#15803d' : 'text.secondary',
                borderColor: copied ? '#86efac' : 'rgba(0, 0, 0, 0.15)',
                bgcolor: copied ? 'rgba(74, 222, 128, 0.1)' : '#ffffff',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(242, 101, 34, 0.04)',
                  color: 'primary.main'
                }
              }}
            >
              {copied ? 'Copied' : 'Copy All'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Trainees Grid Area */}
      {filtered.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ fontFamily: 'DM Sans', color: 'text.secondary', fontSize: 13 }}>
            No trainees match "{search}"
          </Typography>
          <Button size="small" onClick={() => setSearch('')} sx={{ mt: 1, textTransform: 'none', fontSize: 12, fontFamily: 'DM Sans' }}>
            Clear filter
          </Button>
        </Box>
      ) : (
        <Box 
          sx={{ 
            maxHeight: 280, 
            overflowY: 'auto',
            pr: 0.5,
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(auto-fill, minmax(220px, 1fr))' 
            }, 
            gap: 1,
            '&::-webkit-scrollbar': { width: '5px' },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: '4px' },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(0,0,0,0.25)' }
          }}
        >
          {filtered.map((traineeName, idx) => (
            <Tooltip key={idx} title={traineeName} placement="top" arrow>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  p: '6px 10px',
                  bgcolor: '#f8fafc',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: 1.5
                }}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'DM Sans, sans-serif',
                    bgcolor: getAvatarBgColor(traineeName),
                    color: '#ffffff',
                    flexShrink: 0
                  }}
                >
                  {getInitials(traineeName)}
                </Avatar>
                <Typography
                  noWrap
                  sx={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'text.primary',
                    flex: 1
                  }}
                >
                  {traineeName}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'text.disabled',
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                    px: 0.6,
                    py: 0.2,
                    borderRadius: 0.8,
                    flexShrink: 0
                  }}
                >
                  #{idx + 1}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Filter Info Footer */}
      {search && (
        <Box sx={{ mt: 1.2, pt: 1, borderTop: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontFamily: 'DM Sans', color: 'text.secondary', fontSize: 11 }}>
            Showing {filtered.length} of {trainees.length} trainees
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function LogRow({ log, visibleCols, modules, formatTarget }) {
  const [open, setOpen] = useState(false);
  
  let modId = null;
  let sCount = '-';
  let fCount = '-';
  let decision = '-';
  let statusLabel = 'Success';
  let statusColor = 'success.main';
  let statusBg = 'rgba(46, 125, 50, 0.1)';
  let assignedTrainees = [];

  if (log.details) {
    try {
      const d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      if (d.module_id) modId = d.module_id;
      
      if (log.action_type === 'TRAINER_DECISION_SUBMITTED' && d.decision) {
        decision = d.decision;
      }

      if (log.action_type === 'QUESTION_STATUS_TOGGLED' && d.new_status !== undefined) {
        statusLabel = d.new_status ? 'Active' : 'Inactive';
        statusColor = d.new_status ? 'success.main' : 'default';
        statusBg = d.new_status ? 'rgba(46, 125, 50, 0.1)' : 'rgba(0, 0, 0, 0.08)';
      }
      
      if (d.success_count !== undefined) sCount = d.success_count;
      if (d.failed_count !== undefined) fCount = d.failed_count;
      
      if (d.assigned_trainees && Array.isArray(d.assigned_trainees)) {
        assignedTrainees = d.assigned_trainees;
      }

      if (fCount !== '-' && fCount > 0) {
        if (sCount > 0) {
          statusLabel = 'Partial';
          statusColor = 'warning.main';
          statusBg = 'rgba(237, 108, 2, 0.1)';
        } else {
          statusLabel = 'Failed';
          statusColor = 'error.main';
          statusBg = 'rgba(211, 47, 47, 0.1)';
        }
      }
    } catch(e){}
  }
  
  if (!modId && log.target) {
    const mMatch = log.target.match(/Module:\s*(\d+)/);
    if (mMatch) modId = parseInt(mMatch[1]);
  }
  const modName = modId ? (modules.find(m => m.id === modId)?.name || 'Unknown Module') : '-';

  const isExpandable = log.action_type === 'BULK_SESSION_ASSIGNED' && assignedTrainees.length > 0;

  return (
    <React.Fragment>
      <TableRow 
        hover 
        sx={{ 
          bgcolor: open ? 'rgba(242, 101, 34, 0.02)' : 'inherit',
          '& > *': { borderBottom: isExpandable && open ? 'none' : '1px solid rgba(224, 224, 224, 1)' },
          transition: 'background-color 0.2s ease'
        }}
      >
        <TableCell padding="checkbox" sx={{ width: 40 }}>
          {isExpandable && (
            <Tooltip title={open ? "Hide trainees" : "View trainees"}>
              <IconButton 
                aria-label="expand row" 
                size="small" 
                onClick={() => setOpen(!open)}
                sx={{
                  color: open ? 'primary.main' : 'text.secondary',
                  bgcolor: open ? 'rgba(242, 101, 34, 0.08)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.15)' }
                }}
              >
                {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
        {visibleCols.includes('date') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
            {new Date(log.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false
            })}
          </TableCell>
        )}
        {visibleCols.includes('actor') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500 }}>
            {log.actor_name || 'System'}
          </TableCell>
        )}
        {visibleCols.includes('action') && (
          <TableCell>
            <Chip size="small" label={log.action_type.replace(/_/g, ' ')} sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, bgcolor: 'rgba(242,101,34,0.1)', color: 'primary.main', borderRadius: 1 }} />
          </TableCell>
        )}
        {visibleCols.includes('module') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
            {modName}
          </TableCell>
        )}
        {visibleCols.includes('target') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
            {isExpandable ? (
              <Tooltip title={open ? "Click to collapse" : "Click to view assigned trainees"}>
                <Chip
                  icon={<PeopleAltOutlinedIcon sx={{ fontSize: '15px !important', color: open ? '#ffffff !important' : 'primary.main !important' }} />}
                  label={`${assignedTrainees.length} ${assignedTrainees.length === 1 ? 'Trainee' : 'Trainees'}`}
                  size="small"
                  onClick={() => setOpen(!open)}
                  sx={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    bgcolor: open ? 'primary.main' : 'rgba(242, 101, 34, 0.08)',
                    color: open ? '#ffffff' : 'primary.main',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'rgba(242, 101, 34, 0.25)',
                    borderRadius: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: open ? 'primary.dark' : 'rgba(242, 101, 34, 0.16)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                />
              </Tooltip>
            ) : (
              formatTarget(log)
            )}
          </TableCell>
        )}
        {visibleCols.includes('decision') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: decision !== '-' ? 700 : 400, color: decision === 'PASS' ? 'success.main' : (decision === 'FAIL' ? 'error.main' : 'inherit') }}>
            {decision}
          </TableCell>
        )}
        {visibleCols.includes('status') && (
          <TableCell>
            <Chip size="small" label={statusLabel} sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, bgcolor: statusBg, color: statusColor, borderRadius: 1 }} />
          </TableCell>
        )}
        {visibleCols.includes('success') && (
          <TableCell align="center" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600 }}>
            {sCount}
          </TableCell>
        )}
        {visibleCols.includes('failed') && (
          <TableCell align="center" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: fCount !== '-' && fCount > 0 ? 'error.main' : 'inherit' }}>
            {fCount}
          </TableCell>
        )}
      </TableRow>
      {isExpandable && (
        <TableRow sx={{ bgcolor: open ? 'rgba(242, 101, 34, 0.015)' : 'inherit' }}>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={visibleCols.length + 1}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <AssignedTraineesView 
                trainees={assignedTrainees} 
                successCount={sCount} 
                failedCount={fCount} 
              />
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modules, setModules] = useState([]);

  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [visibleCols, setVisibleCols] = useState(['date', 'actor', 'action', 'target', 'status']);
  
  const COLUMNS = [
    { id: 'date', label: 'DATE & TIME', align: 'left' },
    { id: 'actor', label: 'ACTOR', align: 'left' },
    { id: 'action', label: 'ACTION', align: 'left' },
    { id: 'module', label: 'MODULE', align: 'left' },
    { id: 'target', label: 'TARGET', align: 'left' },
    { id: 'decision', label: 'DECISION', align: 'left' },
    { id: 'status', label: 'STATUS', align: 'left' },
    { id: 'success', label: 'SUCCESS', align: 'center' },
    { id: 'failed', label: 'FAILED', align: 'center' }
  ];

  const fetchModules = async () => {
    try {
      const data = await adminService.getModules();
      setModules(data);
    } catch (err) {
      console.error('Failed to fetch modules', err);
    }
  };

  const fetchLogs = async (cursor = null, isLoadMore = false) => {
    try {
      setLoading(true);
      if (!isLoadMore) {
        setLogs([]); // Immediately clear old logs when changing filters
      }
      const params = {};
      if (cursor) params.cursor = cursor;
      if (categoryFilter) params.category = categoryFilter;
      if (actionFilter) params.action_type = actionFilter;
      const data = await adminService.getAuditLogs(params);
      if (isLoadMore) {
        setLogs(prev => [...prev, ...data.items]);
      } else {
        setLogs(data.items);
      }
      setNextCursor(data.next_cursor);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    setPage(0);
    fetchLogs();
  }, [actionFilter, categoryFilter]);

  const handleChangePage = async (event, newPage) => {
    // If we're moving forward and don't have enough logs yet, but we have a cursor
    if (newPage > page && (newPage + 1) * rowsPerPage > logs.length && nextCursor) {
      await fetchLogs(nextCursor, true);
    }
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const selectSx = {
    fontFamily: 'DM Sans, sans-serif',
    bgcolor: 'white',
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'primary.main',
      borderWidth: 1,
      boxShadow: '0 0 0 3px rgba(242, 101, 34, 0.1)'
    }
  };

  const formatTarget = (log) => {
    if (!log.target) return '-';
    let formatted = log.target;
    
    // Completely strip out Module from Target since it has its own column now
    formatted = formatted.replace(/Module:\s*\d+\s*/, '');

    // Strip out Question IDs e.g., "Question: 31 (Set: AutoSet)" -> "Question (Set: AutoSet)"
    formatted = formatted.replace(/Question:\s*\d+\s*/, 'Question ');

    // Strip out Session IDs e.g., "Session: 5" -> "Session"
    formatted = formatted.replace(/Session:\s*\d+\s*/, 'Session ');

    formatted = formatted.trim();

    // If it's a bulk assign, display Multiple Trainees
    if (log.action_type === 'BULK_SESSION_ASSIGNED') {
      return 'Multiple Trainees';
    }

    return formatted || '-';
  };

  const formatDetails = (action_type, details) => {
    if (!details) return '-';
    try {
      const d = typeof details === 'string' ? JSON.parse(details) : details;
      
      const renderItem = (label, value) => (
        <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5, mr: 1.5, mb: 0.5 }}>
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', fontFamily: 'DM Sans, sans-serif' }}>
            {label}:
          </Typography>
          <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary', fontFamily: 'DM Sans, sans-serif' }}>
            {value}
          </Typography>
        </Box>
      );

      let content = null;
      switch (action_type) {
        case 'TRAINER_DECISION_SUBMITTED':
          return '-';
        case 'USER_CREATED':
          content = renderItem('Role', d.role || 'N/A'); break;
        case 'USER_UPDATED':
          content = renderItem('Updated Fields', d.updated_fields ? d.updated_fields.join(', ') : 'N/A'); break;
        case 'USER_DELETED':
          content = renderItem('Role', d.role); break;
        case 'SESSION_ASSIGNED':
          return '-'; // Target is Trainee, Module is in col, Session ID removed. Nothing left!
        case 'BULK_SESSION_ASSIGNED':
          return '-';
        case 'BULK_QUESTION_UPLOAD':
          content = <>{renderItem('Count', d.count)}{d.set_name ? renderItem('Set', d.set_name) : null}</>; break;
        case 'QUESTION_CREATED':
          content = d.set_name ? renderItem('Set', d.set_name) : '-'; break;
        case 'QUESTION_UPDATED':
          content = d.action ? <>{renderItem('Action', d.action)}{renderItem('Preview', d.text_preview)}</> : renderItem('Fields', d.updated_fields ? d.updated_fields.join(', ') : '-'); break;
        case 'QUESTION_STATUS_TOGGLED':
          return '-';
        case 'DOCUMENT_UPLOADED':
          content = renderItem('Chunks', d.chunks); break;
        case 'DOCUMENT_DELETED':
          return '-';
        default:
          content = <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{JSON.stringify(d)}</Typography>;
      }
      return <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>{content}</Box>;
    } catch (e) {
      return typeof details === 'string' ? details : JSON.stringify(details);
    }
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, width: '100%' }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'text.primary', mb: 1, letterSpacing: '-0.5px' }}>
                Activity Logs
              </Typography>
              <IconButton onClick={() => fetchLogs()} size="medium" disabled={loading} sx={{ color: 'primary.main', bgcolor: 'rgba(242,101,34,0.1)', '&:hover': { bgcolor: 'rgba(242,101,34,0.2)' } }}>
                <SyncIcon sx={{ animation: loading && !nextCursor ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
              Track all system actions performed by users and trainers.
            </Typography>
          </Box>
        </Box>

        {/* Toolbar & Table Card */}
        <Card elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FilterListIcon sx={{ color: 'text.secondary' }} />
              <Select size="small" displayEmpty value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ width: 180, ...selectSx }}>
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="USER_MANAGEMENT">User Management</MenuItem>
                <MenuItem value="SESSION_TRAINING">Session & Training</MenuItem>
                <MenuItem value="QUESTION_BANK">Question Bank</MenuItem>
                <MenuItem value="KNOWLEDGE_BASE">Knowledge Base</MenuItem>
              </Select>

              <Select size="small" displayEmpty value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} sx={{ width: 220, ...selectSx }}>
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="USER_CREATED">User Created</MenuItem>
                <MenuItem value="USER_UPDATED">User Updated</MenuItem>
                <MenuItem value="USER_DELETED">User Deleted</MenuItem>
                <MenuItem value="SESSION_ASSIGNED">Session Assigned</MenuItem>
                <MenuItem value="BULK_SESSION_ASSIGNED">Bulk Assigned</MenuItem>
                <MenuItem value="AI_QUESTION_GENERATED">AI Generated</MenuItem>
                <MenuItem value="QUESTION_CREATED">Question Created</MenuItem>
                <MenuItem value="QUESTION_UPDATED">Question Updated</MenuItem>
                <MenuItem value="QUESTION_STATUS_TOGGLED">Question Status Toggled</MenuItem>
                <MenuItem value="TRAINER_DECISION_SUBMITTED">Decision Submitted</MenuItem>
              </Select>
              
              <Button 
                variant="outlined" 
                size="small" 
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', fontFamily: 'DM Sans, sans-serif', color: 'text.secondary', borderColor: 'rgba(0, 0, 0, 0.23)' }}
              >
                Columns
              </Button>
              <Menu
                anchorEl={columnMenuAnchor}
                open={Boolean(columnMenuAnchor)}
                onClose={() => setColumnMenuAnchor(null)}
                slotProps={{ paper: { sx: { minWidth: 200 } } }}
              >
                {COLUMNS.map(col => (
                  <MenuItem key={col.id} onClick={() => {
                    setVisibleCols(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id]);
                  }}>
                    <Checkbox checked={visibleCols.includes(col.id)} size="small" />
                    <ListItemText primary={col.label} primaryTypographyProps={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }} />
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>

          <TableContainer>
            {loading && !nextCursor ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell padding="checkbox" sx={{ width: 40 }} />
                    {COLUMNS.map(col => visibleCols.includes(col.id) && (
                      <TableCell key={col.id} align={col.align} sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', fontSize: 11, letterSpacing: '0.05em' }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                    <LogRow 
                      key={log.id} 
                      log={log} 
                      visibleCols={visibleCols} 
                      modules={modules} 
                      formatTarget={formatTarget} 
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={nextCursor ? -1 : logs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              fontFamily: 'DM Sans, sans-serif',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.875rem'
              }
            }}
          />
        </Card>
      </Box>
    </Layout>
  );
}