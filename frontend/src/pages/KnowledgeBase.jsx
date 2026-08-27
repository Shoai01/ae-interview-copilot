import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, Tooltip } from '@mui/material';
import Layout from '@/components/Layout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SyncIcon from '@mui/icons-material/Sync';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import toast from 'react-hot-toast';
import { adminService } from '@/services/api';

export default function KnowledgeBase() {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, docId: null });
  const fileInputRef = useRef(null);

  const fetchModules = async () => {
    try {
      const data = await adminService.getModules();
      setModules(data);
      if (data.length > 0) setActiveModuleId(data[0].id);
    } catch (err) {
      console.error("Failed to load modules:", err);
    }
  };

  const fetchDocuments = async (moduleId) => {
    setLoading(true);
    try {
      const data = await adminService.getKnowledgeDocuments(moduleId);
      setDocuments(data);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (activeModuleId) {
      fetchDocuments(activeModuleId);
      setPage(0);
    }
  }, [activeModuleId]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !activeModuleId) return;
    
    setLoading(true);
    try {
      await adminService.uploadKnowledgeDocument(activeModuleId, file);
      toast.success('Document uploaded and vector-indexed successfully!');
      fetchDocuments(activeModuleId);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (docId) => {
    setDeleteDialog({ open: true, docId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.docId) return;
    try {
      await adminService.deleteKnowledgeDocument(deleteDialog.docId);
      setDocuments(prev => prev.filter(d => d.id !== deleteDialog.docId));
      toast.success('Document deleted successfully.');
    } catch (err) {
      console.error("Failed to delete document:", err);
      toast.error('Failed to delete document.');
    } finally {
      setDeleteDialog({ open: false, docId: null });
    }
  };

  const handleView = async (docId) => {
    try {
      const docDetail = await adminService.getKnowledgeDocumentDetail(docId);
      setViewingDoc(docDetail);
    } catch (err) {
      console.error("Failed to fetch document details:", err);
      toast.error('Failed to load document content.');
    }
  };

  const activeModule = modules.find(m => m.id === activeModuleId);
  const activeModuleName = activeModule ? activeModule.name : 'All Modules';

  return (
    <Layout breadcrumbs={[{ label: 'Dashboard', path: '/hr/dashboard' }, { label: 'Knowledge Base' }]}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 }, width: '100%' }}>
        
        {/* Header & Actions */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0F172A', letterSpacing: '-0.02em' }}>
                Knowledge Base
              </Typography>
              <Tooltip title="Refresh documents" arrow>
                <IconButton
                  aria-label="Refresh documents"
                  onClick={() => { fetchModules(); if (activeModuleId) fetchDocuments(activeModuleId); }}
                  size="small"
                  disabled={loading}
                  sx={{
                    color: 'primary.main',
                    bgcolor: 'rgba(242, 101, 34, 0.08)',
                    border: '1px solid rgba(242, 101, 34, 0.2)',
                    '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.16)' },
                  }}
                >
                  <SyncIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', mt: 0.5 }}>
              Upload and manage reference materials for AI context, RAG retrieval, and automatic viva question generation.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box 
              component="input"
              type="file" 
              accept=".pdf" 
              sx={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <Button 
              variant="contained" 
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon sx={{ fontSize: 18 }} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !activeModuleId}
              sx={{
                background: 'linear-gradient(90deg, #e8581a 0%, #F26522 50%, #ff8c42 100%)',
                color: '#FFFFFF !important',
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
                },
              }}
            >
              {loading ? 'Uploading...' : 'Upload PDF Document'}
            </Button>
          </Box>
        </Box>

        {/* KPI Strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Module Documents
              </Typography>
              <Typography variant="h4" sx={{ color: '#0F172A', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {documents.length}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(242, 101, 34, 0.1)', color: '#F26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MenuBookIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box sx={{ maxWidth: '70%' }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Active Module
              </Typography>
              <Typography variant="h6" sx={{ color: '#6366F1', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeModuleName}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderCopyOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                AI Vector Index
              </Typography>
              <Typography variant="h6" sx={{ color: documents.length > 0 ? '#16A34A' : '#D97706', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                {documents.length > 0 ? 'Vector Ready' : 'Awaiting Docs'}
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: documents.length > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: documents.length > 0 ? '#16A34A' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>

          <Card elevation={0} sx={{ p: 2.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'DM Sans, sans-serif' }}>
                Corpus Format
              </Typography>
              <Typography variant="h6" sx={{ color: '#0EA5E9', fontWeight: 700, fontFamily: 'Syne, sans-serif', mt: 0.5 }}>
                PDF Standard
              </Typography>
            </Box>
            <Box sx={{ width: 46, height: 46, borderRadius: 2, bgcolor: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PictureAsPdfOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Card>
        </Box>

        {/* Module Tabs & Documents Table Card */}
        <Card elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 2.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
          {/* Module Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid #E2E8F0', overflowX: 'auto', bgcolor: '#F8FAFC', px: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
            {modules.map(mod => {
              const isActive = activeModuleId === mod.id;
              return (
                <Button
                  key={mod.id} 
                  onClick={() => setActiveModuleId(mod.id)}
                  sx={{ 
                    px: 3,
                    py: 1.75, 
                    minWidth: 'auto',
                    borderRadius: 0,
                    borderBottom: isActive ? '2.5px solid #F26522' : '2.5px solid transparent',
                    color: isActive ? '#F26522' : '#64748B',
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'DM Sans, sans-serif',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    '&:hover': { color: '#F26522', bgcolor: 'rgba(242, 101, 34, 0.04)' }
                  }}
                >
                  {mod.name}
                </Button>
              );
            })}
          </Box>

          <TableContainer>
            <Table aria-label="knowledge base table">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', py: 1.75, borderBottom: '1px solid #E2E8F0' } }}>
                  <TableCell>Document File Name</TableCell>
                  <TableCell>Uploaded Date & Time</TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 10, textAlign: 'center', borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MenuBookIcon sx={{ fontSize: 32, color: '#94A3B8' }} />
                        </Box>
                        <Typography variant="h6" sx={{ color: '#0F172A', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                          No Documents Uploaded
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif', maxWidth: 400 }}>
                          Upload PDF documents to train the AI with syllabus context for candidate evaluations and viva generation.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {documents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(doc => (
                  <TableRow key={doc.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: '#F8FAFC' } }}>
                    <TableCell sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(242, 101, 34, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', flexShrink: 0 }}>
                          <DescriptionIcon fontSize="small" />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
                          {doc.filename}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                        {new Date(doc.uploaded_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: '1px solid #F1F5F9', py: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Preview Extracted Content" arrow>
                          <IconButton aria-label="preview content" onClick={() => handleView(doc.id)} size="small" sx={{ color: '#64748B', bgcolor: 'rgba(242, 101, 34, 0.08)', '&:hover': { color: '#F26522', bgcolor: 'rgba(242, 101, 34, 0.18)' } }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Document" arrow>
                          <IconButton aria-label="delete document" onClick={() => handleDeleteClick(doc.id)} size="small" sx={{ color: '#64748B', bgcolor: 'rgba(239, 68, 68, 0.08)', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239, 68, 68, 0.18)' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={documents.length}
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

      {/* Document View Dialog */}
      <Dialog 
        open={Boolean(viewingDoc)} 
        onClose={() => setViewingDoc(null)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          } 
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.25rem', borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#0F172A', pb: 2, pt: 2.5 }}>
          {viewingDoc?.filename}
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important', bgcolor: '#FFFFFF' }}>
          <Box sx={{ bgcolor: '#F8FAFC', p: 2.5, borderRadius: 2, border: '1px solid #E2E8F0', maxHeight: '60vh', overflowY: 'auto' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
              {viewingDoc?.extracted_text || 'No extracted text found in this document.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setViewingDoc(null)} sx={{ color: '#64748B', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, docId: null })} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', pb: 2, pt: 2.5, borderBottom: '1px solid #E2E8F0', bgcolor: '#FFFFFF', color: '#DC2626' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: '24px !important' }}>
          <Typography variant="body2" sx={{ color: '#475569', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
            Are you sure you want to delete this document? The AI index and vector database will be re-synchronized without it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setDeleteDialog({ open: false, docId: null })} sx={{ color: '#64748B', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: 2, px: 3, py: 0.9, textTransform: 'none', fontFamily: 'DM Sans, sans-serif' }}>
            Delete Document
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
