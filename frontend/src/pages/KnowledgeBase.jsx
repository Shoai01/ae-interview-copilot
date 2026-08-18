import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Layout from '@/components/Layout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SyncIcon from '@mui/icons-material/Sync';
import MenuBookIcon from '@mui/icons-material/MenuBook';
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
      toast.success('Document uploaded successfully!');
      fetchDocuments(activeModuleId);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document? The AI index will be rebuilt without it.")) return;
    
    try {
      await adminService.deleteKnowledgeDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted successfully.');
    } catch (err) {
      console.error("Failed to delete document:", err);
      toast.error('Failed to delete document.');
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

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 'calc(100vh - 120px)', bgcolor: '#f8f9ff', p: { xs: 2, md: 4 } }}>
        
        {/* Header & Actions */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#0d1c2e', mb: 1 }}>
              Knowledge Base
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'DM Sans, sans-serif', color: '#535f74' }}>
              Upload and manage reference materials for AI context.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 } }}>
            <IconButton onClick={() => { fetchModules(); if (activeModuleId) fetchDocuments(activeModuleId); }} size="medium" disabled={loading} sx={{ color: 'primary.main', bgcolor: 'rgba(242,101,34,0.1)', '&:hover': { bgcolor: 'rgba(242,101,34,0.2)' } }}>
              <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
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
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
              sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600, bgcolor: '#f26522', color: '#fff', fontFamily: 'DM Sans, sans-serif', '&:hover': { bgcolor: '#d9581b' }, boxShadow: 'none' }} 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !activeModuleId}
            >
              Upload PDF
            </Button>
          </Box>
        </Box>

        {/* Filters & Search - Matching AdminQuestionBank layout */}
        <Paper elevation={0} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid rgba(225,191,179,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Module Tabs */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(225,191,179,0.5)', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
            {modules.map(mod => (
              <Button
                key={mod.id} 
                onClick={() => setActiveModuleId(mod.id)}
                sx={{ 
                  px: 4, py: 2, 
                  minWidth: 'auto',
                  borderRadius: 0,
                  borderBottom: activeModuleId === mod.id ? '2px solid #f26522' : '2px solid transparent',
                  color: activeModuleId === mod.id ? '#f26522' : '#535f74',
                  fontWeight: activeModuleId === mod.id ? 700 : 500,
                  fontFamily: 'Syne, sans-serif',
                  textTransform: 'none',
                  fontSize: 15,
                  '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.04)' }
                }}
              >
                {mod.name}
              </Button>
            ))}
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafbfd' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>File Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2 }}>Uploaded At</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#535f74', borderBottom: '1px solid rgba(225,191,179,0.5)', py: 2, width: 150, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 10, textAlign: 'center', borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <MenuBookIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 1 }} />
                        <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>No Documents Uploaded</Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>Upload PDF files to provide context for AI assessments.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {documents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(doc => (
                  <TableRow key={doc.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)', py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,154,222,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#009ADE' }}>
                          <DescriptionIcon fontSize="small" />
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="#0d1c2e" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                          {doc.filename}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {new Date(doc.uploaded_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: '1px solid rgba(225,191,179,0.3)', py: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <IconButton onClick={() => handleView(doc.id)} size="small" sx={{ color: '#009ADE', bgcolor: 'rgba(0,154,222,0.1)', '&:hover': { bgcolor: 'rgba(0,154,222,0.2)' } }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(doc.id)} size="small" sx={{ color: '#f26522', bgcolor: 'rgba(242,101,34,0.1)', '&:hover': { bgcolor: 'rgba(242,101,34,0.2)' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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
            sx={{ borderTop: '1px solid rgba(225,191,179,0.5)', bgcolor: '#fafbfd' }}
          />
        </Paper>

      </Box>

      {/* Document View Dialog */}
      <Dialog 
        open={Boolean(viewingDoc)} 
        onClose={() => setViewingDoc(null)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8f9ff', color: '#0d1c2e' }}>
          {viewingDoc?.filename}
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', bgcolor: '#f8f9ff', p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', mt: 2, color: '#334155' }}>
            {viewingDoc?.extracted_text || 'No content found.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, bgcolor: '#ffffff' }}>
          <Button onClick={() => setViewingDoc(null)} variant="outlined" sx={{ borderRadius: 2, fontWeight: 600, color: '#535f74', borderColor: '#cbd5e1' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
