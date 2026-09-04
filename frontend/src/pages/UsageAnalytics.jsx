import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip, CircularProgress, LinearProgress, ToggleButtonGroup, ToggleButton, keyframes
} from '@mui/material';
import Layout from '@/components/Layout';
import MiniCalendarPicker from '@/components/MiniCalendarPicker';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, Cell, LabelList
} from 'recharts';
import BoltIcon from '@mui/icons-material/Bolt';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import InsightsIcon from '@mui/icons-material/Insights';
import { adminService } from '@/services/api';
import { formatCompact, formatFull, formatDayLabel } from '@/utils/format';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const CHART_COLORS = ["#F26522", "#0EA5E9", "#10B981", "#6366F1", "#F59E0B", "#64748B"];

const CALL_SITE_LABELS = {
  EVALUATOR: 'Session Evaluation',
  QUESTION_GEN: 'Question Generation',
  IDEAL_ANSWER: 'Ideal Answer (RAG)',
  EMBEDDING: 'Knowledge Base Embeddings',
};

const cardSx = {
  borderRadius: 2.5,
  border: '1px solid #E2E8F0',
  bgcolor: '#FFFFFF',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
};

const tooltipContentStyle = {
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  fontSize: 13,
  padding: '8px 14px',
  backgroundColor: '#FFFFFF',
};

const toggleGroupSx = {
  bgcolor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 2,
  '& .MuiToggleButton-root': {
    border: 'none',
    px: 1.5,
    py: 0.5,
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'none',
    '&.Mui-selected': { bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522' },
    '&.Mui-selected:hover': { bgcolor: 'rgba(242, 101, 34, 0.15)' },
  },
};

function getRangeParams(preset, customFrom, customTo) {
  if (preset === 'ALL') return {};
  if (preset === 'CUSTOM') {
    if (!customFrom || !customTo) return null;
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    return { date_from: from.toISOString(), date_to: to.toISOString() };
  }
  const days = { '7D': 7, '30D': 30, '90D': 90 }[preset] || 30;
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

function SortIndicator({ field, sortField, sortDir }) {
  if (sortField !== field) return null;
  const Icon = sortDir === 'desc' ? ArrowDownwardIcon : ArrowUpwardIcon;
  return <Icon sx={{ fontSize: 13, ml: 0.4, verticalAlign: 'middle' }} />;
}

function EmptyChartState({ label, sublabel }) {
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
        <InsightsIcon sx={{ color: '#94A3B8', fontSize: 24 }} />
      </Box>
      <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>{label}</Typography>
      {sublabel && (
        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{sublabel}</Typography>
      )}
    </Box>
  );
}

export default function UsageAnalytics() {
  const [rangePreset, setRangePreset] = useState('30D');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [trendMetric, setTrendMetric] = useState('tokens');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sortField, setSortField] = useState('total_tokens');
  const [sortDir, setSortDir] = useState('desc');
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);

  useEffect(() => {
    const params = getRangeParams(rangePreset, customFrom, customTo);
    if (params === null) return; // custom range not fully selected yet

    let isCancelled = false;
    setLoading(true);
    adminService.getLLMUsageSummary(params)
      .then((data) => { if (!isCancelled) setSummary(data); })
      .catch((err) => console.error('Failed to load usage summary:', err))
      .finally(() => { if (!isCancelled) setLoading(false); });
    return () => { isCancelled = true; };
  }, [rangePreset, customFrom, customTo]);

  const usage = summary || {
    total_calls: 0, total_input_tokens: 0, total_output_tokens: 0, total_tokens: 0,
    avg_latency_ms: 0, error_count: 0, by_call_site: [], by_model: [], daily: [],
    by_user: [], by_user_total_users: 0,
  };

  const byCallSiteData = useMemo(() => {
    return usage.by_call_site.map((item) => ({
      ...item,
      label: CALL_SITE_LABELS[item.call_site] || item.call_site,
      total: item.input_tokens + item.output_tokens,
    }));
  }, [usage.by_call_site]);

  const totalCallSiteTokens = byCallSiteData.reduce((sum, item) => sum + item.total, 0);

  const sortedUsers = useMemo(() => {
    const arr = [...usage.by_user];
    arr.sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [usage.by_user, sortField, sortDir]);

  const maxUserTotal = Math.max(1, ...usage.by_user.map((u) => u.total_tokens));

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setUserPage(0);
  };

  const paginatedUsers = sortedUsers.slice(userPage * userRowsPerPage, userPage * userRowsPerPage + userRowsPerPage);

  if (loading && !summary) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      </Layout>
    );
  }

  const kpiCards = [
    { label: 'Total Calls', value: formatCompact(usage.total_calls), icon: <BoltIcon sx={{ fontSize: 20 }} />, lightBg: 'rgba(15, 23, 42, 0.05)', color: '#0F172A' },
    { label: 'Total Tokens', value: formatCompact(usage.total_tokens), icon: <DataUsageIcon sx={{ fontSize: 20 }} />, lightBg: 'rgba(242, 101, 34, 0.08)', color: '#F26522' },
    { label: 'Input Tokens', value: formatCompact(usage.total_input_tokens), icon: <ArrowDownwardIcon sx={{ fontSize: 20 }} />, lightBg: 'rgba(14, 165, 233, 0.08)', color: '#0284C7' },
    { label: 'Output Tokens', value: formatCompact(usage.total_output_tokens), icon: <ArrowUpwardIcon sx={{ fontSize: 20 }} />, lightBg: 'rgba(16, 185, 129, 0.08)', color: '#059669' },
  ];

  const headerCellSx = { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', py: 1.75, borderBottom: '1px solid #E2E8F0' };

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', animation: `${fadeInUp} 0.35s ease-out` }}>

        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, pb: 0.5 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', fontSize: { xs: '1.4rem', md: '1.75rem' } }}>
              Usage Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontSize: '0.875rem' }}>
              LLM token consumption across the platform
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {loading && summary && (
              <CircularProgress size={16} thickness={5} sx={{ color: 'primary.main' }} aria-label="Refreshing usage data" />
            )}
            <ToggleButtonGroup
              value={rangePreset}
              exclusive
              size="small"
              onChange={(e, val) => { if (val) setRangePreset(val); }}
              sx={toggleGroupSx}
            >
              <ToggleButton value="7D">7D</ToggleButton>
              <ToggleButton value="30D">30D</ToggleButton>
              <ToggleButton value="90D">90D</ToggleButton>
              <ToggleButton value="ALL">All</ToggleButton>
              <ToggleButton value="CUSTOM">Custom</ToggleButton>
            </ToggleButtonGroup>
            {rangePreset === 'CUSTOM' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MiniCalendarPicker label="From" value={customFrom} onChange={setCustomFrom} maxDate={customTo || undefined} />
                <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>to</Typography>
                <MiniCalendarPicker label="To" value={customTo} onChange={setCustomTo} minDate={customFrom || undefined} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Animated Usage Content (replays entry animation on date filter change) */}
        <Box
          key={`${rangePreset}-${customFrom}-${customTo}`}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            animation: `${fadeInUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1)`
          }}
        >
          {/* KPI Strip */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {kpiCards.map((kpi, index) => (
            <Paper key={kpi.label} elevation={0} sx={{
              ...cardSx, p: 2.25, position: 'relative', overflow: 'hidden', transition: 'all 0.2s ease',
              animation: `${fadeInUp} 0.4s ease-out ${index * 0.04}s both`,
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)', borderColor: '#CBD5E1' },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {kpi.label}
                </Typography>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, background: kpi.lightBg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {kpi.icon}
                </Box>
              </Box>
              <Typography sx={{ fontSize: '1.65rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                {kpi.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* 50/50 Split Row: Trend Over Time & Breakdown by Feature */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3, alignItems: 'stretch' }}>

          {/* Left: Trend Over Time */}
          <Paper elevation={0} sx={{ ...cardSx, p: 3, display: 'flex', flexDirection: 'column', height: '100%', animation: `${fadeInUp} 0.4s ease-out 0.1s both` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>Trend Over Time</Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                  Daily token consumption for the selected range
                </Typography>
              </Box>
              <ToggleButtonGroup value={trendMetric} exclusive size="small" onChange={(e, val) => { if (val) setTrendMetric(val); }} sx={toggleGroupSx}>
                <ToggleButton value="tokens">Tokens</ToggleButton>
                <ToggleButton value="calls">Calls</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {usage.daily.length === 0 ? (
                <EmptyChartState label="No usage data for this range" sublabel="Try widening the date range or All" />
              ) : (
                <ResponsiveContainer width="100%" height={290}>
                  <AreaChart data={usage.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F26522" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#F26522" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDayLabel} interval="preserveStartEnd" minTickGap={28}
                      tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                    <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={42} />
                    <RechartsTooltip
                      labelFormatter={(label) => formatDayLabel(label)}
                      formatter={(value, name) => [formatFull(value), name === 'input_tokens' ? 'Input Tokens' : name === 'output_tokens' ? 'Output Tokens' : 'Calls']}
                      contentStyle={tooltipContentStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                    {trendMetric === 'tokens' ? (
                      <>
                        <Area type="monotone" dataKey="input_tokens" name="Input Tokens" stackId="1" stroke="#F26522" fill="url(#inputGradient)" strokeWidth={2} />
                        <Area type="monotone" dataKey="output_tokens" name="Output Tokens" stackId="1" stroke="#0EA5E9" fill="url(#outputGradient)" strokeWidth={2} />
                      </>
                    ) : (
                      <Area type="monotone" dataKey="calls" name="Calls" stroke="#F26522" fill="url(#inputGradient)" strokeWidth={2} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>

          {/* Right: Breakdown by Feature */}
          <Paper elevation={0} sx={{ ...cardSx, p: 3, display: 'flex', flexDirection: 'column', height: '100%', animation: `${fadeInUp} 0.4s ease-out 0.15s both` }}>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>Breakdown by Feature</Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                Which part of the platform is consuming tokens
              </Typography>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {byCallSiteData.length === 0 ? (
                <EmptyChartState label="No usage data for this range" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byCallSiteData} layout="vertical" margin={{ top: 8, right: 48, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        formatter={(value) => [
                          `${formatFull(value)} tokens${totalCallSiteTokens > 0 ? ` (${((value / totalCallSiteTokens) * 100).toFixed(1)}%)` : ''}`,
                          'Tokens'
                        ]}
                        contentStyle={tooltipContentStyle}
                      />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={22}>
                        {byCallSiteData.map((entry, index) => (
                          <Cell key={entry.call_site} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                        <LabelList dataKey="total" position="right" formatter={formatCompact} style={{ fill: '#0F172A', fontSize: 11, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2, pt: 2, borderTop: '1px solid #F1F5F9' }}>
                    {byCallSiteData.map((item, index) => (
                      <Box key={item.call_site} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CHART_COLORS[index % CHART_COLORS.length], flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.75rem' }}>
                          {item.label}: <b style={{ color: '#0F172A' }}>{totalCallSiteTokens > 0 ? ((item.total / totalCallSiteTokens) * 100).toFixed(1) : '0'}%</b>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Consumption by User */}
        <Paper elevation={0} sx={{ ...cardSx, animation: `${fadeInUp} 0.4s ease-out 0.2s both` }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>Consumption by User</Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                Who is triggering LLM calls, ranked by total tokens
              </Typography>
            </Box>
            {usage.by_user_total_users > usage.by_user.length && (
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Showing top {usage.by_user.length} of {usage.by_user_total_users} users
              </Typography>
            )}
          </Box>

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table aria-label="usage by user table">
              <TableHead>
                <TableRow sx={{ '& th': headerCellSx }}>
                  <TableCell sx={{ width: 56 }}>#</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell align="right" onClick={() => handleSort('calls')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                    Calls<SortIndicator field="calls" sortField={sortField} sortDir={sortDir} />
                  </TableCell>
                  <TableCell align="right" onClick={() => handleSort('input_tokens')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                    Input<SortIndicator field="input_tokens" sortField={sortField} sortDir={sortDir} />
                  </TableCell>
                  <TableCell align="right" onClick={() => handleSort('output_tokens')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                    Output<SortIndicator field="output_tokens" sortField={sortField} sortDir={sortDir} />
                  </TableCell>
                  <TableCell align="right" onClick={() => handleSort('total_tokens')} sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 200 }}>
                    Total Tokens<SortIndicator field="total_tokens" sortField={sortField} sortDir={sortDir} />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, borderBottom: 'none' }}>
                      <Typography sx={{ color: '#64748B' }}>No usage recorded for any user in this range.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((u, idx) => {
                    const isSystem = u.user_id === null || u.user_id === undefined;
                    const displayName = isSystem ? 'System' : (u.full_name || u.username || 'Unknown user');
                    const pct = maxUserTotal > 0 ? (u.total_tokens / maxUserTotal) * 100 : 0;
                    return (
                      <TableRow key={u.user_id ?? 'system'} hover>
                        <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>
                          {userPage * userRowsPerPage + idx + 1}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{displayName}</Typography>
                              {!isSystem && u.username && (
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>@{u.username}</Typography>
                              )}
                            </Box>
                            {!isSystem && u.role && (
                              <Chip size="small" label={u.role} sx={{
                                height: 18, fontSize: '0.65rem', fontWeight: 700,
                                bgcolor: u.role === 'ADMIN' ? 'rgba(242, 101, 34, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                color: u.role === 'ADMIN' ? '#F26522' : '#0284C7',
                              }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{formatFull(u.calls)}</TableCell>
                        <TableCell align="right">{formatCompact(u.input_tokens)}</TableCell>
                        <TableCell align="right">{formatCompact(u.output_tokens)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress variant="determinate" value={pct} sx={{
                                height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
                                '& .MuiLinearProgress-bar': { bgcolor: '#F26522', borderRadius: 3 },
                              }} />
                            </Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', minWidth: 56, textAlign: 'right' }}>
                              {formatCompact(u.total_tokens)}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={sortedUsers.length}
            rowsPerPage={userRowsPerPage}
            page={userPage}
            onPageChange={(e, newPage) => setUserPage(newPage)}
            onRowsPerPageChange={(e) => { setUserRowsPerPage(parseInt(e.target.value, 10)); setUserPage(0); }}
          />
        </Paper>

        </Box>
      </Box>
    </Layout>
  );
}
