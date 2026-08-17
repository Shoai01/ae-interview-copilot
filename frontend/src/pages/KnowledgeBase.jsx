import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Layout from '../components/Layout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SyncIcon from '@mui/icons-material/Sync';
import toast from 'react-hot-toast';
import { adminService } from '../services/api';

export default function KnowledgeBase() {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
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
    }
  }, [activeModuleId]);

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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, height: { md: 'calc(100vh - 120px)' } }}>
        
        {/* Left Sidebar: Modules */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', pl: 1 }}>Training Modules</Typography>
          {modules.map(mod => (
            <Paper 
              key={mod.id} 
              elevation={0}
              onClick={() => setActiveModuleId(mod.id)}
              sx={{ 
                p: 2, 
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid',
                borderColor: activeModuleId === mod.id ? 'primary.main' : 'rgba(0,0,0,0.06)',
                bgcolor: activeModuleId === mod.id ? 'rgba(242, 101, 34, 0.04)' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: activeModuleId === mod.id ? 'primary.main' : 'text.primary' }}>
                {mod.name}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Right Content: Documents */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
                Knowledge Base
              </Typography>
              <IconButton onClick={() => { fetchModules(); if (activeModuleId) fetchDocuments(activeModuleId); }} size="small" disabled={loading} sx={{ color: 'primary.main', '&:hover': { bgcolor: 'rgba(242,101,34,0.1)' } }}>
                <SyncIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              </IconButton>
            </Box>
            
            <input 
              type="file" 
              accept=".pdf" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !activeModuleId}
              sx={{ boxShadow: '0 4px 14px rgba(242, 101, 34, 0.4)', borderRadius: 2, px: 3, py: 1 }}
            >
              Upload PDF
            </Button>
          </Box>

          <Paper elevation={0} sx={{ flexGrow: 1, borderRadius: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>File Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' }}>Uploaded At</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)', width: 100, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ py: 8, textAlign: 'center' }}>
                        <DescriptionIcon sx={{ fontSize: 48, color: 'rgba(0,0,0,0.1)', mb: 2 }} />
                        <Typography color="text.secondary">No documents uploaded for this module.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {documents.map(doc => (
                    <TableRow key={doc.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(0,154,222,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                            <DescriptionIcon fontSize="small" />
                          </Box>
                          <Typography variant="body2" fontWeight={500}>{doc.filename}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(doc.uploaded_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <IconButton onClick={() => handleView(doc.id)} size="small" sx={{ color: 'primary.main', '&:hover': { bgcolor: 'rgba(0,154,222,0.1)' } }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(doc.id)} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(220,38,38,0.1)' } }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

        </Box>
      </Box>

      {/* Document View Dialog */}
      <Dialog 
        open={Boolean(viewingDoc)} 
        onClose={() => setViewingDoc(null)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
          {viewingDoc?.filename}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.03)', p: 2, borderRadius: 2 }}>
            {viewingDoc?.extracted_text || 'No content found.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setViewingDoc(null)} variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
