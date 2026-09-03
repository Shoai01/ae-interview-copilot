import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, Button, Select, MenuItem, CircularProgress, 
  IconButton, Tooltip, TablePagination, Menu, Checkbox, ListItemText, 
  Collapse, Avatar, TextField, InputAdornment, FormControl, InputLabel 
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
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import toast from 'react-hot-toast';

const AVATAR_PALETTE = [
  '#F26522', // AutomationEdge signature orange
  '#7C3AED', // violet
  '#059669', // emerald
  '#D97706', // amber
  '#E11D48', // rose
  '#0D9488', // teal
  '#131C2E', // midnight slate
  '#B45309', // bronze
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
        p: { xs: 2, sm: 2.5 }, 
        bgcolor: '#FFFFFF', 
        borderRadius: 2.5, 
        border: '1px solid #E2E8F0',
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
          borderBottom: '1px solid #E2E8F0',
          mb: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: 36, 
              height: 36, 
              borderRadius: 2, 
              bgcolor: 'rgba(242, 101, 34, 0.1)', 
              color: 'primary.main' 
            }}
          >
            <PeopleAltOutlinedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem', lineHeight: 1.2 }}>
              Assigned Trainees
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'DM Sans, sans-serif', color: '#64748B', fontSize: '0.75rem' }}>
              Batch enrollment recipient list
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
              borderRadius: 1 
            }} 
          />
          {successCount !== undefined && successCount !== '-' && (
            <Chip 
              label={`${successCount} Successful`} 
              size="small" 
              sx={{ 
                height: 22, 
                fontSize: '11px', 
                fontWeight: 700, 
                fontFamily: 'DM Sans, sans-serif',
                bgcolor: 'rgba(34, 197, 94, 0.1)', 
                color: '#16A34A', 
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 1 
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
                fontWeight: 700, 
                fontFamily: 'DM Sans, sans-serif',
                bgcolor: 'rgba(239, 68, 68, 0.1)', 
                color: '#DC2626', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 1 
              }} 
            />
          )}
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {trainees.length > 5 && (
            <TextField
              size="small"
              placeholder="Search trainees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
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
                width: { xs: 160, sm: 200 },
                '& .MuiOutlinedInput-root': {
                  height: 34,
                  fontSize: 12,
                  fontFamily: 'DM Sans, sans-serif',
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.5,
                  '& fieldset': { borderColor: '#E2E8F0' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
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
                height: 34,
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'none',
                fontWeight: 600,
                color: copied ? '#16A34A' : '#0F172A',
                borderColor: copied ? '#86EFAC' : '#E2E8F0',
                bgcolor: copied ? 'rgba(34, 197, 94, 0.08)' : '#FFFFFF',
                borderRadius: 1.5,
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
          <Typography variant="body2" sx={{ fontFamily: 'DM Sans, sans-serif', color: '#64748B', fontSize: 13 }}>
            No trainees match "{search}"
          </Typography>
          <Button size="small" onClick={() => setSearch('')} sx={{ mt: 1, textTransform: 'none', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
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
            gap: 1.25,
            '&::-webkit-scrollbar': { width: '5px' },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.12)', borderRadius: '4px' },
            '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(0,0,0,0.2)' }
          }}
        >
          {filtered.map((traineeName, idx) => (
            <Tooltip key={idx} title={traineeName} placement="top" arrow>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  p: '6px 12px',
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
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
                    color: '#FFFFFF',
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
                    color: '#0F172A',
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
                    color: '#94A3B8',
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
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
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontFamily: 'DM Sans, sans-serif', color: '#64748B', fontSize: 11 }}>
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
  let statusColor = '#16A34A';
  let statusBg = 'rgba(34, 197, 94, 0.1)';
  let statusBorder = 'rgba(34, 197, 94, 0.2)';
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
        statusColor = d.new_status ? '#16A34A' : '#64748B';
        statusBg = d.new_status ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)';
        statusBorder = d.new_status ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)';
      }
      
      if (d.success_count !== undefined) sCount = d.success_count;
      if (d.failed_count !== undefined) fCount = d.failed_count;
      
      if (d.assigned_trainees && Array.isArray(d.assigned_trainees)) {
        assignedTrainees = d.assigned_trainees;
      }

      if (fCount !== '-' && fCount > 0) {
        if (sCount > 0) {
          statusLabel = 'Partial';
          statusColor = '#D97706';
          statusBg = 'rgba(245, 158, 11, 0.1)';
          statusBorder = 'rgba(245, 158, 11, 0.2)';
        } else {
          statusLabel = 'Failed';
          statusColor = '#DC2626';
          statusBg = 'rgba(239, 68, 68, 0.1)';
          statusBorder = 'rgba(239, 68, 68, 0.2)';
        }
      }
    } catch(e){}
  }
  
  if (!modId && log.target) {
    const mMatch = log.target.match(/Module:\s*(\d+)/);
    if (mMatch) modId = parseInt(mMatch[1]);
  }
  const modName = modId ? (modules.find(m => m.id === modId)?.name || 'Module ' + modId) : '-';

  const isExpandable = log.action_type === 'BULK_SESSION_ASSIGNED' && assignedTrainees.length > 0;

  // Action badge palette
  const getActionBadgeProps = (type = '') => {
    if (type.includes('USER')) {
      return { bgcolor: 'rgba(5, 150, 105, 0.08)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.25)' };
    }
    if (type.includes('SESSION')) {
      return { bgcolor: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED', border: '1px solid rgba(124, 58, 237, 0.25)' };
    }
    if (type.includes('QUESTION')) {
      return { bgcolor: 'rgba(242, 101, 34, 0.08)', color: '#F26522', border: '1px solid rgba(242, 101, 34, 0.25)' };
    }
    if (type.includes('DOCUMENT')) {
      return { bgcolor: 'rgba(217, 119, 6, 0.08)', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.25)' };
    }
    return { bgcolor: 'rgba(100, 116, 139, 0.08)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.2)' };
  };

  const actionStyle = getActionBadgeProps(log.action_type);

  return (
    <React.Fragment>
      <TableRow 
        hover 
        sx={{ 
          bgcolor: open ? 'rgba(242, 101, 34, 0.02)' : 'inherit',
          '& > *': { borderBottom: isExpandable && open ? 'none' : '1px solid #F1F5F9' },
          '&:hover': { bgcolor: '#F8FAFC' }
        }}
      >
        <TableCell padding="checkbox" sx={{ width: 40, py: 2 }}>
          {isExpandable && (
            <Tooltip title={open ? "Hide trainees" : "View trainees"}>
              <IconButton 
                aria-label="expand row" 
                size="small" 
                onClick={() => setOpen(!open)}
                sx={{
                  color: open ? 'primary.main' : '#64748B',
                  bgcolor: open ? 'rgba(242, 101, 34, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                  '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.18)' }
                }}
              >
                {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
        {visibleCols.includes('date') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', color: '#64748B', py: 2 }}>
            {new Date(log.created_at).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </TableCell>
        )}
        {visibleCols.includes('actor') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: getAvatarBgColor(log.actor_name), color: '#FFFFFF' }}>
                {getInitials(log.actor_name)}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
                {log.actor_name || 'System Engine'}
              </Typography>
            </Box>
          </TableCell>
        )}
        {visibleCols.includes('action') && (
          <TableCell sx={{ py: 2 }}>
            <Chip 
              size="small" 
              label={log.action_type.replace(/_/g, ' ')} 
              sx={{ 
                fontFamily: 'DM Sans, sans-serif', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                bgcolor: actionStyle.bgcolor, 
                color: actionStyle.color, 
                border: actionStyle.border,
                borderRadius: 1 
              }} 
            />
          </TableCell>
        )}
        {visibleCols.includes('module') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#0F172A', py: 2 }}>
            {modName}
          </TableCell>
        )}
        {visibleCols.includes('target') && (
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', color: '#475569', py: 2 }}>
            {isExpandable ? (
              <Tooltip title={open ? "Click to collapse" : "Click to view assigned trainees"}>
                <Chip
                  icon={<PeopleAltOutlinedIcon sx={{ fontSize: '15px !important', color: open ? '#FFFFFF !important' : 'primary.main !important' }} />}
                  label={`${assignedTrainees.length} ${assignedTrainees.length === 1 ? 'Trainee' : 'Trainees'}`}
                  size="small"
                  onClick={() => setOpen(!open)}
                  sx={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    bgcolor: open ? 'primary.main' : 'rgba(242, 101, 34, 0.08)',
                    color: open ? '#FFFFFF' : 'primary.main',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'rgba(242, 101, 34, 0.25)',
                    borderRadius: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: open ? 'primary.dark' : 'rgba(242, 101, 34, 0.16)',
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
          <TableCell sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: decision !== '-' ? 700 : 400, color: decision === 'PASS' ? '#16A34A' : (decision === 'FAIL' ? '#DC2626' : '#64748B'), py: 2 }}>
            {decision}
          </TableCell>
        )}
        {visibleCols.includes('status') && (
          <TableCell sx={{ py: 2 }}>
            <Chip 
              size="small" 
              label={statusLabel} 
              sx={{ 
                fontFamily: 'DM Sans, sans-serif', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                bgcolor: statusBg, 
                color: statusColor, 
                border: `1px solid ${statusBorder}`,
                borderRadius: 1 
              }} 
            />
          </TableCell>
        )}
        {visibleCols.includes('success') && (
          <TableCell align="center" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: '#16A34A', py: 2 }}>
            {sCount}
          </TableCell>
        )}
        {visibleCols.includes('failed') && (
          <TableCell align="center" sx={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: fCount !== '-' && fCount > 0 ? '#DC2626' : '#94A3B8', py: 2 }}>
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

  // Raw single-page fetch, with no state side effects — shared by fetchLogs
  // (below) and handleChangePage's catch-up loop, which needs to request
  // several backend pages in sequence without each one racing ahead of
  // React state updates.
  const fetchLogsPage = (cursor = null) => {
    const params = {};
    if (cursor) params.cursor = cursor;
    if (categoryFilter) params.category = categoryFilter;
    if (actionFilter) params.action_type = actionFilter;
    return adminService.getAuditLogs(params);
  };

  const fetchLogs = async (cursor = null, isLoadMore = false) => {
    try {
      setLoading(true);
      if (!isLoadMore) {
        setLogs([]); // Immediately clear old logs when changing filters
      }
      const data = await fetchLogsPage(cursor);
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
    if (newPage > page && (newPage + 1) * rowsPerPage > logs.length && nextCursor) {
      // A single backend page can be smaller than rowsPerPage, so one
      // extra fetch isn't always enough to fill the requested page — keep
      // pulling pages (tracking accumulated rows locally, since React state
      // won't reflect each fetch until after this loop) until there's
      // enough to show, or the backend has nothing left to give.
      let accumulated = logs;
      let cursor = nextCursor;
      setLoading(true);
      try {
        while ((newPage + 1) * rowsPerPage > accumulated.length && cursor) {
          const data = await fetchLogsPage(cursor);
          accumulated = [...accumulated, ...data.items];
          cursor = data.next_cursor;
        }
      } catch (err) {
        console.error('Failed to fetch audit logs', err);
      } finally {
        setLoading(false);
      }
      setLogs(accumulated);
      setNextCursor(cursor);
    }
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatTarget = (log) => {
    if (!log.target) return '-';
    let formatted = log.target;
    
    // Strip out Module from Target since it has its own column
    formatted = formatted.replace(/Module:\s*\d+\s*/, '');
    formatted = formatted.replace(/Question:\s*\d+\s*/, 'Question ');
    formatted = formatted.replace(/Session:\s*\d+\s*/, 'Session ');
    formatted = formatted.trim();

    if (log.action_type === 'BULK_SESSION_ASSIGNED') {
      return 'Multiple Trainees';
    }

    return formatted || '-';
  };

  // KPI Calculations
  const totalEvents = logs.length;
  const sessionEvents = useMemo(() => logs.filter(l => l.action_type && l.action_type.includes('SESSION')).length, [logs]);
  const userEvents = useMemo(() => logs.filter(l => l.action_type && l.action_type.includes('USER')).length, [logs]);
  const questionEvents = useMemo(() => logs.filter(l => l.action_type && (l.action_type.includes('QUESTION') || l.action_type.includes('DOCUMENT'))).length, [logs]);

  return (
    <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Audit Logs' }]}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 }, width: '100%' }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em' }}>
                Activity & Audit Trail
              </Typography>
              <Tooltip title="Refresh audit logs" arrow>
                <IconButton 
                  onClick={() => fetchLogs()} 
                  size="small" 
                  disabled={loading} 
                  sx={{ 
                    color: 'primary.main', 
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    border: '1px solid rgba(242, 101, 34, 0.2)',
                    '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.16)' } 
                  }}
                >
                  <SyncIcon sx={{ fontSize: 18, animation: loading && !nextCursor ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', mt: 0.5 }}>
              Immutable system audit events tracking viva assignments, evaluator decisions, syllabus changes, and account activity.
            </Typography>
          </Box>
        </Box>

        {/* KPI Strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Events In Buffer
              </Typography>
              <Typography variant="h4" sx={{ color: '#0F172A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {nextCursor ? `${totalEvents}+` : totalEvents}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HistoryOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Session Events
              </Typography>
              <Typography variant="h4" sx={{ color: '#7C3AED', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {nextCursor ? `${sessionEvents}+` : sessionEvents}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AssignmentOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Security & Accounts
              </Typography>
              <Typography variant="h4" sx={{ color: '#059669', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {nextCursor ? `${userEvents}+` : userEvents}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SecurityOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Compliance Trail
              </Typography>
              <Typography variant="h6" sx={{ color: '#16A34A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                Active & Verified
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>
        </Box>

        {/* Toolbar & Table Card */}
        <Card elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', p: 2, gap: 2, borderBottom: '1px solid #E2E8F0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <FilterListIcon sx={{ color: '#94A3B8' }} />
              
              <Select 
                size="small" 
                displayEmpty 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)} 
                sx={{ 
                  width: { xs: '100%', sm: 190 }, 
                  bgcolor: '#F8FAFC', 
                  borderRadius: 2,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.875rem',
                  '& fieldset': { borderColor: '#E2E8F0' }
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="USER_MANAGEMENT">User Management</MenuItem>
                <MenuItem value="SESSION_TRAINING">Session & Training</MenuItem>
                <MenuItem value="QUESTION_BANK">Question Bank</MenuItem>
                <MenuItem value="KNOWLEDGE_BASE">Knowledge Base</MenuItem>
              </Select>

              <Select 
                size="small" 
                displayEmpty 
                value={actionFilter} 
                onChange={(e) => setActionFilter(e.target.value)} 
                sx={{ 
                  width: { xs: '100%', sm: 220 }, 
                  bgcolor: '#F8FAFC', 
                  borderRadius: 2,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.875rem',
                  '& fieldset': { borderColor: '#E2E8F0' }
                }}
              >
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
            </Box>

            <Box>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<ViewColumnOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                sx={{ 
                  textTransform: 'none', 
                  fontFamily: 'DM Sans, sans-serif', 
                  color: '#0F172A', 
                  borderColor: '#E2E8F0', 
                  borderRadius: 2,
                  fontWeight: 600,
                  py: 0.8,
                  px: 2,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(242, 101, 34, 0.04)' }
                }}
              >
                Toggle Columns
              </Button>
              <Menu
                anchorEl={columnMenuAnchor}
                open={Boolean(columnMenuAnchor)}
                onClose={() => setColumnMenuAnchor(null)}
                slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2.5, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0' } } }}
              >
                {COLUMNS.map(col => (
                  <MenuItem key={col.id} onClick={() => {
                    setVisibleCols(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id]);
                  }}>
                    <Checkbox checked={visibleCols.includes(col.id)} size="small" sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }} />
                    <ListItemText primary={col.label} primaryTypographyProps={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500 }} />
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>

          <TableContainer>
            {loading && !nextCursor ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <Table aria-label="audit logs table">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', py: 1.75, borderBottom: '1px solid #E2E8F0' } }}>
                    <TableCell padding="checkbox" sx={{ width: 40 }} />
                    {COLUMNS.map(col => visibleCols.includes(col.id) && (
                      <TableCell key={col.id} align={col.align}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleCols.length + 1} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                        <Typography sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                          No audit events recorded for the selected filter.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                      <LogRow 
                        key={log.id} 
                        log={log} 
                        visibleCols={visibleCols} 
                        modules={modules} 
                        formatTarget={formatTarget} 
                      />
                    ))
                  )}
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
              borderTop: '1px solid #E2E8F0',
              fontFamily: 'DM Sans, sans-serif',
              bgcolor: '#FFFFFF',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem',
                color: '#64748B',
              }
            }}
          />
        </Card>
      </Box>
    </Layout>
  );
}