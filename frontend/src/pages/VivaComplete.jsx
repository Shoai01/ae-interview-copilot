import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function VivaComplete() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      
      <Card sx={{ width: '100%', maxWidth: 640, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 5, md: 8 }, '&:last-child': { pb: { xs: 5, md: 8 } } }}>
          
          {/* Icon Area */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
            <Box sx={{ width: 104, height: 104, borderRadius: '50%', bgcolor: 'secondary.container', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            </Box>
          </Box>
          
          {/* Headlines */}
          <Typography variant="h2" sx={{ color: 'text.primary', mb: 2 }}>
            Your viva has been<br />submitted.
          </Typography>
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 400, fontFamily: 'DM Sans, sans-serif' }}>
            Your trainer will review the results.
          </Typography>

          {/* Divider */}
          <Divider sx={{ width: '85%', mx: 'auto', my: 5 }} />

          {/* Stats Row */}
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: { xs: 6, md: 12 }, width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                Duration
              </Typography>
              <Typography variant="h3" sx={{ color: 'text.primary', textAlign: 'center' }}>
                18m 24s
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                Questions
              </Typography>
              <Typography variant="h3" sx={{ color: 'text.primary', textAlign: 'center' }}>
                10/10
              </Typography>
            </Box>
          </Box>
          
        </CardContent>
      </Card>
      
    </Box>
  );
}
